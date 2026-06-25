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
        const res = await fetch(`${this.API_BASE}/profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        const player = await res.json();
        this.currentPlayer = player;
        return player;
    }

    async updateProfile(playerId, data) {
        const res = await fetch(`${this.API_BASE}/profiles/${playerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return await res.json();
    }

    async recordGameResult(playerId, result) {
        // Fetch current profile first
        const profiles = await (await fetch(`${this.API_BASE}/profiles`)).json();
        const player = profiles[playerId];
        if (!player) return;

        player.totalGamesPlayed++;
        if (result.won) player.totalWins++;
        else player.totalLosses++;
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
                buildings: civ.buildings,
                techs: civ.techs,
                units: civ.units,
                currentResearch: civ.currentResearch,
                researchProgress: civ.researchProgress,
                currentBuild: civ.currentBuild,
                buildProgress: civ.buildProgress,
                relations: civ.relations,
                hasNukes: civ.hasNukes,
                nukesUsed: civ.nukesUsed,
                strategy: civ.strategy,
                strategyLock: civ.strategyLock,
            })),
            events: gameEngine.events.slice(0, 20),
        };

        await fetch(`${this.API_BASE}/saves/${playerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
        });
    }

    async loadGame(playerId) {
        const res = await fetch(`${this.API_BASE}/saves/${playerId}`);
        const data = await res.json();
        return data;
    }

    async deleteSave(playerId) {
        await fetch(`${this.API_BASE}/saves/${playerId}`, { method: 'DELETE' });
    }

    async hasSavedGame(playerId) {
        const data = await this.loadGame(playerId);
        return data !== null;
    }

    restoreGame(gameEngine, saveData) {
        gameEngine.turn = saveData.turn;
        gameEngine.difficulty = saveData.difficulty;
        gameEngine.events = saveData.events || [];
        gameEngine.civilizations = [];
        gameEngine.gameOver = false;
        gameEngine.winner = null;

        for (const civData of saveData.civilizations) {
            const civ = new Civilization(civData.name, civData.isPlayer);
            Object.assign(civ, civData);
            gameEngine.civilizations.push(civ);
            if (civ.isPlayer) gameEngine.player = civ;
        }
    }
}
