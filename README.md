# ⚔️ CivAI - Civilization Strategy Game

A browser-based turn-based civilization strategy game with adaptive AI opponents that change strategies mid-game, declare wars, form alliances, and even launch nuclear weapons.

## Features

- **Turn-based strategy** — manage gold, food, production, science, military, and population
- **Adaptive AI opponents** — AI evaluates the game state every few turns and switches between aggressive, economic, scientific, and balanced strategies
- **Technology tree** — research from Agriculture to Nuclear Fission and Space Travel
- **Multiple victory conditions** — Domination, Science, Economic, or Diplomatic
- **Nuclear weapons** — late-game option that devastates enemies but turns the world against you
- **Diplomacy** — trade, alliances, declarations of war
- **Player memory** — game recognizes returning players, tracks stats, achievements, and game history
- **Auto-save** — game saves every turn to a JSON file; resume anytime
- **Portable** — save data lives in the `data/` folder as JSON files, travels with the repo

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)

No other dependencies required. The server uses only Node.js built-in modules.

## How to Run

```bash
# Clone the repo
git clone <your-repo-url>
cd civ-ai-game

# Start the server
node server.js
```

Then open your browser and go to: **http://localhost:3000**

## How to Play

1. Enter your name — the game remembers you by name
2. Choose your civilization name, number of AI opponents (2-3), and difficulty
3. Each turn:
   - **Build** — construct buildings that boost resource rates
   - **Research** — unlock technologies (leads to nukes and space travel)
   - **Military** — train units to increase your power
   - **Diplomacy** — interact with other civilizations (trade, ally, war, nuke)
4. Click **End Turn** to advance — AI opponents take their actions
5. Achieve victory through one of four paths:
   - 🗡️ **Domination** — eliminate all rivals
   - 🔬 **Science** — research Space Travel
   - 💰 **Economic** — accumulate 5000 Gold
   - 🤝 **Diplomatic** — form alliances with all surviving civs

## AI Behavior

The AI evaluates its position each turn and chooses from:
- **Balanced** — default safe growth
- **Aggressive** — builds army, declares wars, uses nukes if threatened
- **Economic** — hoards gold, trades with neighbors
- **Scientific** — races for technology, aims for space victory

AI will switch strategies when:
- It gains a military advantage → goes aggressive
- A rival is close to winning → goes aggressive (may nuke)
- It's ahead in science → doubles down on research
- It's rich → pushes for economic victory

## Save Data

Player profiles and game saves are stored in the `data/` folder:
```
data/
├── profiles.json          # All player profiles, stats, achievements
└── saves/
    └── player_xxx.json    # Active game save per player
```

This data is committed with the repo so it persists across machines.

## Future: LLM Integration

The AI engine is designed for easy LLM integration. To swap rule-based AI for an LLM:

1. Open `ai-engine.js`
2. Uncomment and configure the `makeDecisionLLM()` method
3. Point it at your LLM endpoint (Gemini, OpenAI, Ollama, etc.)
4. The `serializeGameState()` method already packages game state for the prompt

Supported options:
- **Google Gemini** — free tier available
- **Ollama** — run local models for free (Llama 3, Mistral)
- **OpenAI / Anthropic** — paid API keys

## Project Structure

```
civ-ai-game/
├── index.html        # Main HTML page
├── styles.css        # All styling
├── game-engine.js    # Core game mechanics, civilizations, combat
├── ai-engine.js      # Adaptive AI decision-making (LLM-ready)
├── save-system.js    # Save/load via server API
├── ui.js             # UI rendering
├── main.js           # Game controller, player actions
├── server.js         # Node.js server for file-based saves
├── data/             # Player data (JSON files)
├── .gitignore
└── README.md
```

## License

MIT
