// ============================================
// SAVE SYSTEM - Player profiles and game persistence
// Uses JSON files via server API (portable, git-friendly)
// ============================================

class SaveSystem {
    constructor() {
        this.API_BASE = '/api';
        this.currentPlayer = null;
    }

    // --- Player Profile Management ---

    async login(name) {
        try {
            const res = await fetch(`${this.API_BASE}/profiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error(`Login failed: ${res.status}`);
            const player = await res.json();
            this.currentPlayer = player;
            return player;
        } catch (err) {
            console.error('Login error:', err);
            throw err;
        }
    }

    async updateProfile(playerId, data) {
        try {
            const res = await fetch(`${this.API_BASE}/profiles/${playerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(`Update failed: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('Profile update error:', err);
            return null;
        }
    }

    async recordGameResult(playerId, result) {
        try {
            // Fetch current profile first
            const res = await fetch(`${this.API_BASE}/profiles`);
            if (!res.ok) return;
            const profiles = await res.json();
            const player = profiles[playerId];
            if (!player) return;

            player.totalGamesPlayed = (player.totalGamesPlayed || 0) + 1;
            if (result.won) player.totalWins = (player.totalWins || 0) + 1;
            else player.totalLosses = (player.totalLosses || 0) + 1;
            if (result.score > (player.bestScore || 0)) player.bestScore = result.score;

            // Keep last 10 game history entries
            if (!player.history) player.history = [];
            player.history.unshift({
                date: new Date().toISOString(),
                civName: result.civName,
                turns: result.turns,
                won: result.won,
                victoryType: result.victoryType,
                score: result.score,
            });
            if (player.history.length > 10) player.history.pop();

            // Check achievements
            this.checkAchievements(player, result);

            await this.updateProfile(playerId, player);
            this.currentPlayer = { id: playerId, ...player };
        } catch (err) {
            console.error('Error recording game result:', err);
        }
    }

    checkAchievements(player, result) {
        if (!player.achievements) player.achievements = [];
        const achievements = player.achievements;

        const add = (id, name, desc) => {
            if (!achievements.find(a => a.id === id)) {
                achievements.push({ id, name, desc, unlockedAt: new Date().toISOString() });
            }
        };

        if (result.won) add('first_win', '🏆 First Victory', 'Win your first game');
        if (result.won && result.turns <= 50) add('speedrun', '⚡ Speedrunner', 'Win in 50 turns or less');
        if (result.victoryType === 'domination') add('conqueror', '⚔️ Conqueror', 'Win by domination');
        if (result.victoryType === 'science') add('scientist', '🔬 Visionary', 'Win by science');
        if (result.victoryType === 'economic') add('tycoon', '💰 Tycoon', 'Win by economic victory');
        if (result.victoryType === 'diplomatic') add('diplomat', '🤝 Diplomat', 'Win by diplomacy');
        if (player.totalGamesPlayed >= 5) add('veteran', '🎖️ Veteran', 'Play 5 games');
        if (player.totalGamesPlayed >= 20) add('addict', '🎮 Addicted', 'Play 20 games');
        if (result.nukesUsed > 0) add('nuclear', '☢️ Nuclear Option', 'Use a nuclear weapon');
        if (result.score >= 500) add('high_score', '📈 High Achiever', 'Score 500+ in a game');

        player.achievements = achievements;
    }

    // --- Game Save/Load ---

    async saveGame(playerId, gameEngine) {
        const state = {
            playerId,
            savedAt: new Date().toISOString(),
            turn: gameEngine.turn,
            difficulty: gameEngine.difficulty,
            civilizations: gameEngine.civilizations.map(civ => ({
                name: civ.name,
                isPlayer: civ.isPlayer,
                alive: civ.alive,
                gold: civ.gold,
                food: civ.food,
                production: civ.production,
                science: civ.science,
                population: civ.population,
                military: civ.military,
                goldRate: civ.goldRate,
                foodRate: civ.foodRate,
                productionRate: civ.productionRate,
                scienceRate: civ.scienceRate,
                buildings: [...civ.buildings],
                techs: [...civ.techs],
                units: [...civ.units],
                currentResearch: civ.currentResearch,
                researchProgress: civ.researchProgress,
                currentBuild: civ.currentBuild,
                buildProgress: civ.buildProgress,
                relations: JSON.parse(JSON.stringify(civ.relations)),
                hasNukes: civ.hasNukes,
                nukesUsed: civ.nukesUsed,
                strategy: civ.strategy,
                strategyLock: civ.strategyLock,
                government: civ.government,
                wonders: [...civ.wonders],
                warWeariness: civ.warWeariness,
                goldenAgeTurns: civ.goldenAgeTurns,
                espionageCooldown: civ.espionageCooldown,
                defenseBonus: civ.defenseBonus,
            })),
            events: gameEngine.events.slice(0, 20),
            diplomacyLog: gameEngine.diplomacyLog || {},
        };

        try {
            const res = await fetch(`${this.API_BASE}/saves/${playerId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state),
            });
            if (!res.ok) {
                throw new Error(`Save returned status ${res.status}`);
            }
        } catch (err) {
            console.error('Save failed:', err);
            throw err;
        }
    }

    async loadGame(playerId) {
        try {
            const res = await fetch(`${this.API_BASE}/saves/${playerId}`);
            if (!res.ok) return null;
            const data = await res.json();
            // Server returns null when no save exists
            if (!data || Object.keys(data).length === 0) return null;
            return data;
        } catch {
            return null;
        }
    }

    async deleteSave(playerId) {
        try {
            await fetch(`${this.API_BASE}/saves/${playerId}`, { method: 'DELETE' });
        } catch {
            // Silently ignore delete failures
        }
    }

    async hasSavedGame(playerId) {
        try {
            const res = await fetch(`${this.API_BASE}/saves/${playerId}`);
            if (!res.ok) return false;
            const data = await res.json();
            return data !== null && data !== undefined && Object.keys(data).length > 0;
        } catch {
            return false;
        }
    }

    restoreGame(gameEngine, saveData) {
        gameEngine.turn = saveData.turn;
        gameEngine.difficulty = saveData.difficulty;
        gameEngine.events = saveData.events || [];
        gameEngine.diplomacyLog = saveData.diplomacyLog || {};
        gameEngine.civilizations = [];
        gameEngine.gameOver = false;
        gameEngine.winner = null;
        gameEngine.victoryType = null;

        for (const civData of saveData.civilizations) {
            const civ = new Civilization(civData.name, civData.isPlayer);
            // Only assign known data properties, preserving prototype methods
            const safeKeys = [
                'alive', 'gold', 'food', 'production', 'science', 'population', 'military',
                'goldRate', 'foodRate', 'productionRate', 'scienceRate',
                'buildings', 'techs', 'units', 'currentResearch', 'researchProgress',
                'currentBuild', 'buildProgress', 'relations', 'hasNukes', 'nukesUsed',
                'strategy', 'strategyLock', 'government', 'wonders',
                'warWeariness', 'goldenAgeTurns', 'espionageCooldown', 'defenseBonus'
            ];
            for (const key of safeKeys) {
                if (civData[key] !== undefined) {
                    civ[key] = civData[key];
                }
            }
            gameEngine.civilizations.push(civ);
            if (civ.isPlayer) gameEngine.player = civ;
        }
    }
}
