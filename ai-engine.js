// ============================================
// AI ENGINE - Adaptive strategy decision making
// ============================================
// Architecture: The AI decision-making is behind a clean interface.
// To add LLM integration later, replace makeDecision() internals
// with an API call that sends game state and returns actions.

class AIEngine {
    constructor(gameEngine) {
        this.game = gameEngine;
    }

    // Main entry point - can be swapped with LLM call later
    makeDecision(civ) {
        if (!civ.alive) return;

        // Step 1: Re-evaluate strategy
        this.evaluateStrategy(civ);

        // Step 2: Choose research
        this.chooseResearch(civ);

        // Step 3: Choose building
        this.chooseBuilding(civ);

        // Step 4: Choose military actions
        this.chooseMilitaryAction(civ);

        // Step 5: Diplomatic decisions
        this.chooseDiplomacy(civ);
    }

    // ADAPTIVE STRATEGY - evaluates game state each turn and may switch strategy
    evaluateStrategy(civ) {
        if (civ.strategyLock > 0) {
            civ.strategyLock--;
            return;
        }

        const aliveCivs = this.game.getAliveCivs();
        const myMilitary = civ.getTotalMilitary();
        const avgMilitary = aliveCivs.reduce((sum, c) => sum + c.getTotalMilitary(), 0) / aliveCivs.length;
        const myScience = civ.scienceRate;
        const avgScience = aliveCivs.reduce((sum, c) => sum + c.scienceRate, 0) / aliveCivs.length;
        const myGold = civ.gold;

        let scores = {
            aggressive: 0,
            economic: 0,
            scientific: 0,
            balanced: 0,
        };

        // Favor aggression if militarily superior
        if (myMilitary > avgMilitary * 1.5) scores.aggressive += 30;
        if (myMilitary > avgMilitary * 2) scores.aggressive += 20;

        // Favor aggression if someone is close to winning
        for (const other of aliveCivs) {
            if (other === civ) continue;
            if (other.techs.includes('rocketry')) scores.aggressive += 25;
            if (other.gold > 3500) scores.aggressive += 20;
        }

        // Favor economic if gold is high and growing
        if (civ.goldRate > 10) scores.economic += 20;
        if (myGold > 1000) scores.economic += 15;
        if (myGold > 2500) scores.economic += 25;

        // Favor science if already ahead
        if (myScience > avgScience * 1.3) scores.scientific += 25;
        if (civ.techs.length > aliveCivs.reduce((s, c) => s + c.techs.length, 0) / aliveCivs.length) {
            scores.scientific += 20;
        }

        // Favor balanced if no clear advantage
        scores.balanced += 15;

        // If we have nukes and someone is about to win, go aggressive
        if (civ.hasNukes) {
            for (const other of aliveCivs) {
                if (other === civ) continue;
                if (other.techs.includes('rocketry') || other.gold > 4000) {
                    scores.aggressive += 40;
                }
            }
        }

        // Pick highest scoring strategy
        const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        const oldStrategy = civ.strategy;
        civ.strategy = best[0];
        civ.strategyLock = 3 + Math.floor(Math.random() * 3); // Lock for 3-5 turns

        if (oldStrategy !== civ.strategy) {
            this.game.addEvent('science', `${civ.name} shifted strategy to ${civ.strategy}.`);
        }
    }

    chooseResearch(civ) {
        if (civ.currentResearch) return; // Already researching

        const available = Object.entries(TECHS).filter(([id, tech]) => {
            if (civ.techs.includes(id)) return false;
            if (tech.requires && !tech.requires.every(r => civ.techs.includes(r))) return false;
            return true;
        });

        if (available.length === 0) return;

        // Score each tech based on strategy
        const scored = available.map(([id, tech]) => {
            let score = 10;

            switch (civ.strategy) {
                case 'aggressive':
                    if (tech.militaryBonus) score += 30;
                    if (tech.enablesNukes) score += 50;
                    if (id === 'gunpowder') score += 25;
                    break;
                case 'economic':
                    if (tech.unlocks?.some(b => BUILDINGS[b]?.effect.goldRate)) score += 30;
                    break;
                case 'scientific':
                    if (tech.unlocks?.some(b => BUILDINGS[b]?.effect.scienceRate)) score += 30;
                    if (tech.scienceBonus) score += 40;
                    if (tech.scienceVictory) score += 60;
                    break;
                case 'balanced':
                    score += 10;
                    break;
            }

            // Prefer cheaper techs slightly
            score -= tech.cost / 20;
            // Prefer techs in current or next era
            if (tech.era <= civ.getEra() + 1) score += 10;

            return { id, score };
        });

        scored.sort((a, b) => b.score - a.score);
        civ.currentResearch = scored[0].id;
        civ.researchProgress = 0;
    }

    chooseBuilding(civ) {
        if (civ.currentBuild) return;

        const available = Object.entries(BUILDINGS).filter(([id, building]) => {
            if (civ.buildings.includes(id)) return false;
            if (building.era > civ.getEra() + 1) return false;
            // Check if unlocked by tech
            const unlockedBy = Object.entries(TECHS).find(([, t]) => t.unlocks?.includes(id));
            if (unlockedBy && !civ.techs.includes(unlockedBy[0])) return false;
            return true;
        });

        if (available.length === 0) return;

        const scored = available.map(([id, building]) => {
            let score = 10;

            switch (civ.strategy) {
                case 'aggressive':
                    if (building.effect.productionRate) score += 20;
                    break;
                case 'economic':
                    if (building.effect.goldRate) score += 30;
                    break;
                case 'scientific':
                    if (building.effect.scienceRate) score += 30;
                    break;
                case 'balanced':
                    score += 10;
                    break;
            }

            // Always value food if population is high
            if (building.effect.foodRate && civ.population > 15) score += 15;

            return { id, score };
        });

        scored.sort((a, b) => b.score - a.score);
        civ.currentBuild = scored[0].id;
        civ.buildProgress = 0;
    }

