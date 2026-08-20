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

// ============================================
// WONDERS - Unique mega-buildings (only one civ can build each)
// ============================================
const WONDERS = {
    greatLibrary: { name: 'Great Library', cost: { production: 80 }, era: 1, effect: { scienceRate: 8 }, desc: '+8 Science/turn', requires: ['writing'] },
    colosseum: { name: 'Colosseum', cost: { production: 70 }, era: 1, effect: { goldRate: 5, militaryBonus: 3 }, desc: '+5 Gold/turn, +3 Military', requires: ['currency'] },
    greatWall: { name: 'Great Wall', cost: { production: 90 }, era: 2, effect: { defenseBonus: 15 }, desc: '+15 Defense in combat', requires: ['engineering'] },
    oxfordUniversity: { name: 'Oxford University', cost: { production: 110 }, era: 3, effect: { scienceRate: 12 }, desc: '+12 Science/turn', requires: ['education'] },
    bigBen: { name: 'Big Ben', cost: { production: 120 }, era: 4, effect: { goldRate: 20 }, desc: '+20 Gold/turn', requires: ['economics'] },
    manhattan: { name: 'Manhattan Project', cost: { production: 150 }, era: 6, effect: { nukeCostReduction: true }, desc: 'Nukes cost 50% less', requires: ['nuclearFission'] },
};

// ============================================
// GOVERNMENTS - Choose a government type for bonuses
// ============================================
const GOVERNMENTS = {
    despotism: { name: 'Despotism', era: 0, effects: { militaryBonus: 2, goldRate: -1 }, desc: '+2 Military, -1 Gold/turn (Default)' },
    republic: { name: 'Republic', era: 1, effects: { goldRate: 3, scienceRate: 2 }, desc: '+3 Gold/turn, +2 Science/turn', requires: ['writing'] },
    monarchy: { name: 'Monarchy', era: 2, effects: { productionRate: 3, militaryBonus: 3 }, desc: '+3 Production/turn, +3 Military', requires: ['philosophy'] },
    democracy: { name: 'Democracy', era: 4, effects: { goldRate: 5, scienceRate: 5, militaryBonus: -3 }, desc: '+5 Gold, +5 Science, -3 Military', requires: ['economics'] },
    communism: { name: 'Communism', era: 4, effects: { productionRate: 8, foodRate: 3, goldRate: -3 }, desc: '+8 Production, +3 Food, -3 Gold', requires: ['industrialization'] },
    theocracy: { name: 'Theocracy', era: 2, effects: { militaryBonus: 5, goldRate: 2, scienceRate: -2 }, desc: '+5 Military, +2 Gold, -2 Science', requires: ['philosophy'] },
};

