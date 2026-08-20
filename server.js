// ============================================
// SERVER - Minimal Node.js server for file-based saves
// Run: node server.js
// ============================================
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const SAVES_DIR = path.join(DATA_DIR, 'saves');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR);
if (!fs.existsSync(PROFILES_FILE)) fs.writeFileSync(PROFILES_FILE, '{}');

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
    // Strip query params and hash
    const urlPath = req.url.split('?')[0].split('#')[0];
    let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath));
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    // Prevent path traversal — ensure resolved path is within __dirname
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(__dirname))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        const MAX_SIZE = 1024 * 1024; // 1MB limit
        req.on('data', chunk => {
            body += chunk;
            if (body.length > MAX_SIZE) {
                req.destroy();
                reject(new Error('Request body too large'));
            }
        });
        req.on('end', () => resolve(body));
        req.on('error', (err) => reject(err));
    });
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// --- API Handlers ---

function getProfiles() {
    try {
        const data = fs.readFileSync(PROFILES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading profiles:', err.message);
        return {};
    }
}

function saveProfiles(profiles) {
    const tempFile = PROFILES_FILE + '.tmp';
    try {
        fs.writeFileSync(tempFile, JSON.stringify(profiles, null, 2));
        fs.renameSync(tempFile, PROFILES_FILE);
    } catch (err) {
        console.error('Error saving profiles:', err.message);
        // Clean up temp file if it exists
        try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
        throw err;
    }
}

function getSaveFilePath(playerId) {
    // Sanitize playerId to prevent path traversal
    const safe = playerId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(SAVES_DIR, `${safe}.json`);
}

async function handleAPI(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const route = url.pathname;

    try {
        // GET /api/profiles - list all profiles
        if (route === '/api/profiles' && req.method === 'GET') {
            const profiles = getProfiles();
            sendJSON(res, profiles);
            return;
        }

        // POST /api/profiles - create or get player
        if (route === '/api/profiles' && req.method === 'POST') {
            const rawBody = await readBody(req);
            let body;
            try {
                body = JSON.parse(rawBody);
            } catch {
                sendJSON(res, { error: 'Invalid JSON' }, 400);
                return;
            }
            if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
                sendJSON(res, { error: 'Name is required' }, 400);
                return;
            }
            const profiles = getProfiles();

            // Find existing by name (case-insensitive)
            const existingKey = Object.keys(profiles).find(
                k => profiles[k].name.toLowerCase() === body.name.trim().toLowerCase()
            );

            if (existingKey) {
                profiles[existingKey].lastSeen = new Date().toISOString();
                profiles[existingKey].totalSessions = (profiles[existingKey].totalSessions || 0) + 1;
                saveProfiles(profiles);
                sendJSON(res, { id: existingKey, ...profiles[existingKey], isReturning: true });
            } else {
                const id = 'player_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
                const newPlayer = {
                    name: body.name.trim(),
                    createdAt: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    totalSessions: 1,
                    totalGamesPlayed: 0,
                    totalWins: 0,
                    totalLosses: 0,
                    bestScore: 0,
                    achievements: [],
                    history: [],
                };
                profiles[id] = newPlayer;
                saveProfiles(profiles);
                sendJSON(res, { id, ...newPlayer, isReturning: false }, 201);
            }
            return;
        }

        // PUT /api/profiles/:id - update profile (game result)
        if (route.startsWith('/api/profiles/') && req.method === 'PUT') {
            const id = route.split('/')[3];
            if (!id) {
                sendJSON(res, { error: 'Missing profile ID' }, 400);
                return;
            }
            const rawBody = await readBody(req);
            let body;
            try {
                body = JSON.parse(rawBody);
            } catch {
                sendJSON(res, { error: 'Invalid JSON' }, 400);
                return;
            }
            const profiles = getProfiles();

            if (!profiles[id]) {
                sendJSON(res, { error: 'Player not found' }, 404);
                return;
            }

            // Only allow updating known profile fields to prevent data corruption
            const allowedFields = [
                'name', 'lastSeen', 'totalSessions', 'totalGamesPlayed',
                'totalWins', 'totalLosses', 'bestScore', 'achievements', 'history'
            ];
            const sanitized = {};
            for (const key of allowedFields) {
                if (body[key] !== undefined) {
                    sanitized[key] = body[key];
                }
            }

            profiles[id] = { ...profiles[id], ...sanitized };
            saveProfiles(profiles);
            sendJSON(res, { id, ...profiles[id] });
            return;
        }

        // POST /api/saves/:playerId - save game
        if (route.startsWith('/api/saves/') && req.method === 'POST') {
            const playerId = route.split('/')[3];
            if (!playerId) {
                sendJSON(res, { error: 'Missing player ID' }, 400);
                return;
            }
            const rawBody = await readBody(req);
            let body;
            try {
                body = JSON.parse(rawBody);
            } catch {
                sendJSON(res, { error: 'Invalid JSON' }, 400);
                return;
            }
            const filePath = getSaveFilePath(playerId);
            fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
            sendJSON(res, { success: true, savedAt: new Date().toISOString() });
            return;
        }

        // GET /api/saves/:playerId - load game
        if (route.startsWith('/api/saves/') && req.method === 'GET') {
            const playerId = route.split('/')[3];
            if (!playerId) {
                sendJSON(res, null);
                return;
            }
            const filePath = getSaveFilePath(playerId);
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                sendJSON(res, data);
            } else {
                sendJSON(res, null);
            }
            return;
        }

        // DELETE /api/saves/:playerId - delete save
        if (route.startsWith('/api/saves/') && req.method === 'DELETE') {
            const playerId = route.split('/')[3];
            if (!playerId) {
                sendJSON(res, { error: 'Missing player ID' }, 400);
                return;
            }
            const filePath = getSaveFilePath(playerId);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            sendJSON(res, { success: true });
            return;
        }

        sendJSON(res, { error: 'Not found' }, 404);
    } catch (err) {
        console.error('API Error:', err.message);
        sendJSON(res, { error: 'Internal server error' }, 500);
    }
}

// --- HTTP Server ---
const server = http.createServer(async (req, res) => {
    // Add CORS headers for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url.startsWith('/api/')) {
        await handleAPI(req, res);
    } else {
        serveStatic(req, res);
    }
});

server.listen(PORT, () => {
    console.log(`\n  ⚔️  CivAI Game Server running at http://localhost:${PORT}\n`);
    console.log(`  Open your browser and go to: http://localhost:${PORT}`);
    console.log(`  Player data saved in: ${DATA_DIR}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n  Shutting down server...');
    server.close(() => {
        console.log('  Server closed.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
});
