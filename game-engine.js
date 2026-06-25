// ============================================
// GAME ENGINE - Core game state and mechanics
// ============================================

const ERAS = ['Ancient', 'Classical', 'Medieval', 'Renaissance', 'Industrial', 'Modern', 'Atomic'];

const BUILDINGS = {
    farm: { name: 'Farm', cost: { production: 20 }, effect: { foodRate: 3 }, era: 0, desc: '+3 Food/turn' },
    mine: { name: 'Mine', cost: { production: 25 }, effect: { productionRate: 3 }, era: 0, desc: '+3 Production/turn' },
    market: { name: 'Market', cost: { production: 30 }, effect: { goldRate: 5 }, era: 0, desc: '+5 Gold/turn' },
    library: { name: 'Library', cost: { production: 40 }, effect: { scienceRate: 3 }, era: 1, desc: '+3 Science/turn' },
    temple: { name: 'Temple', cost: { production: 35 }, effect: { goldRate: 3, foodRate: 1 }, era: 1, desc: '+3 Gold, +1 Food/turn' },
    workshop: { name: 'Workshop', cost: { production: 50 }, effect: { productionRate: 5 }, era: 2, desc: '+5 Production/turn' },
    university: { name: 'University', cost: { production: 60 }, effect: { scienceRate: 6 }, era: 2, desc: '+6 Science/turn' },
    bank: { name: 'Bank', cost: { production: 55 }, effect: { goldRate: 8 }, era: 3, desc: '+8 Gold/turn' },
    factory: { name: 'Factory', cost: { production: 80 }, effect: { productionRate: 10 }, era: 4, desc: '+10 Production/turn' },
    lab: { name: 'Research Lab', cost: { production: 100 }, effect: { scienceRate: 12 }, era: 4, desc: '+12 Science/turn' },
    stockExchange: { name: 'Stock Exchange', cost: { production: 90 }, effect: { goldRate: 15 }, era: 5, desc: '+15 Gold/turn' },
    nuclearPlant: { name: 'Nuclear Plant', cost: { production: 120 }, effect: { productionRate: 15, scienceRate: 5 }, era: 6, desc: '+15 Prod, +5 Science/turn' },
};

const TECHS = {
    agriculture: { name: 'Agriculture', cost: 20, era: 0, desc: 'Unlocks Farms', unlocks: ['farm'] },
    mining: { name: 'Mining', cost: 25, era: 0, desc: 'Unlocks Mines', unlocks: ['mine'] },
    currency: { name: 'Currency', cost: 30, era: 0, desc: 'Unlocks Markets', unlocks: ['market'] },
    writing: { name: 'Writing', cost: 40, era: 1, desc: 'Unlocks Libraries', unlocks: ['library'], requires: ['agriculture'] },
    philosophy: { name: 'Philosophy', cost: 45, era: 1, desc: 'Unlocks Temples', unlocks: ['temple'], requires: ['writing'] },
    engineering: { name: 'Engineering', cost: 55, era: 2, desc: 'Unlocks Workshops', unlocks: ['workshop'], requires: ['mining'] },
    education: { name: 'Education', cost: 60, era: 2, desc: 'Unlocks Universities', unlocks: ['university'], requires: ['writing'] },
    economics: { name: 'Economics', cost: 70, era: 3, desc: 'Unlocks Banks', unlocks: ['bank'], requires: ['currency'] },
    gunpowder: { name: 'Gunpowder', cost: 65, era: 3, desc: '+5 Military Power', unlocks: [], requires: ['engineering'], militaryBonus: 5 },
    industrialization: { name: 'Industrialization', cost: 90, era: 4, desc: 'Unlocks Factories', unlocks: ['factory'], requires: ['engineering', 'economics'] },
    electricity: { name: 'Electricity', cost: 100, era: 4, desc: 'Unlocks Research Labs', unlocks: ['lab'], requires: ['industrialization'] },
    rocketry: { name: 'Rocketry', cost: 120, era: 5, desc: 'Path to Space Victory', unlocks: ['stockExchange'], requires: ['electricity'] },
    computers: { name: 'Computers', cost: 130, era: 5, desc: '+20 Science/turn', unlocks: [], requires: ['electricity'], scienceBonus: 20 },
    nuclearFission: { name: 'Nuclear Fission', cost: 150, era: 6, desc: 'Unlocks Nukes!', unlocks: ['nuclearPlant'], requires: ['rocketry'], enablesNukes: true },
    spaceTravel: { name: 'Space Travel', cost: 200, era: 6, desc: 'Science Victory!', unlocks: [], requires: ['rocketry', 'computers'], scienceVictory: true },
};