    chooseMilitaryAction(civ) {
        const era = civ.getEra();

        // Buy units based on strategy
        if (civ.strategy === 'aggressive' || (civ.strategy === 'balanced' && Math.random() < 0.3)) {
            const affordableUnits = Object.entries(MILITARY_UNITS).filter(([id, unit]) => {
                if (unit.era > era) return false;
                if (unit.isNuke && !civ.hasNukes) return false;
                return civ.canAfford(unit.cost);
            });

            if (affordableUnits.length > 0) {
                // Pick strongest affordable unit
                affordableUnits.sort((a, b) => b[1].power - a[1].power);
                const [unitId, unit] = affordableUnits[0];

                // Only buy if strategy demands it or randomly
                if (civ.strategy === 'aggressive' || Math.random() < 0.4) {
                    civ.spend(unit.cost);
                    civ.units.push(unitId);
                    this.game.addEvent('war', `${civ.name} trained ${unit.name}.`);
                }
            }
        }

        // Attack decisions
        if (civ.strategy === 'aggressive') {
            const targets = this.game.getAliveCivs().filter(c =>
                c !== civ && (civ.relations[c.name]?.status === 'war' || civ.relations[c.name]?.status === 'hostile')
            );

            for (const target of targets) {
                if (civ.getTotalMilitary() > target.getTotalMilitary() * 1.3) {
                    // Declare war if hostile
                    if (civ.relations[target.name]?.status === 'hostile') {
                        this.game.setRelation(civ, target, 'war');
                        this.game.addEvent('war', `⚔️ ${civ.name} declared WAR on ${target.name}!`);
                    }
                    // Attack
                    if (civ.relations[target.name]?.status === 'war') {
                        this.game.attack(civ, target);
                    }
                }
            }

            // Use nukes if desperate or very aggressive
            if (civ.hasNukes && civ.strategy === 'aggressive') {
                const nukeTargets = this.game.getAliveCivs().filter(c => {
                    if (c === civ) return false;
                    // Nuke if they're about to win
                    if (c.techs.includes('rocketry') || c.gold > 4000) return true;
                    // Nuke if at war and they're strong
                    if (civ.relations[c.name]?.status === 'war' && c.getTotalMilitary() > civ.getTotalMilitary()) return true;
                    return false;
                });

                if (nukeTargets.length > 0 && Math.random() < 0.3) {
                    const target = nukeTargets[0];
                    this.game.launchNuke(civ, target);
                }
            }
        }
    }

    chooseDiplomacy(civ) {
        const aliveCivs = this.game.getAliveCivs().filter(c => c !== civ);

        for (const other of aliveCivs) {
            const relation = civ.relations[other.name];
            if (!relation) continue;

            // Drift relations based on strategy
            if (civ.strategy === 'aggressive') {
                // Aggressive civs slowly become hostile
                if (relation.status === 'neutral' && Math.random() < 0.1) {
                    relation.value = Math.max(0, relation.value - 5);
                    if (relation.value < 30) relation.status = 'hostile';
                }
            } else if (civ.strategy === 'economic' || civ.strategy === 'balanced') {
                // Economic civs try to befriend
                if (relation.status === 'neutral' && Math.random() < 0.15) {
                    relation.value = Math.min(100, relation.value + 3);
                    if (relation.value > 60) relation.status = 'friendly';
                }
                // Try to trade
                if (relation.status === 'friendly' && civ.gold > 100 && Math.random() < 0.2) {
                    this.game.proposeTrade(civ, other, 20);
                }
                // Try alliance for diplomatic victory
                if (relation.value >= 70 && relation.status === 'friendly' && Math.random() < 0.15) {
                    this.game.proposeAlliance(civ, other);
                }
            }

            // All civs respond to nukes with hostility
            if (other.nukesUsed > 0 && relation.status !== 'war') {
                relation.value = Math.max(0, relation.value - 10);
                if (relation.value < 20) relation.status = 'hostile';
            }
        }
    }

    // ============================================
    // LLM INTEGRATION HOOK
    // Replace this method to use an LLM for decisions
    // ============================================
    // async makeDecisionLLM(civ) {
    //     const gameState = this.serializeGameState(civ);
    //     const response = await fetch('YOUR_LLM_ENDPOINT', {
    //         method: 'POST',
    //         headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
    //         body: JSON.stringify({
    //             prompt: `You are managing ${civ.name}. Current state: ${JSON.stringify(gameState)}. What actions should you take this turn? Return JSON with: research, build, military, diplomacy decisions.`,
    //         })
    //     });
    //     const decision = await response.json();
    //     this.applyLLMDecision(civ, decision);
    // }

    serializeGameState(civ) {
        return {
            turn: this.game.turn,
            myCiv: {
                name: civ.name,
                gold: civ.gold, food: civ.food, production: civ.production,
                science: civ.science, military: civ.getTotalMilitary(),
                population: civ.population, techs: civ.techs,
                buildings: civ.buildings, strategy: civ.strategy,
                hasNukes: civ.hasNukes,
            },
            otherCivs: this.game.getAliveCivs().filter(c => c !== civ).map(c => ({
                name: c.name,
                military: c.getTotalMilitary(),
                population: c.population,
                relation: civ.relations[c.name]?.status,
                techCount: c.techs.length,
            })),
        };
    }
}
