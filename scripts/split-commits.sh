#!/bin/sh
# Run from repo root: sh scripts/split-commits.sh
# Unstages everything, then creates 9 logical commits for better GitHub activity.

set -e
cd "$(git rev-parse --show-toplevel)"

echo "Unstaging all files..."
git rm -r --cached . 2>/dev/null || true

echo "Commit 1/9: Project setup"
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html scripts/split-commits.sh
git commit -m "Add project setup (Vite, TypeScript, .gitignore)"

echo "Commit 2/9: Core utilities"
git add src/vec2.ts src/collision.ts src/constants.ts
git commit -m "Add core utilities (vec2, collision, constants)"

echo "Commit 3/9: Ship entity"
git add src/entities/ship.ts
git commit -m "Add ship entity (movement, HP, weapon slots)"

echo "Commit 4/9: Asteroids"
git add src/entities/asteroid.ts
git commit -m "Add asteroids (collision, rewards, spawn)"

echo "Commit 5/9: Starfield"
git add src/starfield.ts
git commit -m "Add starfield background"

echo "Commit 6/9: Weapon system"
git add src/weapon.ts
git commit -m "Add weapon system (bullet, rocket, bomb, mine, pulse, laser)"

echo "Commit 7/9: Projectiles and combat"
git add src/entities/bullet.ts src/projectiles.ts
git commit -m "Add projectiles (bullets, rockets, bombs, mines, laser)"

echo "Commit 8/9: Leveling and upgrades"
git add src/leveling.ts
git commit -m "Add leveling and upgrades (XP, stats, weapon unlocks)"

echo "Commit 9/9: Game loop and entry"
git add src/game.ts src/main.ts
git commit -m "Add game loop and main entry (canvas, input, UI)"

echo "Done. 9 commits created."