// ============================================
// RANDOM EVENTS - Triggered each turn with small probability
// ============================================
const RANDOM_EVENTS = [
    { id: 'goldenAge', name: 'Golden Age', desc: 'A period of prosperity!', prob: 0.04, effect: (civ) => { if (civ.goldenAgeTurns <= 0) { civ.goldenAgeTurns = 5; } else { civ.goldenAgeTurns = 5; } } },
    { id: 'plague', name: 'Plague', desc: 'Disease sweeps the land!', prob: 0.03, effect: (civ) => { civ.population = Math.max(3, civ.population - Math.floor(civ.population * 0.2)); } },
    { id: 'barbarianRaid', name: 'Barbarian Raid', desc: 'Raiders attack the borders!', prob: 0.05, effect: (civ) => { civ.gold = Math.max(0, civ.gold - 30); civ.military = Math.max(0, civ.military - 2); } },
    { id: 'tradeWindfall', name: 'Trade Windfall', desc: 'Merchants bring riches!', prob: 0.04, effect: (civ) => { civ.gold += 80; } },
    { id: 'scientificBreakthrough', name: 'Scientific Breakthrough', desc: 'Eureka! Research accelerated!', prob: 0.03, effect: (civ) => { if (civ.currentResearch) civ.researchProgress += 20; } },
    { id: 'harvest', name: 'Bountiful Harvest', desc: 'The farms overflow with food!', prob: 0.05, effect: (civ) => { civ.food += 50; } },
    { id: 'earthquake', name: 'Earthquake', desc: 'An earthquake damages infrastructure!', prob: 0.02, effect: (civ) => { civ.production = Math.max(0, civ.production - 20); } },
    { id: 'refugees', name: 'Refugees Arrive', desc: 'Displaced people seek shelter.', prob: 0.03, effect: (civ) => { civ.population += 2; civ.food -= 10; } },
];

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

        // Government
        this.government = 'despotism';

        // Wonders
        this.wonders = [];

        // War weariness
        this.warWeariness = 0; // increases each turn at war, costs gold

        // Golden Age tracking
        this.goldenAgeTurns = 0;

        // Espionage cooldown
        this.espionageCooldown = 0;

        // Defense bonus from wonders/buildings
        this.defenseBonus = 0;

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
               (this.wonders.length * 25) + Math.floor(this.gold / 10);
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

        // Clamp aiCount to available names
        const clampedAiCount = Math.min(Math.max(1, aiCount), AI_CIV_NAMES.length);

        // Create player
        this.player = new Civilization(playerName, true);
        this.applyGovernmentEffects(this.player, 'despotism');
        this.civilizations.push(this.player);

        // Create AI civs
        const shuffled = [...AI_CIV_NAMES].sort(() => Math.random() - 0.5);
        for (let i = 0; i < clampedAiCount; i++) {
            const ai = new Civilization(shuffled[i], false);
            this.applyGovernmentEffects(ai, 'despotism');
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

    applyGovernmentEffects(civ, govId) {
        const gov = GOVERNMENTS[govId];
        if (!gov) return;
        Object.entries(gov.effects).forEach(([key, val]) => {
            if (key === 'militaryBonus') civ.military = Math.max(0, civ.military + val);
            else if (civ[key] !== undefined) civ[key] += val;
        });
    }

    addEvent(type, message) {
        this.events.unshift({ turn: this.turn, type, message });
        if (this.events.length > 50) this.events.pop();
    }

    processTurn(civ) {
        if (!civ.alive) return;

        // Collect resources (with Golden Age bonus if active)
        const goldenAgeGoldBonus = civ.goldenAgeTurns > 0 ? 5 : 0;
        const goldenAgeFoodBonus = civ.goldenAgeTurns > 0 ? 2 : 0;
        civ.gold += civ.goldRate + goldenAgeGoldBonus;
        civ.food += civ.foodRate + goldenAgeFoodBonus;
        civ.production += civ.productionRate;
        civ.science += civ.scienceRate;

        // War weariness — costs gold for each turn at war
        const atWar = Object.values(civ.relations).filter(r => r.status === 'war').length;
        if (atWar > 0) {
            civ.warWeariness += atWar;
            const wearinessCost = Math.floor(civ.warWeariness * 2);
            civ.gold -= wearinessCost;
            if (civ.gold < 0) civ.gold = 0;
        } else {
            civ.warWeariness = Math.max(0, civ.warWeariness - 1);
        }

        // Golden Age bonus applied during resource collection above, countdown here
        if (civ.goldenAgeTurns > 0) {
            civ.goldenAgeTurns--;
            if (civ.goldenAgeTurns === 0) {
                if (civ.isPlayer) this.addEvent('game', `${civ.name}: The Golden Age has ended.`);
            }
        }

        // Espionage cooldown
        if (civ.espionageCooldown > 0) civ.espionageCooldown--;

        // Random events (small chance each turn)
        this.rollRandomEvent(civ);

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
        const defendPower = defender.getTotalMilitary() + (defender.defenseBonus || 0);
        const attackRoll = attackPower * (0.7 + Math.random() * 0.6);
        const defendRoll = defendPower * (0.7 + Math.random() * 0.6);

        let result;
        if (attackRoll > defendRoll) {
            const damage = Math.floor((attackRoll - defendRoll) / 2);
            this.applyMilitaryDamage(defender, damage);
            defender.population = Math.max(1, defender.population - Math.floor(damage / 3));
            defender.gold = Math.max(0, defender.gold - damage * 5);
            // Attacker takes reduced losses
            this.applyMilitaryDamage(attacker, Math.floor(damage / 4));

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
            this.applyMilitaryDamage(attacker, damage);
            result = { winner: defender.name, loser: attacker.name, conquered: false, damage };
            this.addEvent('war', `🛡️ ${defender.name} repelled an attack from ${attacker.name}!`);
        }

        return result;
    }

    // Apply military damage by first reducing base military, then removing units
    applyMilitaryDamage(civ, damage) {
        let remaining = damage;

        // First reduce base military
        const baseDmg = Math.min(civ.military, remaining);
        civ.military = Math.max(0, civ.military - baseDmg);
        remaining -= baseDmg;

        // Then remove weakest units until damage is absorbed
        while (remaining > 0 && civ.units.length > 0) {
            // Sort by power ascending, remove weakest first
            civ.units.sort((a, b) => (MILITARY_UNITS[a]?.power || 0) - (MILITARY_UNITS[b]?.power || 0));
            const unitId = civ.units[0];
            const unit = MILITARY_UNITS[unitId];
            if (unit) {
                remaining -= unit.power;
            }
            civ.units.shift();
        }
    }

    launchNuke(attacker, defender) {
        if (!attacker.hasNukes || !attacker.alive || !defender.alive) return null;

        attacker.nukesUsed++;
        // Remove one nuke from the attacker's units
        const nukeIndex = attacker.units.indexOf('nuke');
        if (nukeIndex !== -1) {
            attacker.units.splice(nukeIndex, 1);
        }

        const damage = 30 + Math.floor(Math.random() * 20);

        defender.population = Math.max(1, defender.population - Math.floor(damage / 3));
        this.applyMilitaryDamage(defender, damage);
        defender.production = Math.max(0, defender.production - Math.floor(damage / 2));
        defender.gold = Math.max(0, defender.gold - damage * 10);

        // All other civs become hostile to the nuke user
        for (const civ of this.civilizations) {
            if (civ !== attacker && civ.alive) {
                if (civ.relations[attacker.name]) {
                    civ.relations[attacker.name].value = Math.max(0, civ.relations[attacker.name].value - 40);
                    if (civ.relations[attacker.name].value < 20) {
                        civ.relations[attacker.name].status = 'hostile';
                    }
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

    // --- NEW MECHANICS ---

    rollRandomEvent(civ) {
        for (const event of RANDOM_EVENTS) {
            if (Math.random() < event.prob) {
                event.effect(civ);
                this.addEvent('game', `${civ.isPlayer ? '🎲 ' : ''}${civ.name}: ${event.name} — ${event.desc}`);
                break; // Only one event per turn per civ
            }
        }
    }

    changeGovernment(civ, govId) {
        const gov = GOVERNMENTS[govId];
        if (!gov) return false;
        if (gov.requires && !gov.requires.every(r => civ.techs.includes(r))) return false;
        if (gov.era > civ.getEra()) return false;

        // Remove old government effects
        const oldGov = GOVERNMENTS[civ.government];
        if (oldGov) {
            Object.entries(oldGov.effects).forEach(([key, val]) => {
                if (key === 'militaryBonus') civ.military = Math.max(0, civ.military - val);
                else if (civ[key] !== undefined) civ[key] = Math.max(0, civ[key] - val);
            });
        }

        // Apply new government effects
        civ.government = govId;
        Object.entries(gov.effects).forEach(([key, val]) => {
            if (key === 'militaryBonus') civ.military = Math.max(0, civ.military + val);
            else if (civ[key] !== undefined) civ[key] = Math.max(0, civ[key] + val);
        });

        this.addEvent('game', `${civ.name} adopted ${gov.name} as their government!`);
        return true;
    }

    buildWonder(civ, wonderId) {
        const wonder = WONDERS[wonderId];
        if (!wonder) return false;
        if (!civ.canAfford(wonder.cost)) return false;
        if (wonder.requires && !wonder.requires.every(r => civ.techs.includes(r))) return false;

        // Check if any civ already built this wonder
        for (const c of this.civilizations) {
            if (c.wonders.includes(wonderId)) return false;
        }

        civ.spend(wonder.cost);
        civ.wonders.push(wonderId);

        // Apply wonder effects
        Object.entries(wonder.effect).forEach(([key, val]) => {
            if (key === 'defenseBonus') civ.defenseBonus += val;
            else if (key === 'militaryBonus') civ.military += val;
            else if (key === 'nukeCostReduction') { /* handled in unit purchase */ }
            else if (civ[key] !== undefined) civ[key] += val;
        });

        this.addEvent('build', `🏛️ ${civ.name} completed the wonder: ${wonder.name}!`);
        return true;
    }

    conductEspionage(spy, target, action) {
        if (spy.espionageCooldown > 0) return { success: false, reason: 'Espionage on cooldown' };
        if (spy.gold < 75) return { success: false, reason: 'Need 75 gold for espionage' };

        spy.gold -= 75;
        spy.espionageCooldown = 5; // 5 turn cooldown

        const successChance = action === 'stealTech' ? 0.4 : 0.5;
        const success = Math.random() < successChance;

        if (action === 'stealTech') {
            if (success) {
                // Find a tech target has that spy doesn't
                const stealable = target.techs.filter(t => !spy.techs.includes(t));
                if (stealable.length > 0) {
                    const stolen = stealable[Math.floor(Math.random() * stealable.length)];
                    spy.techs.push(stolen);
                    const tech = TECHS[stolen];
                    if (tech?.militaryBonus) spy.military += tech.militaryBonus;
                    if (tech?.scienceBonus) spy.scienceRate += tech.scienceBonus;
                    if (tech?.enablesNukes) spy.hasNukes = true;
                    this.addEvent('science', `🕵️ ${spy.name} stole ${TECHS[stolen]?.name} from ${target.name}!`);
                    // Getting caught damages relations
                    if (Math.random() < 0.5 && target.relations[spy.name]) {
                        target.relations[spy.name].value = Math.max(0, target.relations[spy.name].value - 20);
                        if (target.relations[spy.name].value < 30) target.relations[spy.name].status = 'hostile';
                    }
                    return { success: true, stolen: TECHS[stolen]?.name };
                }
            }
            this.addEvent('game', `🕵️ ${spy.name}'s spy mission against ${target.name} failed.`);
            return { success: false, reason: 'Mission failed' };
        }

        if (action === 'sabotage') {
            if (success) {
                const damage = 10 + Math.floor(Math.random() * 20);
                target.production = Math.max(0, target.production - damage);
                target.buildProgress = Math.max(0, target.buildProgress - 5);
                this.addEvent('war', `🕵️ ${spy.name} sabotaged ${target.name}'s infrastructure! (-${damage} production)`);
                if (Math.random() < 0.4 && target.relations[spy.name]) {
                    target.relations[spy.name].value = Math.max(0, target.relations[spy.name].value - 25);
                    if (target.relations[spy.name].value < 20) target.relations[spy.name].status = 'hostile';
                }
                return { success: true, damage };
            }
            this.addEvent('game', `🕵️ ${spy.name}'s sabotage attempt against ${target.name} was foiled.`);
            return { success: false, reason: 'Mission failed' };
        }

        return { success: false, reason: 'Unknown action' };
    }
}