const MILITARY_UNITS = {
    warrior: { name: 'Warriors', cost: { gold: 20, production: 10 }, power: 2, era: 0 },
    archer: { name: 'Archers', cost: { gold: 30, production: 15 }, power: 3, era: 1 },
    knight: { name: 'Knights', cost: { gold: 50, production: 25 }, power: 5, era: 2 },
    musketeer: { name: 'Musketeers', cost: { gold: 60, production: 30 }, power: 7, era: 3 },
    artillery: { name: 'Artillery', cost: { gold: 80, production: 40 }, power: 10, era: 4 },
    tank: { name: 'Tanks', cost: { gold: 100, production: 50 }, power: 15, era: 5 },
    nuke: { name: 'Nuclear Missile', cost: { gold: 200, production: 100 }, power: 50, era: 6, isNuke: true },
};

const AI_CIV_NAMES = ['Persia', 'Egypt', 'China', 'Greece', 'Aztec', 'Japan', 'India', 'Viking'];

const VICTORY_CONDITIONS = {
    domination: 'Conquer all rival civilizations',
    science: 'Research Space Travel technology',
    economic: 'Accumulate 5000 Gold',
    diplomatic: 'Achieve Allied status with all surviving civs',
};

class Civilization {
    constructor(name, isPlayer = false) {
        this.name = name;
        this.isPlayer = isPlayer;
        this.alive = true;

        // Resources
        this.gold = 100;
        this.food = 50;
        this.production = 30;
        this.science = 0;
        this.population = 10;
        this.military = 5;

        // Rates (per turn)
        this.goldRate = 5;
        this.foodRate = 3;
        this.productionRate = 3;
        this.scienceRate = 2;

        // Progress
        this.buildings = [];
        this.techs = [];
        this.units = [];
        this.currentResearch = null;
        this.researchProgress = 0;
        this.currentBuild = null;
        this.buildProgress = 0;

        // Diplomacy
        this.relations = {}; // civName -> { status, value }
        this.hasNukes = false;
        this.nukesUsed = 0;

        // AI state
        this.strategy = 'balanced'; // balanced, aggressive, economic, scientific
        this.strategyLock = 0; // turns remaining before strategy can change
    }

    getEra() {
        const techEras = this.techs.map(t => TECHS[t]?.era || 0);
        if (techEras.length === 0) return 0;
        return Math.max(...techEras);
    }

    getEraName() {
        return ERAS[this.getEra()] + ' Era';
    }

    canAfford(cost) {
        if (cost.gold && this.gold < cost.gold) return false;
        if (cost.production && this.production < cost.production) return false;
        return true;
    }

    spend(cost) {
        if (cost.gold) this.gold -= cost.gold;
        if (cost.production) this.production -= cost.production;
    }

    getTotalMilitary() {
        let total = this.military;
        this.units.forEach(u => {
            const unitDef = MILITARY_UNITS[u];
            if (unitDef) total += unitDef.power;
        });
        return total;
    }

    getScore() {
        return (this.population * 2) + (this.buildings.length * 10) +
               (this.techs.length * 15) + (this.getTotalMilitary() * 3) +
               Math.floor(this.gold / 10);
    }
}

class GameEngine {
    constructor() {
        this.turn = 1;
        this.civilizations = [];
        this.player = null;
        this.events = [];
        this.gameOver = false;
        this.winner = null;
        this.victoryType = null;
        this.difficulty = 'normal';
    }

    init(playerName, aiCount, difficulty) {
        this.difficulty = difficulty;
        this.turn = 1;
        this.events = [];
        this.gameOver = false;
        this.winner = null;
        this.civilizations = [];

        // Create player
        this.player = new Civilization(playerName, true);
        this.civilizations.push(this.player);

        // Create AI civs
        const shuffled = [...AI_CIV_NAMES].sort(() => Math.random() - 0.5);
        for (let i = 0; i < aiCount; i++) {
            const ai = new Civilization(shuffled[i], false);
            // Difficulty bonuses for AI
            if (difficulty === 'hard') {
                ai.goldRate += 3;
                ai.productionRate += 2;
                ai.scienceRate += 2;
            } else if (difficulty === 'normal') {
                ai.goldRate += 1;
                ai.productionRate += 1;
            }
            this.civilizations.push(ai);
        }

        // Set initial relations
        for (const civ of this.civilizations) {
            for (const other of this.civilizations) {
                if (civ !== other) {
                    civ.relations[other.name] = { status: 'neutral', value: 50 };
                }
            }
        }

        this.addEvent('game', `The world awakens. ${this.civilizations.length} civilizations compete for supremacy.`);
    }

