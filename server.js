// ============================================
// SERVER - Minimal Node.js server for file-based saves
// Run: node server.js
// ============================================

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
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    // Prevent path traversal — ensure resolved path is within __dirname
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(__dirname))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (!fs.existsSync(filePath)) {
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
    const data = fs.readFileSync(PROFILES_FILE, 'utf-8');
    return JSON.parse(data);
}

function saveProfiles(profiles) {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
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
            const body = JSON.parse(await readBody(req));
            const profiles = getProfiles();

            // Find existing by name (case-insensitive)
            const existingKey = Object.keys(profiles).find(
                k => profiles[k].name.toLowerCase() === body.name.toLowerCase()
            );

            if (existingKey) {
                profiles[existingKey].lastSeen = new Date().toISOString();
                profiles[existingKey].totalSessions++;
                saveProfiles(profiles);
                sendJSON(res, { id: existingKey, ...profiles[existingKey], isReturning: true });
            } else {
                const id = 'player_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
                const newPlayer = {
                    name: body.name,
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
            const body = JSON.parse(await readBody(req));
            const profiles = getProfiles();

            if (!profiles[id]) {
                sendJSON(res, { error: 'Player not found' }, 404);
                return;
            }

            profiles[id] = { ...profiles[id], ...body };
            saveProfiles(profiles);
            sendJSON(res, { id, ...profiles[id] });
            return;
        }

        // POST /api/saves/:playerId - save game
        if (route.startsWith('/api/saves/') && req.method === 'POST') {
            const playerId = route.split('/')[3];
            const body = JSON.parse(await readBody(req));
            const filePath = getSaveFilePath(playerId);
            fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
            sendJSON(res, { success: true, savedAt: new Date().toISOString() });
            return;
        }

        // GET /api/saves/:playerId - load game
        if (route.startsWith('/api/saves/') && req.method === 'GET') {
            const playerId = route.split('/')[3];
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
