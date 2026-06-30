# 🏗️ The Fission Gambit — Architecture Document

## High-Level Architecture

The Fission Gambit follows a **client-heavy, server-light** architecture. All game logic executes in the browser. The server's sole responsibility is persisting data to JSON files.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                               │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Presentation Layer                          │    │
│  │   index.html (structure) + styles.css (styling) + ui.js      │    │
│  └───────────────────────────────┬──────────────────────────────┘    │
│                                  │ reads game state                    │
│  ┌───────────────────────────────▼──────────────────────────────┐    │
│  │                   Application Layer                            │    │
│  │   main.js (GameApp) — controller, routes user actions         │    │
│  └──────┬────────────────────┬───────────────────────────────────┘    │
│         │                    │                                         │
│  ┌──────▼──────┐     ┌──────▼──────┐                                │
│  │ Game Logic  │     │ AI Engine   │                                  │
│  │game-engine  │◀────│ ai-engine   │                                  │
│  │(state+rules)│     │(decisions)  │                                  │
│  └──────┬──────┘     └─────────────┘                                 │
│         │                                                             │
│  ┌──────▼──────────────┐                                             │
│  │  Persistence Layer  │                                              │
│  │  save-system.js     │─────── fetch() ──────────┐                  │
│  └─────────────────────┘                          │                  │
└───────────────────────────────────────────────────┼──────────────────┘
                                                    │
                                        ┌───────────▼───────────┐
                                        │   SERVER (Node.js)    │
                                        │   server.js           │
                                        │                       │
                                        │  ┌─────────────────┐  │
                                        │  │ Static Serving   │  │
                                        │  │ (HTML/CSS/JS)    │  │
                                        │  └─────────────────┘  │
                                        │                       │
                                        │  ┌─────────────────┐  │
                                        │  │ REST API         │  │
                                        │  │ (JSON CRUD)      │  │
                                        │  └────────┬────────┘  │
                                        └───────────┼───────────┘
                                                    │
                                        ┌───────────▼───────────┐
                                        │   FILE SYSTEM         │
                                        │   data/               │
                                        │   ├── profiles.json   │
                                        │   └── saves/*.json    │
                                        └───────────────────────┘
```

---

## Design Principles

### 1. Zero External Dependencies
- Server: only `http`, `fs`, `path` from Node.js stdlib
- Client: vanilla HTML, CSS, JavaScript — no frameworks, no bundlers
- No package.json, no npm install required

### 2. File-Based Persistence
- All data stored as JSON files in `data/`
- Human-readable, git-friendly, portable
- No database setup required

### 3. Separation of Concerns
- **game-engine.js** — pure game state and rules (no I/O, no UI)
- **ai-engine.js** — AI decision logic (reads engine state, calls engine methods)
- **ui.js** — rendering only (reads engine state, generates HTML)
- **main.js** — controller (wires everything, handles user actions)
- **save-system.js** — persistence abstraction (fetch wrapper)
- **server.js** — I/O only (serves files, reads/writes JSON)

### 4. LLM-Ready Architecture
- AI decisions go through a single interface: `makeDecision(civ)`
- `serializeGameState(civ)` packages context for LLM prompts
- Swap rule-based logic for API calls without touching other layers

### 5. Portability
- Entire game (code + data) is one folder
- Copy anywhere with Node.js and run
- No environment variables, no config files, no external services

---

## Component Details

### GameEngine (game-engine.js)
**Responsibility:** Core game state, rules, and mechanics.

**Key Classes:**
- `Civilization` — player/AI state (resources, buildings, techs, diplomacy, government, wonders)
- `GameEngine` — game-level operations (init, processTurn, attack, launchNuke, diplomacy, victory checks)

**Data Structures:**
- `BUILDINGS` — building definitions (cost, effect, era, description)
- `TECHS` — technology tree (cost, prerequisites, unlocks, bonuses)
- `MILITARY_UNITS` — unit types (cost, power, era)
- `WONDERS` — unique buildings (cost, era, effect, requirements)
- `GOVERNMENTS` — government types (era, effects, requirements)
- `RANDOM_EVENTS` — event definitions (probability, effect function)
- `VICTORY_CONDITIONS` — win condition descriptions

**Key Methods:**
| Method | Purpose |
|--------|---------|
| `init()` | Create civilizations, set difficulty, initialize relations |
| `processTurn()` | Resource collection, growth, research/build progress, events |
| `attack()` | Combat resolution with randomness |
| `launchNuke()` | Nuclear strike + diplomatic fallout |
| `proposeTrade()` | Gold transfer + relation improvement |
| `proposeAlliance()` | Alliance formation check |
| `checkVictory()` | Test all victory conditions |
| `changeGovernment()` | Switch government, apply/remove bonuses |
| `buildWonder()` | Unique building construction |
| `conductEspionage()` | Steal tech or sabotage with risk |
| `rollRandomEvent()` | Random event probability check |

---

### AIEngine (ai-engine.js)
**Responsibility:** Autonomous decision-making for AI civilizations.

**Architecture:** Single entry point `makeDecision(civ)` that orchestrates:
1. Strategy evaluation (adaptive, re-evaluated every 3-5 turns)
2. Research selection (scored by strategy)
3. Building selection (scored by strategy)
4. Military actions (unit purchase, war declaration, attacks, nukes)
5. Diplomacy (relation management, trade, alliances)

**Strategy Scoring System:**
```
Each strategy gets a score based on game state:
- aggressive: military advantage, rival near victory, has nukes
- economic: high gold rate, large treasury
- scientific: science rate lead, tech count lead
- balanced: default baseline (always gets +15)

Highest score wins. Locked for 3-5 turns to prevent oscillation.
```

**LLM Integration Point:**
```javascript
// Replace makeDecision() internals with:
async makeDecisionLLM(civ) {
    const state = this.serializeGameState(civ);
    const response = await llmCall(state);
    this.applyDecisions(civ, response);
}
```

---

### GameUI (ui.js)
**Responsibility:** Render game state to DOM.

**Pattern:** Tab-based SPA with manual DOM manipulation.

**Tabs:**
| Tab | Renders |
|-----|---------|
| Overview | Score, era, current research/build, victory progress, government, wonders |
| Build | Available buildings, wonders, government choices |
| Research | Available technologies with turn estimates |
| Military | Army composition, available units to train |
| Diplomacy | Rival civ cards with action buttons, espionage |

**Rendering Strategy:**
- Full re-render on each `render()` call (innerHTML replacement)
- No virtual DOM or diffing — acceptable for this scale
- Event handlers attached via `onclick` attributes referencing `window.gameApp`

---

### GameApp (main.js)
**Responsibility:** Application controller — wires all components.

**Lifecycle:**
```
constructor → setupLoginScreen
login → showStartScreen
startNewGame / continueGame → game loop
endTurn → AI decisions → process → save → render
handleGameOver → record stats → show results
```

**Player Action Methods:**
- `startBuild(id)`, `startResearch(id)`, `trainUnit(id)`
- `sendGift(name)`, `proposeAlliance(name)`, `declareWar(name)`
- `attackCiv(name)`, `nukeCity(name)`
- `changeGovernment(id)`, `buildWonder(id)`, `conductEspionage(name, action)`

---

### SaveSystem (save-system.js)
**Responsibility:** Client-side persistence layer.

**Operations:**
- `login(name)` — POST to register/retrieve player
- `saveGame(playerId, engine)` — serialize all state, POST to save
- `loadGame(playerId)` — GET saved state
- `deleteSave(playerId)` — DELETE save file
- `recordGameResult(playerId, result)` — update profile with game outcome
- `checkAchievements(player, result)` — unlock badges

**Serialization:** All civilization properties are explicitly listed (no blind Object.assign) to control what gets persisted.

---

### Server (server.js)
**Responsibility:** HTTP server for static files and JSON persistence API.

**Components:**
- Static file server with MIME type detection
- REST API router (manual URL parsing)
- JSON file read/write operations
- Path traversal prevention (sanitized player IDs)

**Security:**
- Player ID sanitization: `playerId.replace(/[^a-zA-Z0-9_-]/g, '')`
- No user-supplied paths reach the filesystem unsanitized
- No authentication (local/single-user design)

---

## Data Model

### Player Profile (profiles.json)
```json
{
  "player_abc123_def45": {
    "name": "Ravi",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "lastSeen": "2026-06-30T12:00:00.000Z",
    "totalSessions": 5,
    "totalGamesPlayed": 3,
    "totalWins": 1,
    "totalLosses": 2,
    "bestScore": 420,
    "achievements": [
      { "id": "first_win", "name": "🏆 First Victory", "desc": "...", "unlockedAt": "..." }
    ],
    "history": [
      { "date": "...", "civName": "Roma", "turns": 45, "won": true, "victoryType": "science", "score": 420 }
    ]
  }
}
```

### Game Save (saves/<playerId>.json)
```json
{
  "playerId": "player_abc123_def45",
  "savedAt": "2026-06-30T12:05:00.000Z",
  "turn": 23,
  "difficulty": "normal",
  "civilizations": [
    {
      "name": "Roma",
      "isPlayer": true,
      "alive": true,
      "gold": 250,
      "food": 80,
      "production": 45,
      "science": 120,
      "population": 15,
      "military": 12,
      "goldRate": 13,
      "foodRate": 6,
      "productionRate": 8,
      "scienceRate": 11,
      "buildings": ["farm", "mine", "library"],
      "techs": ["agriculture", "mining", "writing"],
      "units": ["warrior", "warrior", "archer"],
      "currentResearch": "engineering",
      "researchProgress": 20,
      "currentBuild": "university",
      "buildProgress": 15,
      "relations": {
        "Persia": { "status": "friendly", "value": 65 }
      },
      "hasNukes": false,
      "nukesUsed": 0,
      "strategy": "balanced",
      "strategyLock": 0,
      "government": "republic",
      "wonders": ["greatLibrary"],
      "warWeariness": 0,
      "goldenAgeTurns": 0,
      "espionageCooldown": 0,
      "defenseBonus": 0
    }
  ],
  "events": [...]
}
```

---

## Extension Points

| What to Add | Where to Add It |
|-------------|-----------------|
| New building | `BUILDINGS` object in game-engine.js |
| New technology | `TECHS` object in game-engine.js |
| New military unit | `MILITARY_UNITS` object in game-engine.js |
| New wonder | `WONDERS` object in game-engine.js |
| New government | `GOVERNMENTS` object in game-engine.js |
| New random event | `RANDOM_EVENTS` array in game-engine.js |
| New victory condition | `VICTORY_CONDITIONS` + `checkVictory()` in game-engine.js |
| New AI strategy | `evaluateStrategy()` in ai-engine.js |
| New player action | Method in main.js + button in ui.js |
| New API endpoint | `handleAPI()` in server.js |
| LLM integration | `makeDecisionLLM()` in ai-engine.js |
| New achievement | `checkAchievements()` in save-system.js |
| New UI tab | `index.html` tab button + `ui.js` render method |

---

## Constraints & Trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| No npm/bundler | Zero setup, one-command run | No tree-shaking, no modules, globals |
| innerHTML rendering | Simple, fast to develop | No diffing, full re-render each turn |
| File-based saves | Portable, no DB setup | Not concurrent-safe for multiple users |
| Synchronous AI | Simple execution model | Would block if LLM calls are added (need async) |
| Single save per player | Simple to manage | Can't have multiple game slots |
| Client-side game logic | Offline-capable, fast | Cheat-vulnerable (open console) |
| No authentication | Single-user local game | Anyone with URL can access |

---

## Future Architecture Considerations

### Multi-player
Would require: WebSocket server, turn synchronization, server-side game logic, authentication.

### LLM Integration
Would require: async/await in AI decision path, API key management, rate limiting, fallback to rule-based on API failure.

### Deployment
Options:
- **Local only** (current) — `node server.js`
- **Docker** — single container, mount `data/` volume
- **Cloud** — deploy to any Node.js host (Railway, Render, Fly.io)
- **Static + Serverless** — serve HTML from CDN, API via Lambda/Functions
