// ============================================
// MAIN - Game controller, wires everything together
// ============================================

class GameApp {
    constructor() {
        this.engine = new GameEngine();
        this.ai = null;
        this.ui = null;
        this.saveSystem = new SaveSystem();
        this.currentPlayerId = null;
        this.setupLoginScreen();
    }

    setupLoginScreen() {
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
    }

    async login() {
        const name = document.getElementById('player-name-input').value.trim();
        if (!name) return;

        const player = await this.saveSystem.login(name);
        this.currentPlayerId = player.id;

        document.getElementById('login-screen').classList.remove('active');
        await this.showStartScreen(player);
    }

    async showStartScreen(player) {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('gameover-screen').classList.remove('active');
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('active');

        // Welcome message
        const welcomeEl = document.getElementById('welcome-message');
        if (player.isReturning || player.totalGamesPlayed > 0) {
            welcomeEl.textContent = `Welcome back, ${player.name}!`;
        } else {
            welcomeEl.textContent = `Welcome, ${player.name}! Ready for your first game?`;
        }

        // Player stats
        this.renderPlayerStats(player);

        // Check for saved game
        const continueSection = document.getElementById('continue-game-section');
        const hasSave = await this.saveSystem.hasSavedGame(player.id);
        if (hasSave) {
            continueSection.style.display = 'block';
            document.getElementById('continue-btn').onclick = () => this.continueGame();
        } else {
            continueSection.style.display = 'none';
        }

        // Setup buttons
        document.getElementById('start-btn').onclick = () => this.startNewGame();
        document.getElementById('restart-btn').onclick = () => this.restart();
    }

    renderPlayerStats(player) {
        const panel = document.getElementById('player-stats-panel');
        if (!player.totalGamesPlayed || player.totalGamesPlayed === 0) {
            panel.innerHTML = '';
            return;
        }

        const winRate = player.totalGamesPlayed > 0
            ? Math.round((player.totalWins / player.totalGamesPlayed) * 100) : 0;

        let achievementsHTML = '';
        if (player.achievements && player.achievements.length > 0) {
            achievementsHTML = `<div style="margin-top:0.5rem;font-size:0.8rem;">
                ${player.achievements.map(a => `<span title="${a.desc}" style="margin-right:0.5rem;">${a.name}</span>`).join('')}
            </div>`;
        }

        let historyHTML = '';
        if (player.history && player.history.length > 0) {
            historyHTML = `<div style="margin-top:0.8rem;font-size:0.8rem;color:var(--text-secondary);">
                <strong>Recent Games:</strong><br>
                ${player.history.slice(0, 3).map(h =>
                    `${h.won ? '🏆' : '💀'} ${h.civName} - ${h.victoryType} (Turn ${h.turns}, Score ${h.score})`
                ).join('<br>')}
            </div>`;
        }

        panel.innerHTML = `
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;justify-content:center;margin-bottom:0.5rem;">
                <div class="stat-box"><div class="label">Games</div><div class="value">${player.totalGamesPlayed}</div></div>
                <div class="stat-box"><div class="label">Wins</div><div class="value">${player.totalWins}</div></div>
                <div class="stat-box"><div class="label">Win Rate</div><div class="value">${winRate}%</div></div>
                <div class="stat-box"><div class="label">Best Score</div><div class="value">${player.bestScore}</div></div>
            </div>
            ${achievementsHTML}
            ${historyHTML}
        `;
    }

    async continueGame() {
        const saveData = await this.saveSystem.loadGame(this.currentPlayerId);
        if (!saveData) return;

        this.saveSystem.restoreGame(this.engine, saveData);
        this.ai = new AIEngine(this.engine);
        this.ui = new GameUI(this.engine);

        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        this.setupEndTurnButton();

        this.engine.addEvent('game', `Welcome back! Resuming from Turn ${this.engine.turn}.`);
        this.ui.render();
    }

    async startNewGame() {
        const name = document.getElementById('player-civ-name').value.trim() || 'Roma';
        const aiCount = parseInt(document.getElementById('ai-count').value);
        const difficulty = document.getElementById('difficulty').value;

        // Delete old save if exists
        await this.saveSystem.deleteSave(this.currentPlayerId);

        this.engine.init(name, aiCount, difficulty);
        this.ai = new AIEngine(this.engine);
        this.ui = new GameUI(this.engine);

        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        this.setupEndTurnButton();
        this.ui.render();
    }