    addEvent(type, message) {
        this.events.unshift({ turn: this.turn, type, message });
        if (this.events.length > 50) this.events.pop();
    }

    processTurn(civ) {
        if (!civ.alive) return;

        // Collect resources
        civ.gold += civ.goldRate;
        civ.food += civ.foodRate;
        civ.production += civ.productionRate;
        civ.science += civ.scienceRate;

        // Population growth from food
        if (civ.food >= 20 * civ.population) {
            civ.population += 1;
            civ.food -= 10 * civ.population;
            if (civ.isPlayer) this.addEvent('build', `${civ.name}: Population grew to ${civ.population}!`);
        }

        // Food consumption
        civ.food -= civ.population;
        if (civ.food < 0) {
            civ.food = 0;
            civ.population = Math.max(1, civ.population - 1);
            if (civ.isPlayer) this.addEvent('war', `${civ.name}: Famine! Population decreased.`);
        }

        // Research progress
        if (civ.currentResearch) {
            civ.researchProgress += civ.scienceRate;
            const tech = TECHS[civ.currentResearch];
            if (tech && civ.researchProgress >= tech.cost) {
                civ.techs.push(civ.currentResearch);
                if (tech.militaryBonus) civ.military += tech.militaryBonus;
                if (tech.scienceBonus) civ.scienceRate += tech.scienceBonus;
                if (tech.enablesNukes) civ.hasNukes = true;
                this.addEvent('science', `${civ.name} discovered ${tech.name}!`);
                civ.currentResearch = null;
                civ.researchProgress = 0;
            }
        }

        // Build progress
        if (civ.currentBuild) {
            civ.buildProgress += civ.productionRate;
            const building = BUILDINGS[civ.currentBuild];
            if (building && civ.buildProgress >= building.cost.production) {
                civ.buildings.push(civ.currentBuild);
                // Apply building effects
                Object.entries(building.effect).forEach(([key, val]) => {
                    if (civ[key] !== undefined) civ[key] += val;
                });
                this.addEvent('build', `${civ.name} built ${building.name}!`);
                civ.currentBuild = null;
                civ.buildProgress = 0;
            }
        }
    }

    attack(attacker, defender) {
        if (!attacker.alive || !defender.alive) return null;

        const attackPower = attacker.getTotalMilitary();
        const defendPower = defender.getTotalMilitary();
        const attackRoll = attackPower * (0.7 + Math.random() * 0.6);
        const defendRoll = defendPower * (0.7 + Math.random() * 0.6);

        let result;
        if (attackRoll > defendRoll) {
            const damage = Math.floor((attackRoll - defendRoll) / 2);
            defender.military = Math.max(0, defender.military - damage);
            defender.population = Math.max(1, defender.population - Math.floor(damage / 3));
            defender.gold = Math.max(0, defender.gold - damage * 5);
            attacker.military = Math.max(0, attacker.military - Math.floor(damage / 4));

            // Check if defender is conquered
            if (defender.getTotalMilitary() <= 0 && defender.population <= 1) {
                defender.alive = false;
                attacker.gold += Math.floor(defender.gold / 2);
                result = { winner: attacker.name, loser: defender.name, conquered: true };
                this.addEvent('war', `💀 ${defender.name} has been CONQUERED by ${attacker.name}!`);
            } else {
                result = { winner: attacker.name, loser: defender.name, conquered: false, damage };
                this.addEvent('war', `⚔️ ${attacker.name} won a battle against ${defender.name}!`);
            }
        } else {
            const damage = Math.floor((defendRoll - attackRoll) / 3);
            attacker.military = Math.max(0, attacker.military - damage);
            result = { winner: defender.name, loser: attacker.name, conquered: false, damage };
            this.addEvent('war', `🛡️ ${defender.name} repelled an attack from ${attacker.name}!`);
        }

        return result;
    }

