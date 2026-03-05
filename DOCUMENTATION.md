# Game Box — Documentation

**A React + Kaboom.js handheld Game Boy experience in the browser.**

This document covers the full project structure, asset pipeline, World 1-1 data map, secrets reference, and instructions for replacing assets and extending the game.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [File Structure](#file-structure)
3. [Setup Instructions](#setup-instructions)
4. [Controls](#controls)
5. [World 1-1 Data Map and Secrets Map](#world-1-1-data-map-and-secrets-map)
6. [How to Replace Assets](#how-to-replace-assets)
7. [Assets I Need From You](#assets-i-need-from-you)
8. [Extending the Game](#extending-the-game)

---

## Project Overview

Game Box renders a custom Game Boy shell image in the browser with a Kaboom.js canvas positioned precisely in the screen cutout. The first playable level is a faithful structural replica of Super Mario Bros World 1-1, including all major secrets, hidden blocks, pipe entries, vine blocks, and alternate routes in their original positions.

The game uses **procedural placeholder sprites** for the MVP — every visual element is generated at runtime using the Canvas API. These can be replaced one-by-one with real pixel art through the asset pipeline without touching any game logic.

**Tech Stack:** React 19, Kaboom.js 3000, Tailwind CSS 4, TypeScript, Vite.

---

## File Structure

```
client/
  src/
    assets/
      manifest.ts          ← Centralized asset registry (keys, paths, sizes, anims)
      resolveAsset.ts       ← Theme/default/placeholder resolution logic
    components/
      GameBoyShell.tsx      ← React shell: skin image, canvas positioning, touch zones
    content/
      about.content.json    ← World map hotspot data (labels, descriptions, unlock conditions)
    game/
      engine.ts             ← Kaboom.js initialization and sprite loading
      index.ts              ← Game entry point (starts all scenes)
      inputManager.ts       ← Shared input state bridge (React ↔ Kaboom)
      sprites/
        proceduralSprites.ts ← Canvas-based placeholder sprite generators
      scenes/
        level1_1.ts          ← World 1-1 scene (full platformer mechanics)
        subareas.ts          ← Underground bonus + Coin Heaven scenes
        worldMap.ts          ← Interactive About page / World Map
    worlds/
      world_1_1.ts           ← Level definition: tile map, enemies, secrets, subareas
    pages/
      Home.tsx               ← Renders the GameBoyShell component
    App.tsx                  ← Router and theme setup
    index.css                ← Global styles (dark theme, retro fonts)
```

---

## Setup Instructions

The project is already configured and running. For a fresh setup:

```bash
cd gamebox
pnpm install
pnpm dev
```

The dev server starts on port 3000. Open the URL in a browser to play.

---

## Controls

| Input | Keyboard | Touch Zone | Action |
|-------|----------|------------|--------|
| Move Left | Arrow Left / A | D-pad Left | Walk left |
| Move Right | Arrow Right / D | D-pad Right | Walk right |
| Jump | Space | A Button | Jump (variable height) |
| Sprint | Shift | B Button | Run faster |
| Enter Pipe | Arrow Down / S | D-pad Down | Enter pipe (when standing on enterable pipe) |
| Info / World Map | I | INFO button | Open the World Map / About page |
| Restart | R | RESTART button | Restart the current scene |

---

## World 1-1 Data Map and Secrets Map

All level data lives in `client/src/worlds/world_1_1.ts`. The level is defined as a **212-tile wide by 15-tile tall** grid, matching the original NES dimensions. Secrets are stored as a separate `secrets: SecretDef[]` array, decoupled from the tile map, so you can change what a secret does without moving its position.

### Tile Legend

| Character | Tile Type |
|-----------|-----------|
| `=` | Ground block |
| `-` | Breakable brick |
| `?` | Question block (coin) |
| `Q` | Question block (power-up) |
| `H` | Hard/stone block (indestructible) |
| `[` `]` | Pipe top (left/right) |
| `{` `}` | Pipe body (left/right) |
| `\|` | Flag pole |
| `^` | Flag pole top |
| `*` | Floating coin |
| `.` | Empty air |

### Secrets Reference

Each secret is defined with `x`, `y` (tile coordinates), `type`, `action`, and optional `targetScene`/`returnX` for teleportation.

| Secret | Position (x, y) | Type | Action | Notes |
|--------|-----------------|------|--------|-------|
| Hidden 1-UP Block | (64, 8) | `hidden-block` | `spawn-1up` | Invisible until hit from below. Near first pipe area. |
| Multi-Coin Brick | (94, 5) | `multi-coin` | `spawn-coins` | Hit repeatedly for up to 10 coins before becoming used. |
| Star Block | (94, 9) | `star-block` | `spawn-star` | Star power-up hidden in a brick block. |
| Underground Pipe Entry | (57, 12) | `pipe-entry` | `teleport-subarea` | Press Down on pipe at x=57 to enter underground coin room. Returns at x=163. |
| Hidden Coin Block | (21, 5) | `hidden-block` | `spawn-coin` | Hidden coin block above the first block cluster. |
| Vine / Sky Bonus | (118, 9) | `vine-block` | `teleport-subarea` | Beanstalk leads to Coin Heaven (sky bonus area). Returns at x=163. |
| Power-Up Block 1 | (21, 9) | `powerup-block` | `spawn-mushroom` | First mushroom/power-up question block. |
| Power-Up Block 2 | (78, 9) | `powerup-block` | `spawn-mushroom` | Second power-up after first pit. |

### How to Adjust Secret Behavior

To change what a secret does without moving it, edit the `action` field in the `secrets` array:

```typescript
// Example: Change the star block to spawn a 1-UP instead
{
  x: 94, y: 9,
  type: 'star-block',
  action: 'spawn-1up',  // Changed from 'spawn-star'
  note: 'Was a star, now gives 1-UP.',
}
```

To move a secret, change its `x` and `y` values. The tile map and secret positions are independent — the secret system checks coordinates at runtime.

### Sub-Areas

The underground bonus area and sky bonus area are defined in the same file as `UNDERGROUND_SUBAREA` and `SKY_SUBAREA`. Each has its own tile map, player start position, and background color. They are registered as separate Kaboom scenes (`subarea-underground` and `subarea-sky`).

---

## How to Replace Assets

The asset pipeline uses a three-tier fallback system:

1. **Theme override:** `/assets/theme/<path>` — your custom art
2. **Default assets:** `/assets/default/<path>` — built-in fallback
3. **Procedural placeholder:** Canvas-generated sprites (current MVP)

### Step-by-Step

1. Create your sprite as a PNG file at the recommended pixel size (see the asset table below).
2. Place it in the appropriate folder under `client/public/assets/theme/` (or `default/`).
3. The game will automatically pick it up on next load — no code changes needed.

For spritesheets (player, enemies, coins), ensure the frame layout matches the `frameSize` and `anims` definitions in `client/src/assets/manifest.ts`.

### Example: Replacing the Player Sprite

The player spritesheet is 128x16 pixels with 8 frames of 16x16 each:

| Frame 0 | Frame 1-3 | Frame 4 | Frame 5 | Frame 6-7 |
|---------|-----------|---------|---------|-----------|
| Idle | Run cycle | Jump | Die | Grow |

Save your spritesheet as `client/public/assets/theme/player/player.png` and it will override the procedural placeholder.

---

## Assets I Need From You

Below is the complete, exhaustive list of every asset file the game expects. All are optional — the game runs with procedural placeholders for everything.

### MVP Starter Set (Ship First)

These are the minimum assets to make the game feel polished:

| Asset | Key | Path | Format | Size | Description |
|-------|-----|------|--------|------|-------------|
| Player | `player` | `player/player.png` | PNG spritesheet | 128x16 (8 frames of 16x16) | Idle, run (3 frames), jump, die, grow (2 frames) |
| Ground | `ground` | `tiles/ground.png` | PNG | 16x16 | Ground/floor tile |
| Brick | `brick` | `tiles/brick.png` | PNG | 16x16 | Breakable brick block |
| Question Block | `question-block` | `tiles/question-block.png` | PNG | 16x16 | Active question block with "?" |
| Goomba | `goomba` | `enemies/goomba.png` | PNG spritesheet | 48x16 (3 frames of 16x16) | Walk (2 frames), squished |
| Coin | `coin` | `items/coin.png` | PNG spritesheet | 64x16 (4 frames of 16x16) | Spin animation (4 frames) |

### Full Asset List

#### Tiles (all 16x16 PNG unless noted)

| Asset | Key | Path | Size | Description |
|-------|-----|------|------|-------------|
| Ground | `ground` | `tiles/ground.png` | 16x16 | Ground/floor tile |
| Brick | `brick` | `tiles/brick.png` | 16x16 | Breakable brick |
| Question Block | `question-block` | `tiles/question-block.png` | 16x16 | Active "?" block |
| Used Block | `used-block` | `tiles/used-block.png` | 16x16 | Empty/used block |
| Hard Block | `hard-block` | `tiles/hard-block.png` | 16x16 | Indestructible stone |
| Pipe Top Left | `pipe-top-left` | `tiles/pipe-top-left.png` | 16x16 | Pipe opening left half |
| Pipe Top Right | `pipe-top-right` | `tiles/pipe-top-right.png` | 16x16 | Pipe opening right half |
| Pipe Body Left | `pipe-body-left` | `tiles/pipe-body-left.png` | 16x16 | Pipe shaft left half |
| Pipe Body Right | `pipe-body-right` | `tiles/pipe-body-right.png` | 16x16 | Pipe shaft right half |
| Flag Pole | `flag-pole` | `tiles/flag-pole.png` | 16x16 | Flagpole segment |
| Flag Top | `flag-top` | `tiles/flag-top.png` | 16x16 | Flagpole top ball |
| Flag | `flag` | `tiles/flag.png` | 16x16 | Flag on pole |
| Castle | `castle` | `tiles/castle.png` | 80x80 | End-of-level castle |
| Cloud | `cloud` | `tiles/cloud.png` | 48x32 | Background cloud |
| Bush | `bush` | `tiles/bush.png` | 48x16 | Background bush |
| Hill | `hill` | `tiles/hill.png` | 80x32 | Background hill |

#### Characters (PNG spritesheets)

| Asset | Key | Path | Size | Frames | Animations |
|-------|-----|------|------|--------|------------|
| Player | `player` | `player/player.png` | 128x16 | 8 x 16x16 | idle(0), run(1-3), jump(4), die(5), grow(6-7) |
| Goomba | `goomba` | `enemies/goomba.png` | 48x16 | 3 x 16x16 | walk(0-1), squished(2) |
| Koopa | `koopa` | `enemies/koopa.png` | 48x24 | 3 x 16x24 | walk(0-1), shell(2) |

#### Items (PNG)

| Asset | Key | Path | Size | Notes |
|-------|-----|------|------|-------|
| Coin | `coin` | `items/coin.png` | 64x16 | 4 frames of 16x16, spin animation |
| Mushroom | `mushroom` | `items/mushroom.png` | 16x16 | Power-up mushroom |
| 1-UP | `oneup` | `items/oneup.png` | 16x16 | Extra life mushroom (green) |
| Star | `star` | `items/star.png` | 16x16 | Invincibility star |
| Fire Flower | `fire-flower` | `items/fire-flower.png` | 16x16 | Fire flower power-up |

#### UI

| Asset | Key | Path | Size | Description |
|-------|-----|------|------|-------------|
| Heart | `heart` | `ui/heart.png` | 16x16 | Life/heart icon |

#### Audio (WAV or MP3)

| Asset | Key | Path | Description |
|-------|-----|------|-------------|
| Overworld BGM | `bgm-overworld` | `audio/overworld.wav` | Main level background music |
| Underground BGM | `bgm-underground` | `audio/underground.wav` | Underground bonus area music |
| Jump SFX | `sfx-jump` | `audio/jump.wav` | Jump sound effect |
| Coin SFX | `sfx-coin` | `audio/coin.wav` | Coin collect sound |
| Stomp SFX | `sfx-stomp` | `audio/stomp.wav` | Enemy stomp sound |
| Bump SFX | `sfx-bump` | `audio/bump.wav` | Block bump sound |
| Power-Up SFX | `sfx-powerup` | `audio/powerup.wav` | Power-up collect sound |
| Pipe SFX | `sfx-pipe` | `audio/pipe.wav` | Pipe enter sound |
| Die SFX | `sfx-die` | `audio/die.wav` | Player death sound |
| Flagpole SFX | `sfx-flagpole` | `audio/flagpole.wav` | Flagpole slide sound |
| 1-UP SFX | `sfx-1up` | `audio/1up.wav` | 1-UP collect sound |
| Break SFX | `sfx-break` | `audio/break.wav` | Brick break sound |

### Naming Conventions

All asset files should follow these conventions:

- **Format:** PNG for sprites, WAV or MP3 for audio
- **Naming:** lowercase with hyphens (e.g., `question-block.png`, `pipe-top-left.png`)
- **Spritesheets:** Frames arranged horizontally, left to right
- **Colors:** No transparency restrictions — use whatever palette fits your art style
- **Resolution:** Match the recommended pixel sizes above for pixel-perfect rendering

### Folder Structure for Assets

```
client/public/assets/
  theme/           ← Your custom overrides (checked first)
    tiles/
    player/
    enemies/
    items/
    ui/
    audio/
  default/         ← Built-in fallbacks (checked second)
    tiles/
    player/
    enemies/
    items/
    ui/
    audio/
```

---

## Extending the Game

### Adding a New Level

1. Create a new level definition in `client/src/worlds/` (e.g., `world_1_2.ts`) following the same `LevelDef` interface.
2. Create a new scene in `client/src/game/scenes/` that uses the level data.
3. Register the scene in `client/src/game/index.ts`.
4. Add a hotspot to `client/src/content/about.content.json` with the appropriate unlock condition.

### Adding New Enemy Types

1. Add a procedural sprite generator in `client/src/game/sprites/proceduralSprites.ts`.
2. Add the asset entry to `client/src/assets/manifest.ts`.
3. Add spawn logic in the level scene file.

### Adding New Secret Types

1. Add the new type to the `SecretDef` interface in `client/src/worlds/world_1_1.ts`.
2. Add handling logic in the `bumpBlock` or `bumpBrick` functions in `client/src/game/scenes/level1_1.ts`.
3. Add the secret entry to the level's `secrets` array with the appropriate coordinates.

### Modifying the World Map

Edit `client/src/content/about.content.json` to add, remove, or modify hotspots. Each hotspot supports:

- `id`: Unique identifier
- `label`: Display name
- `x`, `y`: Position as percentage (0-1) of the map dimensions
- `description`: Text shown in the info panel
- `unlocked`: Whether it's available by default
- `unlockCondition`: localStorage key that must be `"true"` to unlock
- `action`: `"play-level"`, `"info"`, or `"coming-soon"`

---

*Built with React, Kaboom.js, and a lot of love for retro gaming. No Nintendo assets were used.*
