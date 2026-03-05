/**
 * Scene: level-1-1
 * 
 * Playable platformer — faithful World 1-1 replica.
 * Reads input from the shared InputManager every frame.
 * 
 * Design: Clean Void — Game Boy green-tinted LCD feel
 */

import { KaboomCtx, GameObj } from 'kaboom';
import WORLD_1_1, { UNDERGROUND_SUBAREA, SKY_SUBAREA, SecretDef } from '../../worlds/world_1_1';
import { getInputState, getAndClearOneShots } from '../inputManager';

const TILE = 16;
const GRAVITY = 1200;
const WALK_SPEED = 100;
const RUN_SPEED = 180;
const JUMP_FORCE = 400;
const ENEMY_SPEED = 40;

// Track game state
interface GameState {
  coins: number;
  lives: number;
  score: number;
  time: number;
  dead: boolean;
  won: boolean;
  big: boolean;
}

export function registerLevel1_1(k: KaboomCtx) {
  k.scene('level-1-1', () => {
    const state: GameState = {
      coins: 0,
      lives: 3,
      score: 0,
      time: WORLD_1_1.timeLimit,
      dead: false,
      won: false,
      big: false,
    };

    k.setGravity(GRAVITY);
    k.setBackground(97, 133, 248);

    // ── Build level from tile map ──
    const level = WORLD_1_1;
    
    // Track used blocks and multi-coin counters
    const usedBlocks = new Set<string>();
    const multiCoinCounts: Record<string, number> = {};
    
    // Find secrets by position
    const secretMap = new Map<string, SecretDef>();
    for (const secret of level.secrets) {
      secretMap.set(`${secret.x},${secret.y}`, secret);
    }

    // Place tiles
    for (let y = 0; y < level.height; y++) {
      const row = level.tiles[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        placeTile(k, ch, x, y, secretMap);
      }
    }

    // Place enemies
    for (const enemy of level.enemies) {
      spawnEnemy(k, enemy.type, enemy.x, enemy.y, enemy.dir);
    }

    // Place hidden blocks from secrets
    for (const secret of level.secrets) {
      if (secret.type === 'hidden-block' || secret.type === '1up-block') {
        placeHiddenBlock(k, secret);
      }
    }

    // ── Player ──
    const player = k.add([
      k.sprite('player', { anim: 'idle' }),
      k.pos(level.playerStart.x * TILE, level.playerStart.y * TILE),
      k.area({ shape: new k.Rect(k.vec2(0, 0), 14, 16) }),
      k.body(),
      k.scale(1),
      k.anchor('bot'),
      k.z(10),
      'player',
      {
        dir: 1,
        jumpHeld: false,
        grounded: false,
      },
    ]);

    // Camera follow
    player.onUpdate(() => {
      // Camera follows player, clamped to level bounds
      const camX = Math.max(128, Math.min(player.pos.x, level.width * TILE - 128));
      k.camPos(camX, 120);
    });

    // ── Player Movement ──
    player.onUpdate(() => {
      if (state.dead || state.won) return;

      const input = getInputState();
      const oneShots = getAndClearOneShots();
      const speed = input.sprint ? RUN_SPEED : WALK_SPEED;

      // Horizontal movement
      if (input.left) {
        player.move(-speed, 0);
        player.dir = -1;
        player.flipX = true;
        if (player.isGrounded()) {
          if (player.curAnim() !== 'run') player.play('run');
        }
      } else if (input.right) {
        player.move(speed, 0);
        player.dir = 1;
        player.flipX = false;
        if (player.isGrounded()) {
          if (player.curAnim() !== 'run') player.play('run');
        }
      } else {
        if (player.isGrounded() && player.curAnim() !== 'idle') {
          player.play('idle');
        }
      }

      // Jump
      if (oneShots.jumpPressed && player.isGrounded()) {
        player.jump(JUMP_FORCE);
        player.play('jump');
      }

      // Variable jump height — release early for short jump
      if (!input.jump && !player.isGrounded() && player.vel && player.vel.y < -100) {
        // Reduce upward velocity for short hop
      }

      // Jump animation
      if (!player.isGrounded()) {
        if (player.curAnim() !== 'jump') player.play('jump');
      }

      // Pipe entry (down on pipe)
      if (input.down) {
        checkPipeEntry(k, player, state);
      }

      // Fall death
      if (player.pos.y > level.height * TILE + 32) {
        playerDie(k, player, state);
      }

      // INFO / RESTART one-shots
      if (oneShots.infoPressed) {
        k.go('world-map');
      }
      if (oneShots.restartPressed) {
        k.go('level-1-1');
      }
    });

    // ── Block Collision (head bump) ──
    // Block collision — check for blocks above player's head each frame
    player.onUpdate(() => {
      if (state.dead || state.won) return;
      if (!player.vel || player.vel.y >= 0) return; // Only when moving up
      
      // Check tile above player head
      const headX = player.pos.x;
      const headY = player.pos.y - 20; // Above player
      
      const blockTypes = ['question-block', 'brick-block', 'hidden-block'];
      for (const tag of blockTypes) {
        const blocks = k.get(tag);
        for (const block of blocks) {
          if (block.is('used')) continue;
          const dx = Math.abs(block.pos.x + 8 - headX);
          const dy = Math.abs(block.pos.y + 8 - headY);
          if (dx < 12 && dy < 12) {
            if (tag === 'question-block') {
              bumpBlock(k, block, state, secretMap);
            } else if (tag === 'brick-block') {
              bumpBrick(k, block, state, secretMap);
            } else if (tag === 'hidden-block') {
              revealHiddenBlock(k, block, state, secretMap);
            }
          }
        }
      }
    });

    // ── Enemy Collision ──
    player.onCollide('enemy', (enemy: GameObj) => {
      if (state.dead) return;

      // Check if stomping (player falling onto enemy)
      const isStomping = player.pos.y < enemy.pos.y - 8 && player.vel && player.vel.y > 0;
      
      if (isStomping) {
        // Stomp enemy
        stompEnemy(k, enemy, state);
        // Bounce player
        player.jump(JUMP_FORCE * 0.6);
      } else {
        // Player takes damage
        playerDie(k, player, state);
      }
    });

    // ── Flag pole collision ──
    player.onCollide('flag-pole', () => {
      if (state.won) return;
      state.won = true;
      winLevel(k, player, state);
    });

    player.onCollide('flag-top', () => {
      if (state.won) return;
      state.won = true;
      winLevel(k, player, state);
    });

    // ── Coin collection ──
    player.onCollide('coin-pickup', (coin: GameObj) => {
      state.coins++;
      state.score += 200;
      k.destroy(coin);
      spawnCoinEffect(k, coin.pos.x, coin.pos.y);
    });

    // ── HUD ──
    const hudLayer = k.add([k.pos(0, 0), k.fixed(), k.z(100)]);
    
    hudLayer.onDraw(() => {
      // Coin count
      k.drawText({
        text: `COINS: ${state.coins}`,
        pos: k.vec2(8, 4),
        size: 8,
        color: k.rgb(255, 255, 255),
        fixed: true,
      });
      // Score
      k.drawText({
        text: `SCORE: ${state.score}`,
        pos: k.vec2(100, 4),
        size: 8,
        color: k.rgb(255, 255, 255),
        fixed: true,
      });
      // Lives
      k.drawText({
        text: `LIVES: ${state.lives}`,
        pos: k.vec2(200, 4),
        size: 8,
        color: k.rgb(255, 255, 255),
        fixed: true,
      });
    });

    // ── Timer ──
    const timerLoop = k.loop(1, () => {
      if (state.dead || state.won) return;
      state.time--;
      if (state.time <= 0) {
        playerDie(k, player, state);
      }
    });
  });
}