    setupEndTurnButton() {
        const btn = document.getElementById('end-turn-btn');
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => this.endTurn());
    }

    async endTurn() {
        // AI makes decisions
        for (const civ of this.engine.getAIcivs()) {
            this.ai.makeDecision(civ);
        }

        // Process turn for all civs
        const victory = this.engine.endTurn();

        // Auto-save every turn (async, don't block the UI)
        this.saveSystem.saveGame(this.currentPlayerId, this.engine);

        if (victory) {
            await this.handleGameOver(this.engine.winner, this.engine.victoryType);
        } else if (!this.engine.player.alive) {
            const winner = this.engine.getAliveCivs()[0] || this.engine.civilizations[1];
            await this.handleGameOver(winner, 'domination');
        } else {
            this.ui.render();
        }
    }

    async handleGameOver(winner, victoryType) {
        const playerWon = winner.isPlayer;

        // Record game result
        await this.saveSystem.recordGameResult(this.currentPlayerId, {
            won: playerWon,
            civName: this.engine.player.name,
            turns: this.engine.turn,
            victoryType: victoryType,
            score: this.engine.player.getScore(),
            nukesUsed: this.engine.player.nukesUsed || 0,
        });

        // Delete the save since game is over
        await this.saveSystem.deleteSave(this.currentPlayerId);

        this.ui.showGameOver(winner, victoryType);
    }

    // Player actions
    startBuild(buildingId) {
        const p = this.engine.player;
        if (p.currentBuild) return;
        p.currentBuild = buildingId;
        p.buildProgress = 0;
        this.engine.addEvent('build', `${p.name} started building ${BUILDINGS[buildingId].name}.`);
        this.ui.render();
    }

    startResearch(techId) {
        const p = this.engine.player;
        if (p.currentResearch) return;
        p.currentResearch = techId;
        p.researchProgress = 0;
        this.engine.addEvent('science', `${p.name} started researching ${TECHS[techId].name}.`);
        this.ui.render();
    }

    trainUnit(unitId) {
        const p = this.engine.player;
        const unit = MILITARY_UNITS[unitId];
        if (!p.canAfford(unit.cost)) return;
        p.spend(unit.cost);
        p.units.push(unitId);
        this.engine.addEvent('war', `${p.name} trained ${unit.name}.`);
        this.ui.render();
    }

    sendGift(civName) {
        const p = this.engine.player;
        const target = this.engine.civilizations.find(c => c.name === civName);
        if (!target || p.gold < 50) return;
        this.engine.proposeTrade(p, target, 50);
        this.ui.render();
    }

    proposeAlliance(civName) {
        const p = this.engine.player;
        const target = this.engine.civilizations.find(c => c.name === civName);
        if (!target) return;
        const success = this.engine.proposeAlliance(p, target);
        if (!success) {
            this.engine.addEvent('peace', `${target.name} rejected the alliance proposal.`);
        }
        this.ui.render();
    }

    declareWar(civName) {
        const p = this.engine.player;
        const target = this.engine.civilizations.find(c => c.name === civName);
        if (!target) return;
        this.engine.setRelation(p, target, 'war');
        this.engine.addEvent('war', `⚔️ ${p.name} declared WAR on ${target.name}!`);
        this.ui.render();
    }

    attackCiv(civName) {
        const p = this.engine.player;
        const target = this.engine.civilizations.find(c => c.name === civName);
        if (!target || p.relations[civName]?.status !== 'war') return;
        this.engine.attack(p, target);
        this.ui.render();
    }

    nukeCity(civName) {
        const p = this.engine.player;
        const target = this.engine.civilizations.find(c => c.name === civName);
        if (!target || !p.hasNukes) return;
        this.engine.launchNuke(p, target);
        this.ui.render();
    }

    changeGovernment(govId) {
        const success = this.engine.changeGovernment(this.engine.player, govId);
        if (!success) {
            this.engine.addEvent('game', `Cannot adopt this government yet.`);
        }
        this.ui.render();
    }

    buildWonder(wonderId) {
        const success = this.engine.buildWonder(this.engine.player, wonderId);
        if (!success) {
            this.engine.addEvent('game', `Cannot build this wonder.`);
        }
        this.ui.render();
    }

    conductEspionage(civName, action) {
        const p = this.engine.player;
        const target = this.engine.civilizations.find(c => c.name === civName);
        if (!target) return;
        const result = this.engine.conductEspionage(p, target, action);
        if (!result.success) {
            this.engine.addEvent('game', result.reason);
        }
        this.ui.render();
    }

    async restart() {
        document.getElementById('gameover-screen').classList.remove('active');
        const player = this.saveSystem.currentPlayer;
        await this.showStartScreen(player);
    }
}

// Initialize
window.gameApp = new GameApp();
