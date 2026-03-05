/**
 * Asset Manifest — Centralized registry of all game assets.
 * 
 * Resolution order:
 *   1. /assets/theme/<path>  (user override)
 *   2. /assets/default/<path> (built-in fallback)
 *   3. Procedural placeholder (colored rect)
 * 
 * Categories: tiles, player, enemies, items, ui, audio, worldmap
 */

export interface AssetEntry {
  key: string;
  path: string;
  type: 'sprite' | 'sound' | 'spritesheet';
  description: string;
  /** Recommended pixel dimensions [w, h] */
  recommendedSize?: [number, number];
  /** For spritesheets: frame dimensions */
  frameSize?: [number, number];
  /** For spritesheets: animation definitions */
  anims?: Record<string, { from: number; to: number; speed?: number; loop?: boolean }>;
}

export const TILE_SIZE = 16;

export const ASSET_MANIFEST: AssetEntry[] = [
  // ── Tiles ──
  { key: 'ground', path: 'tiles/ground.png', type: 'sprite', description: 'Ground/floor tile', recommendedSize: [16, 16] },
  { key: 'brick', path: 'tiles/brick.png', type: 'sprite', description: 'Breakable brick block', recommendedSize: [16, 16] },
  { key: 'question-block', path: 'tiles/question-block.png', type: 'sprite', description: 'Question mark block (active)', recommendedSize: [16, 16] },
  { key: 'used-block', path: 'tiles/used-block.png', type: 'sprite', description: 'Used/empty block', recommendedSize: [16, 16] },
  { key: 'hard-block', path: 'tiles/hard-block.png', type: 'sprite', description: 'Indestructible stone block', recommendedSize: [16, 16] },
  { key: 'pipe-top-left', path: 'tiles/pipe-top-left.png', type: 'sprite', description: 'Pipe top-left', recommendedSize: [16, 16] },
  { key: 'pipe-top-right', path: 'tiles/pipe-top-right.png', type: 'sprite', description: 'Pipe top-right', recommendedSize: [16, 16] },
  { key: 'pipe-body-left', path: 'tiles/pipe-body-left.png', type: 'sprite', description: 'Pipe body left', recommendedSize: [16, 16] },
  { key: 'pipe-body-right', path: 'tiles/pipe-body-right.png', type: 'sprite', description: 'Pipe body right', recommendedSize: [16, 16] },
  { key: 'flag-pole', path: 'tiles/flag-pole.png', type: 'sprite', description: 'Flagpole', recommendedSize: [16, 16] },
  { key: 'flag-top', path: 'tiles/flag-top.png', type: 'sprite', description: 'Flagpole top ball', recommendedSize: [16, 16] },
  { key: 'flag', path: 'tiles/flag.png', type: 'sprite', description: 'Flag on pole', recommendedSize: [16, 16] },
  { key: 'castle', path: 'tiles/castle.png', type: 'sprite', description: 'End castle', recommendedSize: [80, 80] },
  { key: 'cloud', path: 'tiles/cloud.png', type: 'sprite', description: 'Background cloud', recommendedSize: [48, 32] },
  { key: 'bush', path: 'tiles/bush.png', type: 'sprite', description: 'Background bush', recommendedSize: [48, 16] },
  { key: 'hill', path: 'tiles/hill.png', type: 'sprite', description: 'Background hill', recommendedSize: [80, 32] },

  // ── Player ──
  { key: 'player', path: 'player/player.png', type: 'spritesheet', description: 'Player character spritesheet', recommendedSize: [128, 16], frameSize: [16, 16],
    anims: {
      idle: { from: 0, to: 0 },
      run: { from: 1, to: 3, speed: 12, loop: true },
      jump: { from: 4, to: 4 },
      die: { from: 5, to: 5 },
      grow: { from: 6, to: 7, speed: 8, loop: false },
    }
  },

  // ── Enemies ──
  { key: 'goomba', path: 'enemies/goomba.png', type: 'spritesheet', description: 'Goomba enemy spritesheet', recommendedSize: [48, 16], frameSize: [16, 16],
    anims: {
      walk: { from: 0, to: 1, speed: 6, loop: true },
      squished: { from: 2, to: 2 },
    }
  },
  { key: 'koopa', path: 'enemies/koopa.png', type: 'spritesheet', description: 'Koopa troopa spritesheet', recommendedSize: [48, 24], frameSize: [16, 24],
    anims: {
      walk: { from: 0, to: 1, speed: 6, loop: true },
      shell: { from: 2, to: 2 },
    }
  },

  // ── Items ──
  { key: 'coin', path: 'items/coin.png', type: 'spritesheet', description: 'Coin spritesheet', recommendedSize: [64, 16], frameSize: [16, 16],
    anims: { spin: { from: 0, to: 3, speed: 8, loop: true } }
  },
  { key: 'mushroom', path: 'items/mushroom.png', type: 'sprite', description: 'Power-up mushroom', recommendedSize: [16, 16] },
  { key: 'oneup', path: 'items/oneup.png', type: 'sprite', description: '1-UP mushroom', recommendedSize: [16, 16] },
  { key: 'star', path: 'items/star.png', type: 'sprite', description: 'Invincibility star', recommendedSize: [16, 16] },
  { key: 'fire-flower', path: 'items/fire-flower.png', type: 'sprite', description: 'Fire flower power-up', recommendedSize: [16, 16] },

  // ── UI ──
  { key: 'heart', path: 'ui/heart.png', type: 'sprite', description: 'Life heart icon', recommendedSize: [16, 16] },

  // ── Audio ──
  { key: 'bgm-overworld', path: 'audio/overworld.wav', type: 'sound', description: 'Overworld background music' },
  { key: 'bgm-underground', path: 'audio/underground.wav', type: 'sound', description: 'Underground background music' },
  { key: 'sfx-jump', path: 'audio/jump.wav', type: 'sound', description: 'Jump sound effect' },
  { key: 'sfx-coin', path: 'audio/coin.wav', type: 'sound', description: 'Coin collect sound' },
  { key: 'sfx-stomp', path: 'audio/stomp.wav', type: 'sound', description: 'Enemy stomp sound' },
  { key: 'sfx-bump', path: 'audio/bump.wav', type: 'sound', description: 'Block bump sound' },
  { key: 'sfx-powerup', path: 'audio/powerup.wav', type: 'sound', description: 'Power-up sound' },
  { key: 'sfx-pipe', path: 'audio/pipe.wav', type: 'sound', description: 'Pipe enter sound' },
  { key: 'sfx-die', path: 'audio/die.wav', type: 'sound', description: 'Player death sound' },
  { key: 'sfx-flagpole', path: 'audio/flagpole.wav', type: 'sound', description: 'Flagpole slide sound' },
  { key: 'sfx-1up', path: 'audio/1up.wav', type: 'sound', description: '1-UP sound' },
  { key: 'sfx-break', path: 'audio/break.wav', type: 'sound', description: 'Brick break sound' },
];

export function getAssetsByCategory(category: string): AssetEntry[] {
  const categoryMap: Record<string, string[]> = {
    tiles: ['ground', 'brick', 'question-block', 'used-block', 'hard-block', 'pipe-top-left', 'pipe-top-right', 'pipe-body-left', 'pipe-body-right', 'flag-pole', 'flag-top', 'flag', 'castle', 'cloud', 'bush', 'hill'],
    player: ['player'],
    enemies: ['goomba', 'koopa'],
    items: ['coin', 'mushroom', 'oneup', 'star', 'fire-flower'],
    ui: ['heart'],
    audio: ASSET_MANIFEST.filter(a => a.path.startsWith('audio/')).map(a => a.key),
  };
  const keys = categoryMap[category] || [];
  return ASSET_MANIFEST.filter(a => keys.includes(a.key));
}