    launchNuke(attacker, defender) {
        if (!attacker.hasNukes || !attacker.alive || !defender.alive) return null;

        attacker.nukesUsed++;
        const damage = 30 + Math.floor(Math.random() * 20);

        defender.population = Math.max(1, defender.population - Math.floor(damage / 3));
        defender.military = Math.max(0, defender.military - damage);
        defender.production = Math.max(0, defender.production - Math.floor(damage / 2));
        defender.gold = Math.max(0, defender.gold - damage * 10);

        // All other civs become hostile to the nuke user
        for (const civ of this.civilizations) {
            if (civ !== attacker && civ.alive) {
                civ.relations[attacker.name].value = Math.max(0, civ.relations[attacker.name].value - 40);
                if (civ.relations[attacker.name].value < 20) {
                    civ.relations[attacker.name].status = 'hostile';
                }
            }
        }

        this.addEvent('nuke', `☢️ ${attacker.name} launched a NUCLEAR STRIKE on ${defender.name}! Devastating damage!`);

        // Check if defender conquered
        if (defender.getTotalMilitary() <= 0 && defender.population <= 1) {
            defender.alive = false;
            this.addEvent('nuke', `💀 ${defender.name} was destroyed by nuclear annihilation!`);
        }

        return { damage, target: defender.name };
    }

    setRelation(civ1, civ2, status) {
        if (civ1.relations[civ2.name]) {
            civ1.relations[civ2.name].status = status;
            if (status === 'allied') civ1.relations[civ2.name].value = 90;
            else if (status === 'friendly') civ1.relations[civ2.name].value = 70;
            else if (status === 'hostile') civ1.relations[civ2.name].value = 20;
            else if (status === 'war') civ1.relations[civ2.name].value = 0;
        }
        if (civ2.relations[civ1.name]) {
            civ2.relations[civ1.name].status = status;
            if (status === 'allied') civ2.relations[civ1.name].value = 90;
            else if (status === 'friendly') civ2.relations[civ1.name].value = 70;
            else if (status === 'hostile') civ2.relations[civ1.name].value = 20;
            else if (status === 'war') civ2.relations[civ1.name].value = 0;
        }
    }

    proposeTrade(from, to, goldAmount) {
        if (from.gold < goldAmount) return false;
        from.gold -= goldAmount;
        to.gold += goldAmount;
        // Improve relations
        if (to.relations[from.name]) {
            to.relations[from.name].value = Math.min(100, to.relations[from.name].value + 10);
            if (to.relations[from.name].value >= 70) to.relations[from.name].status = 'friendly';
        }
        if (from.relations[to.name]) {
            from.relations[to.name].value = Math.min(100, from.relations[to.name].value + 5);
        }
        this.addEvent('peace', `${from.name} sent ${goldAmount} gold to ${to.name} as a gift.`);
        return true;
    }

    proposeAlliance(from, to) {
        const relation = to.relations[from.name];
        if (!relation || relation.value < 60) return false;
        this.setRelation(from, to, 'allied');
        this.addEvent('peace', `🤝 ${from.name} and ${to.name} formed an alliance!`);
        return true;
    }

    checkVictory() {
        const aliveCivs = this.civilizations.filter(c => c.alive);

        // Domination - only one civ left
        if (aliveCivs.length === 1) {
            this.gameOver = true;
            this.winner = aliveCivs[0];
            this.victoryType = 'domination';
            return true;
        }

        for (const civ of aliveCivs) {
            // Science victory
            if (civ.techs.includes('spaceTravel')) {
                this.gameOver = true;
                this.winner = civ;
                this.victoryType = 'science';
                return true;
            }

            // Economic victory
            if (civ.gold >= 5000) {
                this.gameOver = true;
                this.winner = civ;
                this.victoryType = 'economic';
                return true;
            }

            // Diplomatic victory - allied with all surviving civs
            const otherAlive = aliveCivs.filter(c => c !== civ);
            if (otherAlive.length > 0) {
                const allAllied = otherAlive.every(c => civ.relations[c.name]?.status === 'allied');
                if (allAllied) {
                    this.gameOver = true;
                    this.winner = civ;
                    this.victoryType = 'diplomatic';
                    return true;
                }
            }
        }

        return false;
    }

    endTurn() {
        // Process all civilizations
        for (const civ of this.civilizations) {
            this.processTurn(civ);
        }
        this.turn++;
        return this.checkVictory();
    }

    getAliveCivs() {
        return this.civilizations.filter(c => c.alive);
    }

    getAIcivs() {
        return this.civilizations.filter(c => !c.isPlayer && c.alive);
    }
}
