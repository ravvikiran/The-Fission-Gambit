// ============================================
// UI - Renders game state to the browser
// ============================================

class GameUI {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.currentTab = 'overview';
        this.setupTabs();
    }

    setupTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panelId = 'tab-' + tab.dataset.tab;
                document.getElementById(panelId).classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.render();
            });
        });
    }

    render() {
        this.renderResources();
        this.renderHeader();
        this.renderEvents();

        switch (this.currentTab) {
            case 'overview': this.renderOverview(); break;
            case 'build': this.renderBuild(); break;
            case 'research': this.renderResearch(); break;
            case 'military': this.renderMilitary(); break;
            case 'diplomacy': this.renderDiplomacy(); break;
        }
    }

    renderHeader() {
        document.getElementById('turn-display').textContent = `Turn ${this.game.turn}`;
        document.getElementById('era-display').textContent = this.game.player.getEraName();
    }

    renderResources() {
        const p = this.game.player;
        document.getElementById('res-gold').textContent = Math.floor(p.gold);
        document.getElementById('res-food').textContent = Math.floor(p.food);
        document.getElementById('res-production').textContent = Math.floor(p.production);
        document.getElementById('res-science').textContent = Math.floor(p.science);
        document.getElementById('res-military').textContent = p.getTotalMilitary();
        document.getElementById('res-population').textContent = p.population;

        const goldRate = document.getElementById('res-gold-rate');
        goldRate.textContent = `+${p.goldRate}/t`;
        goldRate.className = 'rate';

        const foodRate = document.getElementById('res-food-rate');
        const netFood = p.foodRate - p.population;
        foodRate.textContent = `${netFood >= 0 ? '+' : ''}${netFood}/t`;
        foodRate.className = netFood >= 0 ? 'rate' : 'rate negative';

        const prodRate = document.getElementById('res-production-rate');
        prodRate.textContent = `+${p.productionRate}/t`;
        prodRate.className = 'rate';

        const sciRate = document.getElementById('res-science-rate');
        sciRate.textContent = `+${p.scienceRate}/t`;
        sciRate.className = 'rate';
    }

    renderEvents() {
        const container = document.getElementById('log-entries');
        container.innerHTML = this.game.events.slice(0, 20).map(e => {
            let cls = '';
            if (e.type === 'war') cls = 'war';
            else if (e.type === 'peace') cls = 'peace';
            else if (e.type === 'science') cls = 'science';
            else if (e.type === 'build') cls = 'build';
            else if (e.type === 'nuke') cls = 'nuke';
            return `<div class="log-entry ${cls}"><span class="log-turn">T${e.turn}</span> ${e.message}</div>`;
        }).join('');
    }

    renderOverview() {
        const p = this.game.player;
        const aliveCivs = this.game.getAliveCivs();
        const panel = document.getElementById('tab-overview');

        let currentResearchHTML = 'None';
        if (p.currentResearch) {
            const tech = TECHS[p.currentResearch];
            const pct = Math.min(100, Math.floor((p.researchProgress / tech.cost) * 100));
            currentResearchHTML = `${tech.name} (${pct}%)<div class="progress-bar"><div class="fill science" style="width:${pct}%"></div></div>`;
        }

        let currentBuildHTML = 'None';
        if (p.currentBuild) {
            const building = BUILDINGS[p.currentBuild];
            const pct = Math.min(100, Math.floor((p.buildProgress / building.cost.production) * 100));
            currentBuildHTML = `${building.name} (${pct}%)<div class="progress-bar"><div class="fill production" style="width:${pct}%"></div></div>`;
        }

        panel.innerHTML = `
            <div class="overview-grid">
                <div class="overview-card">
                    <h4>🏛️ Your Civilization</h4>
                    <div class="value">${p.name}</div>
                    <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.3rem;">
                        Score: ${p.getScore()} | Era: ${p.getEraName()}
                    </p>
                </div>
                <div class="overview-card">
                    <h4>🌍 World Status</h4>
                    <div class="value">${aliveCivs.length} Civilizations</div>
                    <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.3rem;">
                        Turn ${this.game.turn} | ${this.game.civilizations.filter(c => !c.alive).length} eliminated
                    </p>
                </div>
                <div class="overview-card">
                    <h4>🔬 Current Research</h4>
                    <div>${currentResearchHTML}</div>
                </div>
                <div class="overview-card">
                    <h4>🔨 Current Build</h4>
                    <div>${currentBuildHTML}</div>
                </div>
                <div class="overview-card">
                    <h4>🏗️ Buildings (${p.buildings.length})</h4>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">
                        ${p.buildings.map(b => BUILDINGS[b]?.name || b).join(', ') || 'None yet'}
                    </div>
                </div>
                <div class="overview-card">
                    <h4>📚 Technologies (${p.techs.length})</h4>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">
                        ${p.techs.map(t => TECHS[t]?.name || t).join(', ') || 'None yet'}
                    </div>
                </div>
            </div>
            <div style="margin-top:1rem;">
                <h4 style="margin-bottom:0.5rem;">🏆 Victory Progress</h4>
                <div style="font-size:0.85rem;color:var(--text-secondary);display:grid;gap:0.3rem;">
                    <div>🗡️ Domination: Eliminate all rivals (${this.game.civilizations.filter(c => !c.alive).length}/${this.game.civilizations.length - 1} eliminated)</div>
                    <div>🔬 Science: Research Space Travel (${p.techs.includes('spaceTravel') ? '✅' : 'Not yet'})</div>
                    <div>💰 Economic: Reach 5000 Gold (${Math.floor(p.gold)}/5000)</div>
                    <div>🤝 Diplomatic: Allied with all (${Object.values(p.relations).filter(r => r.status === 'allied').length}/${aliveCivs.length - 1} allied)</div>
                </div>
            </div>
        `;
    }

    renderBuild() {
        const p = this.game.player;
        const panel = document.getElementById('tab-build');

        let currentHTML = '';
        if (p.currentBuild) {
            const building = BUILDINGS[p.currentBuild];
            const pct = Math.min(100, Math.floor((p.buildProgress / building.cost.production) * 100));
            currentHTML = `<div class="overview-card" style="margin-bottom:1rem;">
                <h4>🔨 Currently Building</h4>
                <div>${building.name} - ${pct}%</div>
                <div class="progress-bar"><div class="fill production" style="width:${pct}%"></div></div>
            </div>`;
        }

        const available = Object.entries(BUILDINGS).filter(([id, building]) => {
            if (p.buildings.includes(id)) return false;
            if (building.era > p.getEra() + 1) return false;
            const unlockedBy = Object.entries(TECHS).find(([, t]) => t.unlocks?.includes(id));
            if (unlockedBy && !p.techs.includes(unlockedBy[0])) return false;
            return true;
        });

        const itemsHTML = available.map(([id, building]) => {
            const canBuild = !p.currentBuild;
            return `<div class="action-item ${canBuild ? '' : 'disabled'}">
                <div class="info">
                    <h5>${building.name}</h5>
                    <p>${building.desc}</p>
                </div>
                <div>
                    <span class="cost">🔨 ${building.cost.production}</span>
                    ${canBuild ? `<button class="btn-secondary" onclick="window.gameApp.startBuild('${id}')">Build</button>` : ''}
                </div>
            </div>`;
        }).join('');

        panel.innerHTML = `${currentHTML}<div class="action-list">${itemsHTML || '<p style="color:var(--text-secondary)">No buildings available. Research more technologies!</p>'}</div>`;
    }

    renderResearch() {
        const p = this.game.player;
        const panel = document.getElementById('tab-research');

        let currentHTML = '';
        if (p.currentResearch) {
            const tech = TECHS[p.currentResearch];
            const pct = Math.min(100, Math.floor((p.researchProgress / tech.cost) * 100));
            currentHTML = `<div class="overview-card" style="margin-bottom:1rem;">
                <h4>🔬 Currently Researching</h4>
                <div>${tech.name} - ${pct}%</div>
                <div class="progress-bar"><div class="fill science" style="width:${pct}%"></div></div>
            </div>`;
        }

        const available = Object.entries(TECHS).filter(([id, tech]) => {
            if (p.techs.includes(id)) return false;
            if (id === p.currentResearch) return false;
            if (tech.requires && !tech.requires.every(r => p.techs.includes(r))) return false;
            return true;
        });

        const itemsHTML = available.map(([id, tech]) => {
            const canResearch = !p.currentResearch;
            const turnsNeeded = Math.ceil(tech.cost / Math.max(1, p.scienceRate));
            return `<div class="action-item ${canResearch ? '' : 'disabled'}">
                <div class="info">
                    <h5>${tech.name}</h5>
                    <p>${tech.desc} (${ERAS[tech.era]} Era)</p>
                </div>
                <div>
                    <span class="cost">🔬 ${tech.cost} (~${turnsNeeded}t)</span>
                    ${canResearch ? `<button class="btn-secondary" onclick="window.gameApp.startResearch('${id}')">Research</button>` : ''}
                </div>
            </div>`;
        }).join('');

        panel.innerHTML = `${currentHTML}<div class="action-list">${itemsHTML || '<p style="color:var(--text-secondary)">All technologies researched!</p>'}</div>`;
    }

    renderMilitary() {
        const p = this.game.player;
        const panel = document.getElementById('tab-military');
        const era = p.getEra();

        const unitsHTML = Object.entries(MILITARY_UNITS).filter(([id, unit]) => {
            if (unit.era > era) return false;
            if (unit.isNuke && !p.hasNukes) return false;
            return true;
        }).map(([id, unit]) => {
            const canAfford = p.canAfford(unit.cost);
            return `<div class="action-item ${canAfford ? '' : 'disabled'}">
                <div class="info">
                    <h5>${unit.name} ${unit.isNuke ? '☢️' : ''}</h5>
                    <p>Power: +${unit.power}</p>
                </div>
                <div>
                    <span class="cost">💰${unit.cost.gold} 🔨${unit.cost.production}</span>
                    ${canAfford ? `<button class="btn-secondary" onclick="window.gameApp.trainUnit('${id}')">Train</button>` : ''}
                </div>
            </div>`;
        }).join('');

        const myUnits = {};
        p.units.forEach(u => { myUnits[u] = (myUnits[u] || 0) + 1; });
        const armyHTML = Object.entries(myUnits).map(([id, count]) => {
            const unit = MILITARY_UNITS[id];
            return `<span style="margin-right:1rem;">${unit.name} x${count} (⚔️${unit.power * count})</span>`;
        }).join('') || '<span style="color:var(--text-secondary)">No units</span>';

        panel.innerHTML = `
            <div class="overview-card" style="margin-bottom:1rem;">
                <h4>🏰 Your Army</h4>
                <div style="font-size:0.9rem;">Total Power: ⚔️ ${p.getTotalMilitary()}</div>
                <div style="font-size:0.85rem;margin-top:0.3rem;">${armyHTML}</div>
            </div>
            <h4 style="margin-bottom:0.5rem;">Train Units</h4>
            <div class="action-list">${unitsHTML || '<p style="color:var(--text-secondary)">No units available in this era.</p>'}</div>
        `;
    }

    renderDiplomacy() {
        const p = this.game.player;
        const panel = document.getElementById('tab-diplomacy');

        const civsHTML = this.game.civilizations.filter(c => c !== p).map(civ => {
            const relation = p.relations[civ.name] || { status: 'neutral', value: 50 };
            const alive = civ.alive;

            if (!alive) {
                return `<div class="civ-card" style="opacity:0.5;">
                    <h4>${civ.name} <span class="relation hostile">💀 Eliminated</span></h4>
                </div>`;
            }

            const actions = [];
            if (relation.status !== 'war' && relation.status !== 'allied') {
                actions.push(`<button class="btn-secondary" onclick="window.gameApp.sendGift('${civ.name}')">Send Gift (50💰)</button>`);
            }
            if (relation.status === 'friendly' && relation.value >= 70) {
                actions.push(`<button class="btn-secondary" onclick="window.gameApp.proposeAlliance('${civ.name}')">Propose Alliance</button>`);
            }
            if (relation.status !== 'war' && relation.status !== 'allied') {
                actions.push(`<button class="btn-danger" onclick="window.gameApp.declareWar('${civ.name}')">Declare War</button>`);
            }
            if (relation.status === 'war') {
                actions.push(`<button class="btn-secondary" onclick="window.gameApp.attackCiv('${civ.name}')">⚔️ Attack</button>`);
                if (p.hasNukes) {
                    actions.push(`<button class="btn-danger" onclick="window.gameApp.nukeCity('${civ.name}')">☢️ Launch Nuke</button>`);
                }
            }

            return `<div class="civ-card">
                <h4>${civ.name} <span class="relation ${relation.status}">${relation.status.toUpperCase()}</span></h4>
                <div class="civ-stats">
                    <span>⚔️ ${civ.getTotalMilitary()}</span>
                    <span>👥 ${civ.population}</span>
                    <span>📚 ${civ.techs.length} techs</span>
                    <span>Strategy: ${civ.strategy}</span>
                </div>
                <div class="diplomacy-actions">${actions.join('')}</div>
            </div>`;
        }).join('');

        panel.innerHTML = civsHTML;
    }

    showGameOver(winner, victoryType) {
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('gameover-screen').classList.add('active');

        const isPlayerWin = winner.isPlayer;
        const title = document.getElementById('gameover-title');
        const message = document.getElementById('gameover-message');
        const stats = document.getElementById('gameover-stats');

        if (isPlayerWin) {
            title.textContent = '🏆 VICTORY!';
            title.style.color = 'var(--gold)';
            message.textContent = `${winner.name} achieved a ${victoryType} victory in ${this.game.turn} turns!`;
        } else {
            title.textContent = '💀 DEFEAT';
            title.style.color = 'var(--danger)';
            message.textContent = `${winner.name} achieved a ${victoryType} victory. Your civilization has fallen.`;
        }

        stats.innerHTML = `
            <div class="stat-box"><div class="label">Turns</div><div class="value">${this.game.turn}</div></div>
            <div class="stat-box"><div class="label">Score</div><div class="value">${this.game.player.getScore()}</div></div>
            <div class="stat-box"><div class="label">Techs</div><div class="value">${this.game.player.techs.length}</div></div>
            <div class="stat-box"><div class="label">Buildings</div><div class="value">${this.game.player.buildings.length}</div></div>
            <div class="stat-box"><div class="label">Military</div><div class="value">${this.game.player.getTotalMilitary()}</div></div>
            <div class="stat-box"><div class="label">Victory</div><div class="value">${victoryType}</div></div>
        `;
    }
}
