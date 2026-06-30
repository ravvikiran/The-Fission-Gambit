# 🔧 The Fission Gambit — Technical Flow Document

## Overview

This document describes the technical flow of the game — how data moves through the system, what triggers what, and how each component interacts.

---

## System Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                                                                  │
│  ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐  │
│  │ main.js  │──▶│game-engine│──▶│ ai-engine│──▶│  ui.js   │  │
│  │(GameApp) │   │(GameEngine│   │(AIEngine)│   │ (GameUI) │  │
│  └────┬─────┘   │ Civ class)│   └──────────┘   └──────────┘  │
│       │          └───────────┘                                   │
│       │                                                          │
│  ┌────▼──────────┐                                              │
│  │ save-system.js│────── HTTP/REST ──────┐                      │
│  │ (SaveSystem)  │                       │                      │
│  └───────────────┘                       │                      │
└──────────────────────────────────────────┼──────────────────────┘
                                           │
                              ┌─────────────▼─────────────┐
                              │       server.js            │
                              │   (Node.js HTTP Server)    │
                              │                            │
                              │  Static Files + REST API   │
                              └─────────────┬─────────────┘
                                            │
                              ┌─────────────▼─────────────┐
                              │        data/ folder        │
                              │  profiles.json             │
                              │  saves/<playerId>.json     │
                              └───────────────────────────┘
```

---

## Turn Lifecycle

Every time the player clicks "End Turn", the following sequence executes:

```
Player clicks "End Turn"
        │
        ▼
┌───────────────────────┐
│ 1. AI Decision Phase  │  (for each AI civ)
│    ai.makeDecision()  │
│    ├─ evaluateStrategy│
│    ├─ chooseResearch  │
│    ├─ chooseBuilding  │
│    ├─ chooseMilitary  │
│    └─ chooseDiplomacy │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 2. Process Turn       │  (for ALL civs including player)
│    engine.processTurn │
│    ├─ Collect resources (gold, food, prod, science)
│    ├─ War weariness calculation
│    ├─ Golden Age countdown
│    ├─ Espionage cooldown
│    ├─ Roll random events
│    ├─ Population growth / famine check
│    ├─ Research progress → tech completion
│    └─ Build progress → building completion
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 3. Victory Check      │
│    engine.checkVictory│
│    ├─ Domination (1 civ left?)
│    ├─ Science (Space Travel researched?)
│    ├─ Economic (5000 Gold?)
│    └─ Diplomatic (all allies?)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 4. Auto-Save          │
│    saveSystem.saveGame│  (async, non-blocking)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 5. Render UI          │
│    ui.render()        │  (or showGameOver if victory)
└───────────────────────┘
```

---

## Login & Session Flow

```
User enters name
        │
        ▼
POST /api/profiles { name }
        │
        ├─ Name exists? → Return existing profile (isReturning: true)
        │                  Increment totalSessions
        │
        └─ New name? → Create new profile with unique ID
                       Return new profile (isReturning: false)
        │
        ▼
Show Start Screen
  ├─ Display stats & achievements
  ├─ Check for saved game (GET /api/saves/:playerId)
  │   ├─ Save exists → Show "Continue" button
  │   └─ No save → Hide continue option
  └─ Show "New Game" form
```

---

## Save/Load Flow

### Auto-Save (every turn)
```
endTurn() called
    │
    ▼
saveSystem.saveGame(playerId, engine)
    │
    ▼
Serialize all civ states:
  - Resources, rates, progress
  - Buildings, techs, units
  - Relations, government, wonders
  - War weariness, golden age, espionage cooldown
  - Events (last 20)
    │
    ▼
POST /api/saves/:playerId  (body: serialized state)
    │
    ▼
Server writes to data/saves/<playerId>.json
```

### Load Saved Game
```
"Continue" clicked
    │
    ▼
GET /api/saves/:playerId
    │
    ▼
saveSystem.restoreGame(engine, saveData)
    │
    ▼
Reconstruct Civilization objects from saved data
Set engine.player, engine.turn, engine.events
    │
    ▼
Initialize AI engine + UI → Render
```

---

## Combat Flow

```
Player clicks "Attack" on a civ at war
        │
        ▼
engine.attack(attacker, defender)
        │
        ▼
Calculate:
  attackPower = attacker.getTotalMilitary()
  defendPower = defender.getTotalMilitary() + defender.defenseBonus
  attackRoll  = attackPower × random(0.7 - 1.3)
  defendRoll  = defendPower × random(0.7 - 1.3)
        │
        ├─ attackRoll > defendRoll (Attacker wins)
        │   ├─ damage = (attackRoll - defendRoll) / 2
        │   ├─ defender loses: military, population, gold
        │   ├─ attacker loses: military (smaller amount)
        │   └─ If defender military ≤ 0 AND population ≤ 1 → CONQUERED
        │
        └─ defendRoll ≥ attackRoll (Defender wins)
            ├─ damage = (defendRoll - attackRoll) / 3
            └─ attacker loses military
