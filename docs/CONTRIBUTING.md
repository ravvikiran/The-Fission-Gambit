# 🤝 Contributing to The Fission Gambit

## Getting Started

1. Clone the repository
2. Run `node server.js`
3. Open http://localhost:3000

No dependencies to install. No build step.

---

## Project Structure

```
The Fission Gambit/
├── index.html          # Page structure
├── styles.css          # Styling (dark theme, CSS variables)
├── game-engine.js      # Core game state, rules, mechanics
├── ai-engine.js        # AI decision-making
├── save-system.js      # Client-side persistence layer
├── ui.js               # UI rendering
├── main.js             # Application controller
├── server.js           # Node.js HTTP server + REST API
├── data/               # Player data (JSON files)
│   ├── profiles.json
│   └── saves/
├── docs/               # Documentation
├── LICENSE             # MIT License
├── README.md           # Project overview
└── AGENT_CONTEXT.md    # AI assistant context
```

---

## How to Add Features

### New Building
1. Add entry to `BUILDINGS` in `game-engine.js`:
```javascript
myBuilding: { name: 'My Building', cost: { production: 50 }, effect: { goldRate: 5 }, era: 2, desc: '+5 Gold/turn' },
```
2. If it needs a tech unlock, add `'myBuilding'` to the `unlocks` array of the relevant tech in `TECHS`.

### New Technology
1. Add entry to `TECHS` in `game-engine.js`:
```javascript
myTech: { name: 'My Tech', cost: 80, era: 3, desc: 'Does something', unlocks: [], requires: ['prerequisiteTech'] },
```

### New Military Unit
1. Add entry to `MILITARY_UNITS` in `game-engine.js`:
```javascript
myUnit: { name: 'My Unit', cost: { gold: 70, production: 35 }, power: 8, era: 3 },
```

### New Wonder
1. Add entry to `WONDERS` in `game-engine.js`:
```javascript
myWonder: { name: 'My Wonder', cost: { production: 100 }, era: 3, effect: { goldRate: 10 }, desc: '+10 Gold/turn', requires: ['someTech'] },
```

### New Government
1. Add entry to `GOVERNMENTS` in `game-engine.js`:
```javascript
myGov: { name: 'My Government', era: 3, effects: { goldRate: 5, militaryBonus: -2 }, desc: '+5 Gold, -2 Military', requires: ['someTech'] },
```

### New Random Event
1. Add entry to `RANDOM_EVENTS` in `game-engine.js`:
```javascript
{ id: 'myEvent', name: 'My Event', desc: 'Something happens!', prob: 0.03, effect: (civ) => { civ.gold += 50; } },
```

### New Achievement
1. Add a check in `checkAchievements()` in `save-system.js`:
```javascript
if (someCondition) add('my_achievement', '🎯 Achievement Name', 'Description');
```

### New Player Action
1. Add method to `GameApp` class in `main.js`
2. Add corresponding button in the relevant `render*()` method in `ui.js`
3. Button should call `window.gameApp.myMethod()`

### New API Endpoint
1. Add handler in `handleAPI()` in `server.js`
2. Add corresponding `fetch()` call in `save-system.js`

---

## Code Style

- Vanilla JavaScript (ES6+), no TypeScript
- Classes for major components (GameEngine, AIEngine, GameUI, GameApp, SaveSystem)
- Constants in UPPER_SNAKE_CASE
- Methods in camelCase
- Comments for section headers, not for obvious code
- 4-space indentation
- Single quotes for strings
- Template literals for HTML generation

---

## Testing

Currently no automated tests. To manually test:
1. Start a new game
2. Play through at least 20 turns
3. Verify buildings, tech, military, and diplomacy all work
4. Reload page — verify save/load works
5. Play to victory — verify game over screen and stats update

---

## Guidelines

- Keep zero dependencies — no npm packages
- Keep the server minimal — it's just for file I/O
- All game logic stays client-side
- UI changes go in `ui.js` only
- Game rules go in `game-engine.js` only
- Don't break save compatibility without migration logic
- Test on at least Chrome and Firefox
