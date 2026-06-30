# CivAI - Project Context for AI Assistants

## What is this project?

This is a browser-based, turn-based civilization strategy game inspired by Sid Meier's Civilization series and the CivBench AI research experiment (where AI models played Civ VI and chose to build/use nuclear weapons even when peaceful victory was available).

The game pits a human player against 1-3 AI opponents. Each civilization manages resources, researches technology, builds infrastructure, trains military units, and engages in diplomacy. The AI adapts its strategy dynamically based on the game state.

## Core Design Philosophy

1. **Zero external dependencies** — The server uses only Node.js built-in modules. The frontend is vanilla HTML/CSS/JS (no frameworks).
2. **File-based persistence** — Player data and game saves are stored as JSON files in the `data/` folder. No database, no localStorage.
3. **LLM-ready architecture** — The AI decision-making is behind a clean interface in `ai-engine.js`. The rule-based system can be swapped for LLM API calls without touching the rest of the codebase.
4. **Portable** — The entire game (including save data) lives in one folder and can be moved, cloned, or deployed anywhere with Node.js.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (UI)                       │
│  index.html + styles.css + ui.js + main.js          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + REST API
┌──────────────────────▼──────────────────────────────┐
│                 server.js (Node.js)                   │
│  - Serves static files                               │
│  - REST API: /api/profiles, /api/saves/:id          │
│  - Reads/writes JSON files in data/                  │
└──────────────────────┬──────────────────────────────┘
                       │ File I/O
┌──────────────────────▼──────────────────────────────┐
│                  data/ folder                         │
│  - profiles.json (all player profiles)               │
│  - saves/<playerId>.json (active game saves)         │
└─────────────────────────────────────────────────────┘
```

## File Responsibilities

| File | Purpose |
|------|---------|
| `index.html` | Page structure, screen layout (login, start, game, gameover) |
| `styles.css` | All styling — dark theme, responsive, CSS variables for theming |
| `game-engine.js` | Core game state: Civilization class, GameEngine class, resource management, combat, diplomacy, victory conditions, tech tree, buildings, military units |
| `ai-engine.js` | AI decision-making: strategy evaluation, research/build/military/diplomacy choices. Contains LLM integration hook (commented out) |
| `save-system.js` | Client-side save/load via fetch calls to server API. Player profiles, achievements, game state serialization |
| `ui.js` | GameUI class — renders all tabs (overview, build, research, military, diplomacy), resource bar, event log |
| `main.js` | GameApp class — controller that wires engine + AI + UI + save system. Handles player actions (build, research, train, attack, nuke, diplomacy) |
| `server.js` | Node.js HTTP server — serves static files + REST API for JSON persistence |
| `data/profiles.json` | All registered players (keyed by generated ID) |
| `data/saves/*.json` | Per-player game save files (one active save per player) |

## Game Mechanics

### Resources
- **Gold** — currency for units, trade, and espionage
- **Food** — feeds population; surplus grows population
- **Production** — used to construct buildings and wonders
- **Science** — accumulated to complete research
- **Military** — base power + unit power + government/tech bonuses
- **Population** — grows from food; consumed each turn

### Technology Tree (7 eras: Ancient → Atomic)
Key path to nukes: Mining → Engineering → Gunpowder → Industrialization → Electricity → Rocketry → Nuclear Fission
Key path to science victory: ... → Rocketry → Computers → Space Travel

### Victory Conditions
1. **Domination** — eliminate all rival civilizations
2. **Science** — research Space Travel technology
3. **Economic** — accumulate 5000 Gold
4. **Diplomatic** — achieve Allied status with all surviving civs

### Wonders (unique, one per world)
Great Library, Colosseum, Great Wall, Oxford University, Big Ben, Manhattan Project

### Governments
Despotism (default), Republic, Monarchy, Theocracy, Democracy, Communism — each with unique bonuses/penalties

### Espionage
- Steal Tech (40% success, 75 gold, 5-turn cooldown)
- Sabotage (50% success, 75 gold, 5-turn cooldown)
- Risk of detection damages relations

### Random Events
Golden Age, Plague, Barbarian Raid, Trade Windfall, Scientific Breakthrough, Bountiful Harvest, Earthquake, Refugees Arrive

### War Weariness
Each turn at war increases weariness, costing weariness × 2 gold per turn. Decreases by 1 when at peace.

### AI Strategy System
The AI evaluates game state every 3-5 turns and picks from:
- `balanced` — default safe growth
- `aggressive` — military buildup, war declarations, nuke usage
- `economic` — gold focus, trading, alliance building
- `scientific` — tech racing, science buildings

Strategy switches are triggered by: military advantage, rival approaching victory, science lead, wealth accumulation.

### Combat
- Attack power = total military * random(0.7-1.3)
- Defender advantage built in
- Nukes deal massive damage + turn all other civs hostile toward user

### Diplomacy States
`neutral` → `friendly` → `allied` (via gifts/trade)
`neutral` → `hostile` → `war` (via aggression/nukes)

## API Endpoints (server.js)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/profiles` | Get all player profiles |
| POST | `/api/profiles` | Login/register (body: `{ name }`) |
| PUT | `/api/profiles/:id` | Update player profile |
| GET | `/api/saves/:playerId` | Load saved game |
| POST | `/api/saves/:playerId` | Save game state |
| DELETE | `/api/saves/:playerId` | Delete saved game |

## How to Run

```bash
node server.js
# Open http://localhost:3000
```

## Adding New Features — Guidelines

1. **New buildings** — Add to `BUILDINGS` object in `game-engine.js`. Include `name`, `cost`, `effect`, `era`, `desc`. Then add a corresponding tech unlock in `TECHS` if needed.
2. **New technologies** — Add to `TECHS` object. Include `requires` array for prerequisites.
3. **New units** — Add to `MILITARY_UNITS` object. Set `era` for availability.
4. **New victory condition** — Add check in `GameEngine.checkVictory()`, update `VICTORY_CONDITIONS` object, update overview panel in `ui.js`.
5. **New AI behavior** — Modify `AIEngine.evaluateStrategy()` for new strategy types, or add conditions in `chooseMilitaryAction()` / `chooseDiplomacy()`.
6. **UI changes** — All rendering is in `ui.js`. Each tab has its own `render*()` method.
7. **New API endpoints** — Add to `handleAPI()` in `server.js`.

## LLM Integration (Future)

To replace rule-based AI with an LLM:
1. In `ai-engine.js`, uncomment and implement `makeDecisionLLM(civ)`
2. Use `serializeGameState(civ)` to build the prompt payload
3. Parse LLM response and apply decisions
4. Options: Google Gemini (free tier), Ollama (local, free), OpenAI/Anthropic (paid)

The interface stays the same — `makeDecision(civ)` is called each turn per AI civ.

## Key Design Decisions

- No npm/package.json — keeps it simple, no install step
- Server uses only `http`, `fs`, `path` from Node.js stdlib
- All game logic runs client-side; server is only for persistence
- AI decisions are synchronous (rule-based) but structured for async LLM calls
- Save happens every turn automatically (non-blocking)
- Player identified by name (case-insensitive match)