```

---

## Nuclear Strike Flow

```
Player clicks "Launch Nuke"
        │
        ▼
engine.launchNuke(attacker, defender)
        │
        ▼
damage = 30 + random(0-20)
        │
        ├─ defender loses:
        │   - population (damage/3)
        │   - military (damage)
        │   - production (damage/2)
        │   - gold (damage × 10)
        │
        ├─ ALL other civs:
        │   - relation.value toward attacker -= 40
        │   - If value < 20 → status = 'hostile'
        │
        └─ If defender military ≤ 0 AND population ≤ 1 → DESTROYED
```

---

## AI Decision Flow (per AI civ per turn)

```
makeDecision(civ)
    │
    ├─ evaluateStrategy()
    │   Score each strategy based on:
    │   - Military advantage → aggressive
    │   - Rival near victory → aggressive
    │   - Has nukes + rival winning → aggressive
    │   - High gold rate → economic
    │   - Science lead → scientific
    │   - No clear advantage → balanced
    │   Pick highest score, lock for 3-5 turns
    │
    ├─ chooseResearch()
    │   Score available techs based on strategy:
    │   - Aggressive: military techs, nukes
    │   - Economic: gold-building techs
    │   - Scientific: science techs, space travel
    │   Pick highest scored, begin research
    │
    ├─ chooseBuilding()
    │   Score available buildings based on strategy:
    │   - Match effect to strategy focus
    │   - Value food if population is high
    │   Pick highest scored, begin construction
    │
    ├─ chooseMilitaryAction()
    │   If aggressive or random chance:
    │   - Buy strongest affordable unit
    │   - If stronger than hostile target × 1.3 → declare war + attack
    │   - If has nukes + target near victory → 30% chance to nuke
    │
    └─ chooseDiplomacy()
        Based on strategy:
        - Aggressive: drift relations toward hostile
        - Economic/Balanced: drift toward friendly, send gifts, propose alliances
        - All: become hostile toward nuke users
```

---

## Espionage Flow

```
Player clicks "Steal Tech" or "Sabotage"
        │
        ▼
engine.conductEspionage(spy, target, action)
        │
        ├─ Validation:
        │   - espionageCooldown must be 0
        │   - Must have 75 gold
        │
        ├─ Deduct 75 gold, set cooldown = 5 turns
        │
        ├─ action = 'stealTech' (40% success)
        │   ├─ Success: random tech from target → spy's tech list
        │   │   Apply tech bonuses (military, science, nukes)
        │   │   50% chance of being caught → relation damage
        │   └─ Fail: "Mission failed" event
        │
        └─ action = 'sabotage' (50% success)
            ├─ Success: target loses production + build progress
            │   40% chance of being caught → relation damage
            └─ Fail: "Mission failed" event
```

---

## Government Change Flow

```
Player clicks "Adopt" on a government
        │
        ▼
engine.changeGovernment(civ, govId)
        │
        ├─ Validate: tech requirements met, era requirement met
        │
        ├─ Remove old government effects from civ stats
        │
        └─ Apply new government effects to civ stats
            - goldRate, scienceRate, productionRate, foodRate
            - militaryBonus (added to base military)
```

---

## Random Events Flow

```
processTurn() → rollRandomEvent(civ)
        │
        ▼
For each event in RANDOM_EVENTS:
    if random() < event.probability:
        Apply event.effect(civ)
        Add event to log
        BREAK (max 1 event per civ per turn)
```

---

## API Endpoints

| Method | Route | Request Body | Response | Description |
|--------|-------|-------------|----------|-------------|
| GET | `/api/profiles` | — | `{ id: profile }` | All profiles |
| POST | `/api/profiles` | `{ name }` | profile object | Login/register |
| PUT | `/api/profiles/:id` | profile fields | updated profile | Update stats |
| GET | `/api/saves/:id` | — | save data or null | Load game |
| POST | `/api/saves/:id` | game state | `{ success, savedAt }` | Save game |
| DELETE | `/api/saves/:id` | — | `{ success }` | Delete save |

---

## File I/O Patterns

- **profiles.json**: Read-modify-write on every login, game end, and profile update
- **saves/*.json**: Written every turn (overwrite), read on game continue, deleted on game end
- **Static files**: Read-only streaming via `fs.createReadStream`
- All JSON is pretty-printed (2-space indent) for debuggability
- Player IDs use timestamp + random: `player_<base36_time>_<random5>`
- Save file paths are sanitized to prevent path traversal attacks

---

## Error Handling

- Server wraps all API handlers in try/catch → returns 500 with generic error
- Client-side operations fail silently (no alerts) — game continues
- Missing save files return `null` (not an error)
- Missing profiles return 404
- Invalid JSON in request body triggers 500
