# Vingilot

Asteroids-style arcade game built with TypeScript, Vite, and HTML Canvas. Destroy asteroids, level up, and unlock weapons and stats.

## Tech stack

- **TypeScript** + **Vite**
- **Canvas 2D** for rendering (no game engine)
- Responsive viewport with zoom

## Getting started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173). To build for production:

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
|-------|--------|
| **W** / **↑** | Thrust |
| **A** / **←** **D** / **→** | Rotate |
| **Space** | Fire selected weapon |
| **1** **2** **3** | Select weapon slot |
| **Escape** | Pause (view stats) |
| **R** | Restart (when paused or game over) |

## Features

- **Ship** – inertia, HP, three weapon slots (one active at a time)
- **Weapons** – Bullet (default), Rocket, Bomb, Mine, Pulse, Cone Pulse, Laser. Unlock new weapons via level-up when slots are empty.
- **Asteroids** – collision, bounce, rewards (gold + XP)
- **Level-up** – choose one of three upgrades: player stats (max HP, damage, fire rate, range, movement speed, HP regen, luck, XP/gold gain) or weapon stats per slot, or add a new weapon to an empty slot
- **Stats** – damage, fire rate, range, movement, HP regen, luck, XP gain, gold gain (view in pause menu)

## Project structure

```
src/
  main.ts          # Entry point, mounts game on canvas
  game.ts          # Game loop, input, collision, UI
  constants.ts     # Tweakable config (speeds, damage, etc.)
  vec2.ts          # 2D vector helpers
  collision.ts     # Circle/segment collision, bounce
  weapon.ts        # Weapon kinds, cooldowns, slots
  projectiles.ts   # Bullets, rockets, bombs, mines, laser
  leveling.ts      # XP, upgrade options, apply upgrades
  starfield.ts     # Background stars
  entities/
    ship.ts        # Player ship
    asteroid.ts    # Asteroids, rewards, spawn
    bullet.ts      # Basic bullet (used by projectiles)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | TypeScript check + Vite build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
