# 📖 The Fission Gambit — User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Game Setup](#game-setup)
3. [Resources](#resources)
4. [Building](#building)
5. [Technology](#technology)
6. [Military](#military)
7. [Diplomacy & Espionage](#diplomacy--espionage)
8. [Government](#government)
9. [Wonders](#wonders)
10. [Random Events](#random-events)
11. [Victory Conditions](#victory-conditions)
12. [Tips & Strategies](#tips--strategies)

---

## Getting Started

### Requirements
- Node.js v14 or higher
- A modern web browser (Chrome, Firefox, Edge, Safari)

### Running the Game
```bash
node server.js
```
Open your browser to **http://localhost:3000**

### Login
Enter your name on the login screen. The game remembers returning players automatically — your stats, achievements, and history persist across sessions.

---

## Game Setup

After logging in, configure your new game:

| Setting | Options | Description |
|---------|---------|-------------|
| Civilization Name | Any name (max 12 chars) | Your empire's identity |
| AI Opponents | 2 or 3 | Number of rival civilizations |
| Difficulty | Easy / Normal / Hard | AI gets resource bonuses on higher difficulties |

If you have a saved game, you can **Continue** from where you left off.

---

## Resources

You manage 6 resources:

| Resource | Icon | Purpose |
|----------|------|---------|
| **Gold** | 💰 | Currency for units, trade, espionage |
| **Food** | 🌾 | Feeds population; surplus grows your people |
| **Production** | 🔨 | Constructs buildings and wonders |
| **Science** | 🔬 | Accumulates toward current research |
| **Military** | ⚔️ | Combat power (base + units) |
| **Population** | 👥 | Grows from food; each person costs 1 food/turn |

### Resource Rates
Each turn, your rates are added to your totals. Buildings, technologies, government, and golden ages modify these rates.

### Food & Population
- Population consumes food equal to its size each turn
- Growth happens when food reaches `20 × population`
- If food hits 0, famine strikes and population drops

---

## Building

Access the **Build** tab to construct buildings.

**Rules:**
- You can build one building at a time
- Progress uses your production rate each turn
- Buildings must be unlocked by the correct technology
- Each building can only be built once

### Building List

| Building | Era | Cost | Effect |
|----------|-----|------|--------|
| Farm | Ancient | 20 | +3 Food/turn |
| Mine | Ancient | 25 | +3 Production/turn |
| Market | Ancient | 30 | +5 Gold/turn |
| Library | Classical | 40 | +3 Science/turn |
| Temple | Classical | 35 | +3 Gold, +1 Food/turn |
| Workshop | Medieval | 50 | +5 Production/turn |
| University | Medieval | 60 | +6 Science/turn |
| Bank | Renaissance | 55 | +8 Gold/turn |
| Factory | Industrial | 80 | +10 Production/turn |
| Research Lab | Industrial | 100 | +12 Science/turn |
| Stock Exchange | Modern | 90 | +15 Gold/turn |
| Nuclear Plant | Atomic | 120 | +15 Production, +5 Science/turn |

---

## Technology

Access the **Research** tab to research technologies.

**Rules:**
- You can research one technology at a time
- Progress uses your science rate each turn
- Some techs have prerequisites (must be researched first)
- Technologies unlock buildings, units, and special abilities

### Tech Tree Overview

```
Ancient Era:
  Agriculture → Writing → Philosophy
  Mining → Engineering → Gunpowder (+5 Military)
  Currency → Economics

Medieval/Renaissance:
  Writing → Education
  Engineering + Economics → Industrialization

Industrial/Modern:
  Industrialization → Electricity → Rocketry → Nuclear Fission (NUKES!)
  Electricity → Computers (+20 Science/turn)
  Rocketry + Computers → Space Travel (SCIENCE VICTORY!)
```

---

## Military

Access the **Military** tab to train units.

### Available Units

| Unit | Era | Cost (Gold/Prod) | Power |
|------|-----|-----------------|-------|
| Warriors | Ancient | 20/10 | 2 |
| Archers | Classical | 30/15 | 3 |
| Knights | Medieval | 50/25 | 5 |
| Musketeers | Renaissance | 60/30 | 7 |
| Artillery | Industrial | 80/40 | 10 |
| Tanks | Modern | 100/50 | 15 |
| Nuclear Missile | Atomic | 200/100 | 50 |

### Combat
- **Attack** is only available against civs you're at war with
- Attack power = total military × random(0.7–1.3)
- Defenders get their **defense bonus** added to their roll
- Losing a battle costs military power and can reduce population
- If a civ's military and population reach minimum, they are **conquered**

### Nuclear Weapons
- Requires the **Nuclear Fission** technology
- Deals massive damage to all stats of the target
- **All other civilizations become hostile** toward the nuke user
- Use with extreme caution

---

## Diplomacy & Espionage

Access the **Diplomacy** tab to interact with other civilizations.

### Relationship States
```
neutral → friendly → allied    (via gifts and trade)
neutral → hostile → war        (via aggression or nukes)
```

### Actions

| Action | Cost | Effect |
|--------|------|--------|
| Send Gift | 50 Gold | +10 relationship with target |
| Propose Alliance | — | Requires relationship ≥ 70 |
| Declare War | — | Enables attack and nuke options |
| Attack | — | Only during war |
| Launch Nuke | — | Requires Nuclear Fission + war |

### Espionage (New!)
Available after reaching the Classical Era. Costs **75 Gold** with a **5-turn cooldown**.

| Action | Success Rate | Effect |
|--------|-------------|--------|
| Steal Tech | 40% | Learn a random tech the target has that you don't |
| Sabotage | 50% | Destroy target's production and slow their builds |

**Risk:** If caught (50% chance on success), the target's relationship drops significantly and may turn hostile.

### War Weariness
- Each turn you are at war, weariness accumulates
- War weariness costs gold each turn (weariness × 2)
- When peace is restored, weariness decreases by 1 per turn

---

## Government

Choose a government type from the **Build** tab. Each provides different bonuses and penalties.

| Government | Era | Effects | Requires |
|-----------|-----|---------|----------|
| Despotism | Ancient | +2 Military, -1 Gold/turn | Default |
| Republic | Classical | +3 Gold, +2 Science/turn | Writing |
| Monarchy | Medieval | +3 Production, +3 Military | Philosophy |
| Theocracy | Medieval | +5 Military, +2 Gold, -2 Science | Philosophy |
| Democracy | Industrial | +5 Gold, +5 Science, -3 Military | Economics |
| Communism | Industrial | +8 Production, +3 Food, -3 Gold | Industrialization |

You can switch governments at any time once you meet the tech requirements.

---

## Wonders

Wonders are unique mega-buildings — only **one civilization** in the world can build each. First come, first served.

| Wonder | Era | Cost | Effect | Requires |
|--------|-----|------|--------|----------|
| Great Library | Classical | 80 | +8 Science/turn | Writing |
| Colosseum | Classical | 70 | +5 Gold, +3 Military | Currency |
| Great Wall | Medieval | 90 | +15 Defense in combat | Engineering |
| Oxford University | Renaissance | 110 | +12 Science/turn | Education |
| Big Ben | Industrial | 120 | +20 Gold/turn | Economics |
| Manhattan Project | Atomic | 150 | Nukes cost 50% less | Nuclear Fission |

---

## Random Events

Each turn, there's a small chance of a random event occurring:

| Event | Probability | Effect |
|-------|-------------|--------|
| 🌟 Golden Age | 4% | +5 Gold, +2 Food/turn for 5 turns |
| 🦠 Plague | 3% | Lose 20% of population |
| ⚔️ Barbarian Raid | 5% | Lose 30 Gold and 2 Military |
| 💎 Trade Windfall | 4% | Gain 80 Gold |
| 🔬 Scientific Breakthrough | 3% | +20 research progress |
| 🌾 Bountiful Harvest | 5% | Gain 50 Food |
| 🌋 Earthquake | 2% | Lose 20 Production |
| 👥 Refugees Arrive | 3% | +2 Population, -10 Food |

---

## Victory Conditions

Win the game by achieving any one of these:

| Victory | Condition | Strategy Tips |
|---------|-----------|---------------|
| 🗡️ **Domination** | Eliminate all rival civilizations | Build military, declare wars, conquer |
| 🔬 **Science** | Research Space Travel | Rush science buildings and tech |
| 💰 **Economic** | Accumulate 5000 Gold | Build markets/banks, trade with everyone |
| 🤝 **Diplomatic** | Allied with all surviving civs | Send gifts, avoid wars, propose alliances |

---

## Tips & Strategies

### Early Game (Turns 1–20)
- Research Agriculture first for Farms (food = growth)
- Build a Farm immediately to avoid early famine
- Don't neglect science — Libraries pay off quickly

### Mid Game (Turns 20–50)
- Choose your victory path and focus
- Switch government to match your strategy
- Race for Wonders before AI takes them
- Keep relations friendly with at least one civ as insurance

### Late Game (Turns 50+)
- Watch for AI approaching victory (check their tech count and gold)
- Nuclear weapons are a last resort — everyone turns hostile
- Espionage can steal key techs without full war
- War weariness adds up — keep wars short

### Strategy by Victory Type
- **Domination:** Monarchy/Communism → Military focus → Tanks → Conquer fast
- **Science:** Republic/Democracy → Libraries/Universities → Rush Space Travel
- **Economic:** Republic/Democracy → Markets/Banks → Big Ben wonder → Trade gifts
- **Diplomatic:** Republic → Send gifts to everyone → Propose alliances when friendly

---

## Achievements

Unlock achievements by playing:

| Achievement | Condition |
|-------------|-----------|
| 🏆 First Victory | Win your first game |
| ⚡ Speedrunner | Win in 50 turns or less |
| ⚔️ Conqueror | Win by domination |
| 🔬 Visionary | Win by science |
| 💰 Tycoon | Win by economic victory |
| 🤝 Diplomat | Win by diplomacy |
| 🎖️ Veteran | Play 5 games |
| 🎮 Addicted | Play 20 games |
| ☢️ Nuclear Option | Use a nuclear weapon |
| 📈 High Achiever | Score 500+ in a game |

---

## Saving & Loading

- The game **auto-saves every turn**
- Save data is stored on the server in `data/saves/`
- You can resume a saved game from the start screen
- When a game ends (victory or defeat), the save is deleted
- Your player profile and stats persist forever
