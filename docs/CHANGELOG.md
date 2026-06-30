# 📋 Changelog

All notable changes to The Fission Gambit are documented here.

---

## [1.1.0] - 2026-06-30

### Added
- **Wonders System** — 6 unique mega-buildings that only one civilization can build worldwide
  - Great Library, Colosseum, Great Wall, Oxford University, Big Ben, Manhattan Project
- **Government Types** — 6 governments with unique bonuses/penalties
  - Despotism, Republic, Monarchy, Theocracy, Democracy, Communism
- **Random Events** — 8 events that can trigger each turn
  - Golden Age, Plague, Barbarian Raid, Trade Windfall, Scientific Breakthrough, Bountiful Harvest, Earthquake, Refugees Arrive
- **Espionage System** — steal technologies or sabotage rivals (75 gold, 5-turn cooldown)
- **War Weariness** — prolonged wars now cost increasing gold per turn
- **Defense Bonus** — Great Wall and future defensive structures add to combat defense rolls
- **Golden Age mechanic** — random chance of 5-turn productivity boost

### Changed
- Combat now factors in defender's defense bonus
- Overview card shows current government and active status effects
- Build tab now includes Wonders section and Government choices
- Diplomacy tab now includes Espionage actions
- Save system now persists government, wonders, war weariness, golden age, espionage cooldown, and defense bonus

### Documentation
- Created `docs/USER_MANUAL.md` — comprehensive player guide
- Created `docs/TECHNICAL_FLOW.md` — detailed system flow diagrams
- Created `docs/ARCHITECTURE.md` — architecture and design decisions
- Created `docs/CONTRIBUTING.md` — contributor guidelines
- Created `docs/CHANGELOG.md` — this file
- Created `LICENSE` — MIT License file
- Updated `.gitignore` — proper exclusions for OS/editor/save files
- Updated `README.md` — reflects new features

---

## [1.0.0] - 2026-06-29

### Initial Release
- Turn-based civilization strategy game
- 12 buildings across 7 eras
- 15 technologies with prerequisite tree
- 7 military unit types including nuclear missiles
- 4 victory conditions (Domination, Science, Economic, Diplomatic)
- Adaptive AI with 4 strategies (balanced, aggressive, economic, scientific)
- Player profiles with stats, achievements, and game history
- Auto-save every turn with resume capability
- Node.js server with REST API for JSON persistence
- Dark theme responsive UI
- Zero external dependencies