// ── Tile Placement ──

function placeTile(k: KaboomCtx, ch: string, x: number, y: number, secretMap: Map<string, SecretDef>) {
  const pos = k.vec2(x * TILE, y * TILE);
  
  switch (ch) {
    case '=':
      k.add([
        k.sprite('ground'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        k.offscreen({ hide: true }),
        'ground',
      ]);
      break;
    case '-': {
      const secret = secretMap.get(`${x},${y}`);
      const tags = ['brick-block'];
      if (secret) tags.push('has-secret');
      k.add([
        k.sprite('brick'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        k.offscreen({ hide: true }),
        ...tags,
        { secretDef: secret, tileX: x, tileY: y },
      ]);
      break;
    }
    case '?':
    case 'Q': {
      const secret = secretMap.get(`${x},${y}`);
      k.add([
        k.sprite('question-block'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        k.offscreen({ hide: true }),
        'question-block',
        { secretDef: secret, tileX: x, tileY: y, isPowerup: ch === 'Q' },
      ]);
      break;
    }
    case 'H':
      k.add([
        k.sprite('hard-block'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        k.offscreen({ hide: true }),
        'hard-block',
      ]);
      break;
    case '[':
      k.add([
        k.sprite('pipe-top-left'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        k.offscreen({ hide: true }),
        'pipe', 'pipe-top',
        { tileX: x, tileY: y },
      ]);
      break;
    case ']':
      k.add([
        k.sprite('pipe-top-right'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        k.offscreen({ hide: true }),
        'pipe', 'pipe-top',
        { tileX: x, tileY: y },
      ]);
      break;
    case '{':
      k.add([
        k.sprite('pipe-body-left'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        k.offscreen({ hide: true }),
        'pipe',
      ]);
      break;
    case '}':
      k.add([
        k.sprite('pipe-body-right'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        k.offscreen({ hide: true }),
        'pipe',
      ]);
      break;
    case '|':
      k.add([
        k.sprite('flag-pole'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        'flag-pole',
      ]);
      break;
    case '^':
      k.add([
        k.sprite('flag-top'),
        k.pos(pos),
        k.area(),
        k.body({ isStatic: true }),
        'flag-top',
      ]);
      // Add the flag sprite next to pole top
      k.add([
        k.sprite('flag'),
        k.pos(pos.x - 8, pos.y),
        k.z(5),
        'flag-sprite',
      ]);
      break;
    case '*':
      k.add([
        k.sprite('coin', { anim: 'spin' }),
        k.pos(pos),
        k.area(),
        k.offscreen({ hide: true }),
        'coin-pickup',
      ]);
      break;
  }
}

function placeHiddenBlock(k: KaboomCtx, secret: SecretDef) {
  // Hidden blocks are invisible until hit from below
  k.add([
    k.rect(TILE, TILE),
    k.pos(secret.x * TILE, secret.y * TILE),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    'hidden-block',
    { secretDef: secret, tileX: secret.x, tileY: secret.y },
  ]);
}

// ── Enemy Spawning ──

function spawnEnemy(k: KaboomCtx, type: string, x: number, y: number, dir: number) {
  const enemyObj = k.add([
    k.sprite(type === 'goomba' ? 'goomba' : 'koopa', { anim: 'walk' }),
    k.pos(x * TILE, y * TILE),
    k.area({ shape: new k.Rect(k.vec2(0, 0), 14, 14) }),
    k.body(),
    k.anchor('bot'),
    k.offscreen({ destroy: false, hide: true }),
    'enemy',
    type,
    { dir, speed: ENEMY_SPEED, alive: true },
  ]);

  enemyObj.onUpdate(() => {
    if (!enemyObj.alive) return;
    enemyObj.move(enemyObj.dir * enemyObj.speed, 0);
    
    // Fall death
    if (enemyObj.pos.y > 15 * TILE + 32) {
      k.destroy(enemyObj);
    }
  });

  // Reverse direction on wall collision
  enemyObj.onCollide('ground', () => {});
  enemyObj.onCollide('hard-block', () => { enemyObj.dir *= -1; });
  enemyObj.onCollide('pipe', () => { enemyObj.dir *= -1; });
  enemyObj.onCollide('brick-block', () => { enemyObj.dir *= -1; });
  enemyObj.onCollide('question-block', () => { enemyObj.dir *= -1; });
}

// ── Block Interactions ──

function bumpBlock(k: KaboomCtx, block: GameObj, state: GameState, secretMap: Map<string, SecretDef>) {
  if (block.is('used')) return;
  
  // Bump animation
  const origY = block.pos.y;
  k.tween(block.pos.y, origY - 4, 0.08, (v) => { block.pos.y = v; }, k.easings.easeOutQuad).then(() => {
    k.tween(block.pos.y, origY, 0.08, (v) => { block.pos.y = v; });
  });

  const secret = block.secretDef as SecretDef | undefined;
  
  if (block.isPowerup || (secret && secret.action === 'spawn-mushroom')) {
    // Spawn mushroom
    spawnMushroom(k, block.pos.x, block.pos.y - TILE);
    state.score += 1000;
  } else if (secret && secret.action === 'spawn-star') {
    spawnStar(k, block.pos.x, block.pos.y - TILE);
    state.score += 1000;
  } else {
    // Spawn coin
    spawnCoinEffect(k, block.pos.x + 4, block.pos.y - TILE);
    state.coins++;
    state.score += 200;
  }

  // Mark as used
  block.use(k.sprite('used-block'));
  block.tag('used');
}

function bumpBrick(k: KaboomCtx, block: GameObj, state: GameState, secretMap: Map<string, SecretDef>) {
  if (block.is('used')) return;
  
  const secret = block.secretDef as SecretDef | undefined;
  
  if (secret) {
    // Bump animation
    const origY = block.pos.y;
    k.tween(block.pos.y, origY - 4, 0.08, (v) => { block.pos.y = v; }, k.easings.easeOutQuad).then(() => {
      k.tween(block.pos.y, origY, 0.08, (v) => { block.pos.y = v; });
    });
    
    if (secret.action === 'spawn-coins') {
      // Multi-coin block
      const key = `${secret.x},${secret.y}`;
      const count = (block._multiCoinCount || 0) + 1;
      block._multiCoinCount = count;
      
      spawnCoinEffect(k, block.pos.x + 4, block.pos.y - TILE);
      state.coins++;
      state.score += 200;
      
      if (count >= 10) {
        block.use(k.sprite('used-block'));
        block.tag('used');
      }
    } else if (secret.action === 'spawn-star') {
      spawnStar(k, block.pos.x, block.pos.y - TILE);
      block.use(k.sprite('used-block'));
      block.tag('used');
      state.score += 1000;
    } else if (secret.action === 'spawn-1up') {
      spawn1Up(k, block.pos.x, block.pos.y - TILE);
      block.use(k.sprite('used-block'));
      block.tag('used');
    } else if (secret.action === 'teleport-subarea') {
      // Vine/beanstalk — spawn vine and teleport
      block.use(k.sprite('used-block'));
      block.tag('used');
      // Visual vine growing up
      const vine = k.add([
        k.rect(4, 0),
        k.pos(block.pos.x + 6, block.pos.y),
        k.color(34, 139, 34),
        k.z(5),
      ]);
      k.tween(0, TILE * 6, 1.5, (h) => {
        vine.height = h;
        vine.pos.y = block.pos.y - h;
      }).then(() => {
        k.wait(0.5, () => {
          if (secret.targetScene === 'subarea-sky') {
            k.go('subarea-sky', { returnX: secret.returnX });
          }
        });
      });
    } else if (secret.action === 'spawn-mushroom') {
      spawnMushroom(k, block.pos.x, block.pos.y - TILE);
      block.use(k.sprite('used-block'));
      block.tag('used');
      state.score += 1000;
    } else {
      spawnCoinEffect(k, block.pos.x + 4, block.pos.y - TILE);
      state.coins++;
      state.score += 200;
      block.use(k.sprite('used-block'));
      block.tag('used');
    }
  } else {
    // Break brick (small player) or break with animation
    breakBrick(k, block);
    state.score += 50;
  }
}

function revealHiddenBlock(k: KaboomCtx, block: GameObj, state: GameState, secretMap: Map<string, SecretDef>) {
  if (block.is('used')) return;
  
  // Make visible
  block.opacity = 1;
  block.use(k.sprite('used-block'));
  block.tag('used');
  
  const secret = block.secretDef as SecretDef | undefined;
  if (secret) {
    if (secret.action === 'spawn-1up') {
      spawn1Up(k, block.pos.x, block.pos.y - TILE);
      state.score += 0; // 1-UP doesn't give score
    } else if (secret.action === 'spawn-coin') {
      spawnCoinEffect(k, block.pos.x + 4, block.pos.y - TILE);
      state.coins++;
      state.score += 200;
    }
  }
}

function breakBrick(k: KaboomCtx, block: GameObj) {
  const bx = block.pos.x;
  const by = block.pos.y;
  k.destroy(block);
  
  // Spawn 4 debris particles
  for (let i = 0; i < 4; i++) {
    const dx = (i % 2 === 0 ? -1 : 1) * (30 + Math.random() * 40);
    const dy = -(150 + Math.random() * 100);
    const debris = k.add([
      k.rect(4, 4),
      k.pos(bx + (i % 2) * 8, by + Math.floor(i / 2) * 8),
      k.color(200, 76, 9),
      k.move(k.vec2(dx, dy).unit(), Math.sqrt(dx * dx + dy * dy)),
      k.lifespan(0.5, { fade: 0.3 }),
      k.z(20),
    ]);
  }
}

// ── Item Spawning ──

function spawnCoinEffect(k: KaboomCtx, x: number, y: number) {
  const coin = k.add([
    k.sprite('coin', { anim: 'spin' }),
    k.pos(x, y),
    k.z(15),
    k.lifespan(0.5, { fade: 0.2 }),
  ]);
  k.tween(coin.pos.y, y - 32, 0.4, (v) => { coin.pos.y = v; }, k.easings.easeOutQuad);
}

function spawnMushroom(k: KaboomCtx, x: number, y: number) {
  const mush = k.add([
    k.sprite('mushroom'),
    k.pos(x, y),
    k.area(),
    k.body(),
    k.offscreen({ destroy: true }),
    'mushroom-item',
    { dir: 1, speed: 50 },
  ]);
  
  // Rise from block
  k.tween(mush.pos.y, y - TILE, 0.3, (v) => { mush.pos.y = v; });
  
  mush.onUpdate(() => {
    mush.move(mush.dir * mush.speed, 0);
  });
  
  mush.onCollide('ground', () => {});
  mush.onCollide('pipe', () => { mush.dir *= -1; });
  mush.onCollide('hard-block', () => { mush.dir *= -1; });
  mush.onCollide('brick-block', () => { mush.dir *= -1; });
  
  mush.onCollide('player', () => {
    k.destroy(mush);
    // TODO: Make player big
  });
}

function spawn1Up(k: KaboomCtx, x: number, y: number) {
  const oneup = k.add([
    k.sprite('oneup'),
    k.pos(x, y),
    k.area(),
    k.body(),
    k.offscreen({ destroy: true }),
    'oneup-item',
    { dir: 1, speed: 50 },
  ]);
  
  k.tween(oneup.pos.y, y - TILE, 0.3, (v) => { oneup.pos.y = v; });
  
  oneup.onUpdate(() => {
    oneup.move(oneup.dir * oneup.speed, 0);
  });
  
  oneup.onCollide('pipe', () => { oneup.dir *= -1; });
  oneup.onCollide('hard-block', () => { oneup.dir *= -1; });
  
  oneup.onCollide('player', () => {
    k.destroy(oneup);
    // 1-UP effect text
    const txt = k.add([
      k.text('1UP', { size: 8 }),
      k.pos(x, y - 8),
      k.lifespan(1, { fade: 0.5 }),
      k.z(20),
      k.color(0, 255, 0),
    ]);
    k.tween(txt.pos.y, y - 32, 0.8, (v) => { txt.pos.y = v; });
  });
}

function spawnStar(k: KaboomCtx, x: number, y: number) {
  const star = k.add([
    k.sprite('star'),
    k.pos(x, y),
    k.area(),
    k.body({ jumpForce: 300 }),
    k.offscreen({ destroy: true }),
    'star-item',
    { dir: 1, speed: 80, bounceTimer: 0 },
  ]);
  
  k.tween(star.pos.y, y - TILE, 0.3, (v) => { star.pos.y = v; });
  
  star.onUpdate(() => {
    star.move(star.dir * star.speed, 0);
  });
  
  star.onGround(() => {
    star.jump(300);
  });
  
  star.onCollide('pipe', () => { star.dir *= -1; });
  star.onCollide('hard-block', () => { star.dir *= -1; });
  
  star.onCollide('player', () => {
    k.destroy(star);
    // TODO: Invincibility effect
    const txt = k.add([
      k.text('STAR!', { size: 8 }),
      k.pos(x, y - 8),
      k.lifespan(1, { fade: 0.5 }),
      k.z(20),
      k.color(255, 255, 0),
    ]);
    k.tween(txt.pos.y, y - 32, 0.8, (v) => { txt.pos.y = v; });
  });
}

// ── Pipe Entry ──

function checkPipeEntry(k: KaboomCtx, player: GameObj, state: GameState) {
  // Check if player is standing on a pipe that has a secret entry
  const px = Math.round(player.pos.x / TILE);
  const py = Math.round(player.pos.y / TILE);
  
  for (const secret of WORLD_1_1.secrets) {
    if (secret.type === 'pipe-entry' && secret.targetScene) {
      // Check if player is near the pipe
      const pipeTileX = secret.x;
      if (Math.abs(px - pipeTileX) <= 1 && Math.abs(py - secret.y) <= 2) {
        // Pipe entry animation
        state.won = true; // Prevent further input
        k.tween(player.pos.y, player.pos.y + TILE * 2, 0.5, (v) => {
          player.pos.y = v;
        }).then(() => {
          k.go(secret.targetScene!, { returnX: secret.returnX });
        });
        return;
      }
    }
  }
}

// ── Enemy Stomp ──

function stompEnemy(k: KaboomCtx, enemy: GameObj, state: GameState) {
  enemy.alive = false;
  state.score += 100;
  
  if (enemy.is('goomba')) {
    enemy.play('squished');
    enemy.area.shape = new k.Rect(k.vec2(0, 0), 14, 4);
    k.wait(0.5, () => k.destroy(enemy));
  } else if (enemy.is('koopa')) {
    enemy.play('shell');
    enemy.speed = 0;
    // Shell can be kicked
    k.wait(0.3, () => {
      enemy.speed = 150;
    });
  }
  
  // Score popup
  const txt = k.add([
    k.text('100', { size: 8 }),
    k.pos(enemy.pos.x, enemy.pos.y - 16),
    k.lifespan(0.8, { fade: 0.3 }),
    k.z(20),
  ]);
  k.tween(txt.pos.y, txt.pos.y - 24, 0.6, (v) => { txt.pos.y = v; });
}

// ── Player Death ──

function playerDie(k: KaboomCtx, player: GameObj, state: GameState) {
  if (state.dead) return;
  state.dead = true;
  state.lives--;
  
  // Death animation
  player.play('die');
  // Remove physics temporarily
  player.unuse('body');
  
  // Jump up then fall
  let vy = -300;
  player.onUpdate(() => {
    vy += 15;
    player.pos.y += vy * k.dt();
  });
  
  k.wait(2, () => {
    if (state.lives > 0) {
      k.go('level-1-1');
    } else {
      // Game over — go to world map
      k.go('world-map');
    }
  });
}

// ── Win Level ──

function winLevel(k: KaboomCtx, player: GameObj, state: GameState) {
  state.won = true;
  
  // Flag slide animation
  const flagSprites = k.get('flag-sprite');
  if (flagSprites.length > 0) {
    const flag = flagSprites[0];
    k.tween(flag.pos.y, 12 * TILE, 1, (v) => { flag.pos.y = v; });
  }
  
  // Player slides down pole
  player.unuse('body');
  k.tween(player.pos.y, 13 * TILE, 1, (v) => { player.pos.y = v; }).then(() => {
    // Walk to castle
    player.use(k.body());
    player.play('run');
    player.flipX = false;
    
    const walkToCastle = player.onUpdate(() => {
      player.move(WALK_SPEED, 0);
      if (player.pos.x > WORLD_1_1.castleX * TILE) {
        walkToCastle.cancel();
        // Save completion
        localStorage.setItem('completed_1_1', 'true');
        // Transition to world map
        k.wait(1, () => {
          k.go('world-map');
        });
      }
    });
  });
  
  // Score bonus for remaining time
  state.score += state.time * 50;
}
