// ============================================
// UI - Renders game state to the browser
// ============================================

class GameUI {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.currentTab = 'overview';
        this.setupTabs();
    }

    // Sanitize strings before inserting into HTML to prevent XSS
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
        this.renderAlerts();
        this.renderCivVisual();
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

    renderAlerts() {
        const p = this.game.player;
        const alertBar = document.getElementById('alert-bar');
        const alerts = [];
        const aliveCivs = this.game.getAliveCivs().filter(c => c !== p);

        // Check if any AI is close to a victory condition
        for (const civ of aliveCivs) {
            // Economic victory threat (>70% of goal)
            if (civ.gold >= 3500) {
                const pct = Math.floor((civ.gold / 5000) * 100);
                alerts.push({ type: 'danger', text: `💰 ${this.escapeHTML(civ.name)} has ${Math.floor(civ.gold)} gold (${pct}% to Economic Victory)` });
            }

            // Science victory threat
            if (civ.techs.includes('rocketry') && !civ.techs.includes('spaceTravel')) {
                alerts.push({ type: 'warning', text: `🔬 ${this.escapeHTML(civ.name)} is researching toward Space Travel!` });
            }
            if (civ.techs.includes('computers') && civ.techs.includes('rocketry')) {
                alerts.push({ type: 'danger', text: `🚀 ${this.escapeHTML(civ.name)} is one tech away from Science Victory!` });
            }

            // Diplomatic victory threat
            const otherAlive = aliveCivs.filter(c => c !== civ);
            if (otherAlive.length > 0) {
                const alliedCount = otherAlive.filter(c => civ.relations[c.name]?.status === 'allied').length;
                // Also check if allied with player
                const alliedWithPlayer = civ.relations[p.name]?.status === 'allied' ? 1 : 0;
                const totalNeeded = aliveCivs.length; // needs all other alive civs allied (including player)
                const totalAllied = alliedCount + alliedWithPlayer;
                if (totalAllied >= totalNeeded - 1 && totalNeeded > 1) {
                    alerts.push({ type: 'danger', text: `🤝 ${this.escapeHTML(civ.name)} is one alliance away from Diplomatic Victory!` });
                } else if (totalAllied >= Math.floor(totalNeeded * 0.6) && totalNeeded > 2) {
                    alerts.push({ type: 'warning', text: `🤝 ${this.escapeHTML(civ.name)} is building alliances (${totalAllied}/${totalNeeded} needed)` });
                }
            }

            // Military threat — someone is much stronger
            if (civ.getTotalMilitary() > p.getTotalMilitary() * 2 && civ.relations[p.name]?.status !== 'allied') {
                alerts.push({ type: 'warning', text: `⚔️ ${this.escapeHTML(civ.name)} has overwhelming military (${civ.getTotalMilitary()} vs your ${p.getTotalMilitary()})` });
            }

            // Imminent war threat
            if (civ.relations[p.name]?.status === 'hostile' && civ.getTotalMilitary() > p.getTotalMilitary()) {
                alerts.push({ type: 'danger', text: `🗡️ ${this.escapeHTML(civ.name)} is hostile and stronger — war may be imminent!` });
            }

            // Nuke threat
            if (civ.hasNukes && civ.relations[p.name]?.status === 'war') {
                alerts.push({ type: 'danger', text: `☢️ ${this.escapeHTML(civ.name)} has nuclear weapons and you're at war!` });
            }
        }

        // Player's own issues
        if (p.goldRate < 0 || (p.gold < 50 && p.goldRate <= 2)) {
            alerts.push({ type: 'info', text: `📉 Your economy is struggling — gold income: ${p.goldRate}/turn` });
        }

        if (p.food < p.population * 2 && p.foodRate <= p.population) {
            alerts.push({ type: 'info', text: `🌾 Food shortage risk — population may starve next turn` });
        }

        // Render
        if (alerts.length > 0) {
            alertBar.classList.add('has-alerts');
            alertBar.innerHTML = alerts.map(a =>
                `<span class="alert-item ${a.type}">${a.text}</span>`
            ).join('');
        } else {
            alertBar.classList.remove('has-alerts');
            alertBar.innerHTML = '';
        }
    }

    renderCivVisual() {
        const p = this.game.player;
        const visual = document.getElementById('civ-visual');

        // Build visual clusters based on actual game state
        const sections = [];

        // Population (people icons)
        const popCount = Math.min(p.population, 20); // cap visual at 20 icons
        const popIcons = '👤'.repeat(Math.min(popCount, 10)) + (popCount > 10 ? `<span class="viz-count">+${popCount - 10}</span>` : '');
        sections.push(`<div class="viz-group"><span class="viz-label">Pop</span>${popIcons}</div>`);

        sections.push('<span class="viz-separator"></span>');

        // Agriculture/Farms
        const farmCount = p.buildings.filter(b => b === 'farm').length;
        const foodBuildings = p.buildings.filter(b => BUILDINGS[b]?.effect.foodRate).length;
        if (foodBuildings > 0 || p.foodRate > 3) {
            const farmIcons = '🌾'.repeat(Math.min(foodBuildings, 5)) || '🌾';
            sections.push(`<div class="viz-group"><span class="viz-label">Farms</span>${farmIcons}</div>`);
        }

        // Mining/Production
        const prodBuildings = p.buildings.filter(b => BUILDINGS[b]?.effect.productionRate).length;
        if (prodBuildings > 0 || p.productionRate > 3) {
            const mineIcons = '⛏️'.repeat(Math.min(prodBuildings, 5)) || '⛏️';
            sections.push(`<div class="viz-group"><span class="viz-label">Mines</span>${mineIcons}</div>`);
        }

        // Commerce/Gold
        const goldBuildings = p.buildings.filter(b => BUILDINGS[b]?.effect.goldRate).length;
        if (goldBuildings > 0) {
            const goldIcons = '🏪'.repeat(Math.min(goldBuildings, 5));
            sections.push(`<div class="viz-group"><span class="viz-label">Trade</span>${goldIcons}</div>`);
        }

        // Science
        const sciBuildings = p.buildings.filter(b => BUILDINGS[b]?.effect.scienceRate).length;
        if (sciBuildings > 0) {
            const sciIcons = '📖'.repeat(Math.min(sciBuildings, 5));
            sections.push(`<div class="viz-group"><span class="viz-label">Science</span>${sciIcons}</div>`);
        }

        sections.push('<span class="viz-separator"></span>');

        // Military units visual
        if (p.units.length > 0) {
            const unitVisuals = [];
            const unitCounts = {};
            p.units.forEach(u => { unitCounts[u] = (unitCounts[u] || 0) + 1; });

            const unitIcons = {
                warrior: '🗡️',
                archer: '🏹',
                knight: '🐴',
                musketeer: '🔫',
                artillery: '💣',
                tank: '🛡️',
                nuke: '☢️',
            };

            for (const [unitId, count] of Object.entries(unitCounts)) {
                const icon = unitIcons[unitId] || '⚔️';
                if (count <= 3) {
                    unitVisuals.push(icon.repeat(count));
                } else {
                    unitVisuals.push(`${icon}<span class="viz-count">×${count}</span>`);
                }
            }

            sections.push(`<div class="viz-group"><span class="viz-label">Army</span>${unitVisuals.join(' ')}</div>`);
        } else {
            sections.push(`<div class="viz-group"><span class="viz-label">Army</span><span style="font-size:0.75rem;color:var(--text-secondary);">None</span></div>`);
        }

        // Wonders (trophy icons)
        if (p.wonders.length > 0) {
            sections.push('<span class="viz-separator"></span>');
            const wonderIcons = p.wonders.map(w => '🏛️').join('');
            sections.push(`<div class="viz-group"><span class="viz-label">Wonders</span>${wonderIcons}</div>`);
        }

        // Government icon
        const govIcons = {
            despotism: '👑',
            republic: '🏛️',
            monarchy: '♔',
            democracy: '🗳️',
            communism: '☭',
            theocracy: '⛪',
        };
        const govIcon = govIcons[p.government] || '👑';
        sections.push('<span class="viz-separator"></span>');
        sections.push(`<div class="viz-group"><span class="viz-label">Gov</span><span class="viz-icon">${govIcon}</span></div>`);

        visual.innerHTML = sections.join('');
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
        const goldenAgeGoldBonus = p.goldenAgeTurns > 0 ? 5 : 0;
        const effectiveGoldRate = p.goldRate + goldenAgeGoldBonus - (p.warWeariness > 0 ? Math.floor(p.warWeariness * 2) : 0);
        goldRate.textContent = `${effectiveGoldRate >= 0 ? '+' : ''}${effectiveGoldRate}/t`;
        goldRate.className = effectiveGoldRate >= 0 ? 'rate' : 'rate negative';

        const foodRate = document.getElementById('res-food-rate');
        const goldenAgeFoodBonus = p.goldenAgeTurns > 0 ? 2 : 0;
        const netFood = p.foodRate + goldenAgeFoodBonus - p.population;
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
            return `<div class="log-entry ${cls}"><span class="log-turn">T${e.turn}</span> ${this.escapeHTML(e.message)}</div>`;
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
                    <div class="value">${this.escapeHTML(p.name)}</div>
                    <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.3rem;">
                        Score: ${p.getScore()} | Era: ${p.getEraName()} | Gov: ${GOVERNMENTS[p.government]?.name || 'Despotism'}
                    </p>
                    ${p.warWeariness > 0 ? `<p style="color:var(--danger);font-size:0.8rem;">⚠️ War Weariness: -${Math.floor(p.warWeariness * 2)} Gold/turn</p>` : ''}
                    ${p.goldenAgeTurns > 0 ? `<p style="color:var(--gold);font-size:0.8rem;">✨ Golden Age: ${p.goldenAgeTurns} turns left</p>` : ''}
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
                    ${p.wonders.length > 0 ? `<div style="font-size:0.85rem;color:var(--gold);margin-top:0.3rem;">🏛️ Wonders: ${p.wonders.map(w => WONDERS[w]?.name || w).join(', ')}</div>` : ''}
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

        // Available Wonders
        const availableWonders = Object.entries(WONDERS).filter(([id, wonder]) => {
            // Check no civ has built it
            for (const c of this.game.civilizations) {
                if (c.wonders.includes(id)) return false;
            }
            if (wonder.era > p.getEra() + 1) return false;
            if (wonder.requires && !wonder.requires.every(r => p.techs.includes(r))) return false;
            return true;
        });

        const wondersHTML = availableWonders.map(([id, wonder]) => {
            const canAfford = p.canAfford(wonder.cost);
            return `<div class="action-item ${canAfford ? '' : 'disabled'}">
                <div class="info">
                    <h5>🏛️ ${wonder.name} <span style="color:var(--gold);font-size:0.75rem;">(WONDER)</span></h5>
                    <p>${wonder.desc}</p>
                </div>
                <div>
                    <span class="cost">🔨 ${wonder.cost.production}</span>
                    ${canAfford ? `<button class="btn-secondary" onclick="window.gameApp.buildWonder('${id}')">Build</button>` : ''}
                </div>
            </div>`;
        }).join('');

        // Government options
        const availableGovs = Object.entries(GOVERNMENTS).filter(([id, gov]) => {
            if (id === p.government) return false;
            if (gov.era > p.getEra()) return false;
            if (gov.requires && !gov.requires.every(r => p.techs.includes(r))) return false;
            return true;
        });

        const govHTML = availableGovs.length > 0 ? `
            <h4 style="margin-top:1rem;margin-bottom:0.5rem;">🏛️ Change Government</h4>
            <div class="action-list">${availableGovs.map(([id, gov]) => `
                <div class="action-item">
                    <div class="info">
                        <h5>${gov.name}</h5>
                        <p>${gov.desc}</p>
                    </div>
                    <div>
                        <button class="btn-secondary" onclick="window.gameApp.changeGovernment('${id}')">Adopt</button>
                    </div>
                </div>
            `).join('')}</div>
        ` : '';

        panel.innerHTML = `${currentHTML}
            <div class="action-list">${itemsHTML || '<p style="color:var(--text-secondary)">No buildings available. Research more technologies!</p>'}</div>
            ${wondersHTML ? `<h4 style="margin-top:1rem;margin-bottom:0.5rem;">🏛️ World Wonders</h4><div class="action-list">${wondersHTML}</div>` : ''}
            ${govHTML}
        `;
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
            if (unit.isNuke && !p.techs.includes('nuclearFission')) return false;
            return true;
        }).map(([id, unit]) => {
            // Apply Manhattan Project discount
            let cost = unit.cost;
            if (unit.isNuke && p.wonders.includes('manhattan')) {
                cost = { gold: Math.floor(unit.cost.gold / 2), production: Math.floor(unit.cost.production / 2) };
            }
            const canAfford = p.canAfford(cost);
            return `<div class="action-item ${canAfford ? '' : 'disabled'}">
                <div class="info">
                    <h5>${unit.name} ${unit.isNuke ? '☢️' : ''}</h5>
                    <p>Power: +${unit.power}</p>
                </div>
                <div>
                    <span class="cost">💰${cost.gold} 🔨${cost.production}${unit.isNuke && p.wonders.includes('manhattan') ? ' (50% off)' : ''}</span>
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
            const safeName = this.escapeHTML(civ.name);
            const jsName = civ.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            if (!alive) {
                return `<div class="civ-card" style="opacity:0.5;">
                    <h4>${safeName} <span class="relation hostile">💀 Eliminated</span></h4>
                </div>`;
            }

            const actions = [];
            if (relation.status !== 'war' && relation.status !== 'allied') {
                actions.push(`<button class="btn-secondary" onclick="window.gameApp.sendGift('${jsName}')">Send Gift (50💰)</button>`);
            }
            if (relation.status === 'friendly' && relation.value >= 70) {
                actions.push(`<button class="btn-secondary" onclick="window.gameApp.proposeAlliance('${jsName}')">Propose Alliance</button>`);
            }
            if (relation.status !== 'war' && relation.status !== 'allied') {
                actions.push(`<button class="btn-danger" onclick="window.gameApp.declareWar('${jsName}')">Declare War</button>`);
            }
            if (relation.status === 'war') {
                actions.push(`<button class="btn-secondary" onclick="window.gameApp.attackCiv('${jsName}')">⚔️ Attack</button>`);
                if (p.hasNukes && p.units.includes('nuke')) {
                    actions.push(`<button class="btn-danger" onclick="window.gameApp.nukeCity('${jsName}')">☢️ Launch Nuke</button>`);
                }
            }
            // Espionage (available after Classical era, not during alliance)
            if (relation.status !== 'allied' && p.getEra() >= 1 && p.espionageCooldown === 0 && p.gold >= 75) {
                actions.push(`<button class="btn-secondary" onclick="window.gameApp.conductEspionage('${jsName}','stealTech')">🕵️ Steal Tech (75💰)</button>`);
                actions.push(`<button class="btn-secondary" onclick="window.gameApp.conductEspionage('${jsName}','sabotage')">🕵️ Sabotage (75💰)</button>`);
            }

            return `<div class="civ-card">
                <h4>${safeName} <span class="relation ${relation.status}">${relation.status.toUpperCase()}</span></h4>
                <div class="civ-stats">
                    <span>⚔️ ${civ.getTotalMilitary()}</span>
                    <span>👥 ${civ.population}</span>
                    <span>📚 ${civ.techs.length} techs</span>
                    <span>Strategy: ${this.escapeHTML(civ.strategy)}</span>
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

        // Generate and display post-game analysis
        const analysisContainer = document.getElementById('gameover-analysis');
        const analysis = this.generatePostGameAnalysis(winner, victoryType, isPlayerWin);
        analysisContainer.innerHTML = analysis;
    }

    generatePostGameAnalysis(winner, victoryType, isPlayerWin) {
        const p = this.game.player;
        const steps = [];

        if (isPlayerWin) {
            steps.push(...this.analyzeVictory(p, victoryType));
        } else {
            steps.push(...this.analyzeDefeat(p, winner, victoryType));
        }

        // Common observations for both outcomes
        steps.push(...this.analyzeGeneralPerformance(p, isPlayerWin));

        const headerText = isPlayerWin ? '📋 What Won You the Game' : '📋 What Could Have Saved You';

        return `
            <div class="analysis-header">${headerText}</div>
            <ol class="analysis-timeline">
                ${steps.map(s => `
                    <li class="analysis-step ${s.type}">
                        <span class="step-icon">${s.icon}</span>
                        <span class="step-text">${s.text}</span>
                    </li>
                `).join('')}
            </ol>
        `;
    }

    analyzeVictory(player, victoryType) {
        const steps = [];

        switch (victoryType) {
            case 'science':
                steps.push({ type: 'positive', icon: '🔬', text: '<strong>Science focus paid off.</strong> You prioritized research and reached Space Travel before anyone else.' });
                if (player.scienceRate >= 15) {
                    steps.push({ type: 'positive', icon: '📚', text: `<strong>Strong science infrastructure.</strong> Your ${player.scienceRate}/turn science rate kept you ahead of the tech curve.` });
                }
                if (player.buildings.includes('university') || player.buildings.includes('lab')) {
                    steps.push({ type: 'positive', icon: '🏗️', text: '<strong>Key buildings.</strong> Universities and Research Labs accelerated your research significantly.' });
                }
                if (player.wonders.includes('greatLibrary') || player.wonders.includes('oxfordUniversity')) {
                    steps.push({ type: 'positive', icon: '🏛️', text: '<strong>Wonder advantage.</strong> Science wonders gave you a massive research boost over rivals.' });
                }
                break;

            case 'economic':
                steps.push({ type: 'positive', icon: '💰', text: `<strong>Economic dominance.</strong> You accumulated ${Math.floor(player.gold)} gold, reaching the 5000 threshold.` });
                if (player.goldRate >= 15) {
                    steps.push({ type: 'positive', icon: '📈', text: `<strong>High income.</strong> Your ${player.goldRate}/turn gold rate sustained rapid wealth accumulation.` });
                }
                if (player.buildings.includes('bank') || player.buildings.includes('stockExchange')) {
                    steps.push({ type: 'positive', icon: '🏦', text: '<strong>Financial buildings.</strong> Banks and Stock Exchanges were key to your gold engine.' });
                }
                if (player.wonders.includes('bigBen')) {
                    steps.push({ type: 'positive', icon: '🏛️', text: '<strong>Big Ben wonder.</strong> The +20 gold/turn from Big Ben was a game-changer.' });
                }
                break;

            case 'domination':
                steps.push({ type: 'positive', icon: '⚔️', text: '<strong>Military supremacy.</strong> You eliminated all rival civilizations through force.' });
                if (player.nukesUsed > 0) {
                    steps.push({ type: 'positive', icon: '☢️', text: `<strong>Nuclear deterrent.</strong> You used ${player.nukesUsed} nuclear strike(s) to decisively end conflicts.` });
                }
                const totalUnits = player.units.length;
                if (totalUnits >= 5) {
                    steps.push({ type: 'positive', icon: '🗡️', text: `<strong>Large army.</strong> Maintaining ${totalUnits} units gave you overwhelming force.` });
                }
                if (player.government === 'monarchy' || player.government === 'theocracy') {
                    steps.push({ type: 'positive', icon: '🏛️', text: `<strong>Military government.</strong> ${GOVERNMENTS[player.government].name} provided crucial military bonuses.` });
                }
                break;

            case 'diplomatic':
                steps.push({ type: 'positive', icon: '🤝', text: '<strong>Diplomatic mastery.</strong> You allied with every surviving civilization through patience and generosity.' });
                const alliedCount = Object.values(player.relations).filter(r => r.status === 'allied').length;
                steps.push({ type: 'positive', icon: '🕊️', text: `<strong>Alliance network.</strong> You maintained ${alliedCount} active alliance(s).` });
                if (player.gold > 500) {
                    steps.push({ type: 'positive', icon: '💰', text: '<strong>Gift diplomacy.</strong> Your gold reserves enabled generous gifting to improve relations.' });
                }
                break;
        }

        // Speed bonus
        if (this.game.turn <= 50) {
            steps.push({ type: 'positive', icon: '⚡', text: `<strong>Speed victory!</strong> Winning in ${this.game.turn} turns is an impressive feat.` });
        }

        return steps;
    }

    analyzeDefeat(player, winner, victoryType) {
        const steps = [];

        // What the winner did right
        steps.push({ type: 'negative', icon: '💀', text: `<strong>${this.escapeHTML(winner.name)} won by ${victoryType}.</strong> They outpaced you in the key area needed for this victory.` });

        // Analyze what the player lacked based on how they lost
        switch (victoryType) {
            case 'science':
                steps.push({ type: 'tip', icon: '💡', text: '<strong>Tip: Race the tech tree.</strong> When a rival is ahead in tech, prioritize science buildings (Libraries, Universities, Labs) and techs that boost science rate.' });
                if (player.scienceRate < 10) {
                    steps.push({ type: 'warning', icon: '⚠️', text: `<strong>Low science output.</strong> Your ${player.scienceRate}/turn wasn't enough. Build more science infrastructure early.` });
                }
                if (!player.techs.includes('education')) {
                    steps.push({ type: 'tip', icon: '💡', text: '<strong>Tip:</strong> Research Education early — it unlocks Universities which are crucial for mid-game science.' });
                }
                break;

            case 'economic':
                steps.push({ type: 'tip', icon: '💡', text: '<strong>Tip: Disrupt their economy.</strong> When a rival is hoarding gold, declare war or use espionage to sabotage their production and drain their resources.' });
                if (player.goldRate < winner.goldRate) {
                    steps.push({ type: 'warning', icon: '⚠️', text: `<strong>Income gap.</strong> Your gold rate (${player.goldRate}/t) couldn't compete with ${this.escapeHTML(winner.name)}'s economy. Markets, Banks, and trade help.` });
                }
                break;

            case 'domination':
                steps.push({ type: 'tip', icon: '💡', text: '<strong>Tip: Build defenses early.</strong> When facing an aggressive opponent, invest in military units before you need them — not after war is declared.' });
                if (player.getTotalMilitary() < 15) {
                    steps.push({ type: 'warning', icon: '⚠️', text: `<strong>Weak military.</strong> Your military power (${player.getTotalMilitary()}) was too low to survive. Train units regularly.` });
                }
                if (!player.techs.includes('gunpowder')) {
                    steps.push({ type: 'tip', icon: '💡', text: '<strong>Tip:</strong> Research Gunpowder — it provides +5 military power and unlocks stronger units.' });
                }
                if (player.wonders.length === 0 || !player.wonders.includes('greatWall')) {
                    steps.push({ type: 'tip', icon: '💡', text: '<strong>Tip:</strong> Build the Great Wall wonder for +15 defense bonus in all combat.' });
                }
                break;

            case 'diplomatic':
                steps.push({ type: 'tip', icon: '💡', text: '<strong>Tip: Break their alliances.</strong> Declare war on a civ allied with the leader to break diplomatic progress. Espionage can also damage relations between civs.' });
                const hostileRelations = Object.values(player.relations).filter(r => r.status === 'hostile' || r.status === 'war').length;
                if (hostileRelations > 0) {
                    steps.push({ type: 'warning', icon: '⚠️', text: `<strong>Too many enemies.</strong> You had ${hostileRelations} hostile/war relation(s). Maintain peaceful relations or at least neutrality with most civs.` });
                }
                break;
        }

        // General defeat observations
        if (!player.alive) {
            steps.push({ type: 'negative', icon: '☠️', text: '<strong>Your civilization was conquered.</strong> You were eliminated before the game ended. Survival should always be the first priority.' });
        }

        return steps;
    }

    analyzeGeneralPerformance(player, isPlayerWin) {
        const steps = [];

        // Economy analysis
        if (player.goldRate <= 0) {
            steps.push({ type: 'warning', icon: '📉', text: '<strong>Negative gold income.</strong> Your economy was in deficit. Build Markets and Banks, or switch to a government with gold bonuses (Republic, Democracy).' });
        }

        // War weariness
        if (player.warWeariness > 5) {
            steps.push({ type: 'warning', icon: '😩', text: `<strong>High war weariness (${Math.floor(player.warWeariness)}).</strong> Extended wars drain gold. End conflicts quickly or avoid prolonged multi-front wars.` });
        }

        // Tech tree progress
        const totalTechs = Object.keys(TECHS).length;
        const techPct = Math.round((player.techs.length / totalTechs) * 100);
        if (techPct < 30 && this.game.turn > 30) {
            steps.push({ type: isPlayerWin ? 'tip' : 'warning', icon: '🔬', text: `<strong>Low tech coverage (${techPct}%).</strong> You researched ${player.techs.length}/${totalTechs} technologies. More research opens stronger buildings and units.` });
        } else if (techPct >= 70) {
            steps.push({ type: 'positive', icon: '🎓', text: `<strong>Tech leader (${techPct}%).</strong> You researched ${player.techs.length}/${totalTechs} technologies — a strong knowledge base.` });
        }

        // Buildings
        if (player.buildings.length < 3 && this.game.turn > 20) {
            steps.push({ type: isPlayerWin ? 'tip' : 'warning', icon: '🏗️', text: `<strong>Few buildings (${player.buildings.length}).</strong> Buildings compound over time — build early and often for resource advantages.` });
        }

        // Wonders
        if (player.wonders.length > 0 && isPlayerWin) {
            steps.push({ type: 'positive', icon: '🏛️', text: `<strong>Wonder builder.</strong> You completed ${player.wonders.length} wonder(s): ${player.wonders.map(w => WONDERS[w]?.name || w).join(', ')}.` });
        } else if (player.wonders.length === 0 && !isPlayerWin) {
            steps.push({ type: 'tip', icon: '💡', text: '<strong>Tip: Build wonders.</strong> Wonders give permanent powerful bonuses. Prioritize ones that match your strategy.' });
        }

        // Nukes used (regardless of outcome)
        if (player.nukesUsed > 2) {
            steps.push({ type: 'warning', icon: '☢️', text: `<strong>Heavy nuclear use (${player.nukesUsed} strikes).</strong> Nukes make ALL other civs hostile. Use sparingly or be prepared for total war.` });
        }

        // Population
        if (player.population >= 25) {
            steps.push({ type: 'positive', icon: '👥', text: `<strong>Population powerhouse (${player.population}).</strong> High population supports more food consumption but reflects strong growth.` });
        } else if (player.population < 8 && this.game.turn > 25) {
            steps.push({ type: isPlayerWin ? 'tip' : 'warning', icon: '👥', text: `<strong>Low population (${player.population}).</strong> Build Farms and ensure food surplus to grow. Population drives all other production.` });
        }

        // Government analysis
        if (player.government === 'despotism' && player.getEra() >= 2) {
            steps.push({ type: 'tip', icon: '🏛️', text: '<strong>Tip: Upgrade government.</strong> You stayed on Despotism too long. Republic, Monarchy, or Democracy provide much better bonuses.' });
        }

        return steps;
    }
}
