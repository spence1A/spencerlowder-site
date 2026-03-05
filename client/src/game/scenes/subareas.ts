/**
 * Sub-area Scenes
 * 
 * scene("subarea-underground"): Coin bonus room entered via pipe
 * scene("subarea-sky"): Coin heaven reached via vine/beanstalk
 */

import { KaboomCtx } from 'kaboom';
import { UNDERGROUND_SUBAREA, SKY_SUBAREA } from '../../worlds/world_1_1';
import { getInputState, getAndClearOneShots } from '../inputManager';

const TILE = 16;
const GRAVITY = 1200;
const WALK_SPEED = 120;
const JUMP_FORCE = 400;

function buildSubarea(k: KaboomCtx, data: typeof UNDERGROUND_SUBAREA, sceneName: string) {
  k.setGravity(GRAVITY);
  
  // Parse background color
  const bg = data.bgColor;
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  k.setBackground(r, g, b);

  // Place tiles
  for (let y = 0; y < data.height; y++) {
    const row = data.tiles[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      switch (ch) {
        case '=':
          k.add([
            k.sprite('ground'),
            k.pos(x * TILE, y * TILE),
            k.area(),
            k.body({ isStatic: true }),
            'ground',
          ]);
          break;
        case 'H':
          k.add([
            k.sprite('hard-block'),
            k.pos(x * TILE, y * TILE),
            k.area(),
            k.body({ isStatic: true }),
            'hard-block',
          ]);
          break;
        case '*':
          k.add([
            k.sprite('coin', { anim: 'spin' }),
            k.pos(x * TILE, y * TILE),
            k.area(),
            'coin-pickup',
          ]);
          break;
        case '[':
          k.add([
            k.sprite('pipe-top-left'),
            k.pos(x * TILE, y * TILE),
            k.area(),
            k.body({ isStatic: true }),
            'pipe', 'pipe-exit',
            { tileX: x, tileY: y },
          ]);
          break;
        case ']':
          k.add([
            k.sprite('pipe-top-right'),
            k.pos(x * TILE, y * TILE),
            k.area(),
            k.body({ isStatic: true }),
            'pipe', 'pipe-exit',
          ]);
          break;
        case '{':
          k.add([
            k.sprite('pipe-body-left'),
            k.pos(x * TILE, y * TILE),
            k.area(),
            k.body({ isStatic: true }),
            'pipe',
          ]);
          break;
        case '}':
          k.add([
            k.sprite('pipe-body-right'),
            k.pos(x * TILE, y * TILE),
            k.area(),
            k.body({ isStatic: true }),
            'pipe',
          ]);
          break;
      }
    }
  }

  // Player
  const player = k.add([
    k.sprite('player', { anim: 'idle' }),
    k.pos(data.playerStart.x * TILE, data.playerStart.y * TILE),
    k.area({ shape: new k.Rect(k.vec2(0, 0), 14, 16) }),
    k.body(),
    k.anchor('bot'),
    k.z(10),
    'player',
    { dir: 1 },
  ]);

  // Camera
  player.onUpdate(() => {
    const camX = Math.max(128, Math.min(player.pos.x, data.width * TILE - 128));
    k.camPos(camX, 120);
  });

  // Coin counter
  let coins = 0;

  // Movement
  player.onUpdate(() => {
    const input = getInputState();
    const oneShots = getAndClearOneShots();

    if (input.left) {
      player.move(-WALK_SPEED, 0);
      player.flipX = true;
      if (player.isGrounded() && player.curAnim() !== 'run') player.play('run');
    } else if (input.right) {
      player.move(WALK_SPEED, 0);
      player.flipX = false;
      if (player.isGrounded() && player.curAnim() !== 'run') player.play('run');
    } else {
      if (player.isGrounded() && player.curAnim() !== 'idle') player.play('idle');
    }

    if (oneShots.jumpPressed && player.isGrounded()) {
      player.jump(JUMP_FORCE);
      player.play('jump');
    }

    if (!player.isGrounded() && player.curAnim() !== 'jump') {
      player.play('jump');
    }

    // INFO / RESTART
    if (oneShots.infoPressed) k.go('world-map');
    if (oneShots.restartPressed) k.go('level-1-1');
  });

  // Coin collection
  player.onCollide('coin-pickup', (coin) => {
    coins++;
    k.destroy(coin);
    // Coin effect
    const eff = k.add([
      k.text('+1', { size: 8 }),
      k.pos(coin.pos.x, coin.pos.y - 8),
      k.lifespan(0.5, { fade: 0.3 }),
      k.z(20),
      k.color(255, 255, 0),
    ]);
    k.tween(eff.pos.y, eff.pos.y - 16, 0.4, (v) => { eff.pos.y = v; });
  });

  // HUD
  k.add([k.pos(0, 0), k.fixed(), k.z(100)]).onDraw(() => {
    k.drawText({
      text: `COINS: ${coins}`,
      pos: k.vec2(8, 4),
      size: 8,
      color: k.rgb(255, 255, 255),
      fixed: true,
    });
    k.drawText({
      text: sceneName.toUpperCase(),
      pos: k.vec2(100, 4),
      size: 8,
      color: k.rgb(255, 255, 0),
      fixed: true,
    });
  });

  return { player, coins };
}

export function registerSubareaUnderground(k: KaboomCtx) {
  k.scene('subarea-underground', (params: { returnX?: number } = {}) => {
    const { player } = buildSubarea(k, UNDERGROUND_SUBAREA, 'Underground Bonus');
    const returnX = params.returnX || 163;

    // Exit via pipe
    player.onCollide('pipe-exit', () => {
      const input = getInputState();
      if (input.down) {
        // Pipe exit animation
        k.tween(player.pos.y, player.pos.y + TILE * 2, 0.5, (v) => {
          player.pos.y = v;
        }).then(() => {
          k.go('level-1-1');
        });
      }
    });

    // Also exit if player walks to the right edge
    player.onUpdate(() => {
      if (player.pos.x > (UNDERGROUND_SUBAREA.width - 2) * TILE) {
        k.go('level-1-1');
      }
    });

    // Fall death
    player.onUpdate(() => {
      if (player.pos.y > UNDERGROUND_SUBAREA.height * TILE + 32) {
        k.go('level-1-1');
      }
    });
  });
}

export function registerSubareaSky(k: KaboomCtx) {
  k.scene('subarea-sky', (params: { returnX?: number } = {}) => {
    const { player } = buildSubarea(k, SKY_SUBAREA, 'Coin Heaven');
    const returnX = params.returnX || 163;

    // Exit when player falls off the bottom or walks to the right edge
    player.onUpdate(() => {
      if (player.pos.y > SKY_SUBAREA.height * TILE + 32) {
        k.go('level-1-1');
      }
      if (player.pos.x > (SKY_SUBAREA.width - 2) * TILE) {
        k.go('level-1-1');
      }
    });
  });
}
