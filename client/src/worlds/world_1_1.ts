/**
 * World 1-1 Level Definition
 * 
 * Faithful structural replica of Super Mario Bros World 1-1.
 * All secret positions, pipe entries, hidden blocks, and enemy placements
 * are based on the original level layout.
 * 
 * Tile Legend:
 *   = : ground block
 *   - : brick block
 *   ? : question block (coin)
 *   Q : question block (mushroom/power-up)
 *   ! : hidden block (invisible until hit from below)
 *   H : hard/stone block
 *   [ : pipe top-left
 *   ] : pipe top-right
 *   { : pipe body-left
 *   } : pipe body-right
 *   | : flag pole
 *   ^ : flag pole top
 *   > : flag on pole
 *   C : castle
 *   . : empty space (air)
 *   @ : player spawn
 *   G : goomba spawn
 *   K : koopa spawn
 *   * : coin (floating)
 * 
 * The level is 212 tiles wide x 15 tiles tall (original NES dimensions).
 * Row 0 = top, Row 14 = bottom. Ground is rows 13-14.
 */

export interface SecretDef {
  /** Tile X coordinate */
  x: number;
  /** Tile Y coordinate */
  y: number;
  /** Type of secret */
  type: 'hidden-block' | 'multi-coin' | '1up-block' | 'star-block' | 'pipe-entry' | 'vine-block' | 'powerup-block';
  /** What happens when triggered */
  action: 'spawn-coin' | 'spawn-coins' | 'spawn-1up' | 'spawn-star' | 'spawn-mushroom' | 'teleport-subarea' | 'spawn-vine';
  /** For teleport actions: which subarea scene */
  targetScene?: string;
  /** For teleport actions: where to return in the main level (tile X) */
  returnX?: number;
  /** Confidence note about coordinate accuracy */
  note?: string;
}

export interface EnemySpawn {
  type: 'goomba' | 'koopa';
  x: number;
  y: number;
  /** Direction: -1 = left, 1 = right */
  dir: number;
}

export interface LevelDef {
  name: string;
  /** Width in tiles */
  width: number;
  /** Height in tiles */
  height: number;
  /** Tile map rows (top to bottom) */
  tiles: string[];
  /** Player start position in tiles */
  playerStart: { x: number; y: number };
  /** Enemy spawn definitions */
  enemies: EnemySpawn[];
  /** Secret/hidden block definitions */
  secrets: SecretDef[];
  /** Flag pole X position */
  flagX: number;
  /** Castle X position */
  castleX: number;
  /** Background color */
  bgColor: string;
  /** Time limit in seconds */
  timeLimit: number;
}

/**
 * World 1-1 Level Data
 * 
 * Layout notes (referencing original SMB 1-1):
 * - Starts with flat ground, first ? block at tile ~16
 * - First pit at ~69-70
 * - Pipe section starts ~28
 * - Underground bonus area accessible via pipe at ~38
 * - Staircase to flagpole at end ~198-202
 * 
 * COORDINATE ACCURACY NOTE:
 * Positions are approximate to the original 1-1 layout.
 * The data format allows easy coordinate adjustment.
 * Uncertain coordinates are annotated with notes.
 */

// Build the tile map programmatically for accuracy
function buildTileMap(): string[] {
  const W = 212;
  const H = 15;
  
  // Initialize empty map
  const map: string[][] = [];
  for (let y = 0; y < H; y++) {
    map.push(new Array(W).fill('.'));
  }
  
  // Helper to set a tile
  const set = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      map[y][x] = ch;
    }
  };
  
  // Helper to fill a range
  const fill = (x1: number, y1: number, x2: number, y2: number, ch: string) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        set(x, y, ch);
      }
    }
  };
  
  // ── Ground ──
  // Ground runs along bottom two rows with gaps for pits
  // Ground sections (x-start to x-end inclusive):
  const groundSections = [
    [0, 68],    // Start to first pit
    [71, 85],   // After first pit
    [89, 152],  // Middle section (includes underground pipe return area)
    [155, 211], // Final section to end
  ];
  
  for (const [start, end] of groundSections) {
    fill(start, 13, end, 14, '=');
  }
  
  // ── Question Blocks (Row 9, above ground) ──
  // First cluster: tile 16
  set(16, 9, '?');  // Coin
  
  // Second cluster: tiles 20-23
  set(20, 9, '-');  // Brick
  set(21, 9, 'Q');  // Question block - mushroom/power-up
  set(22, 9, '-');  // Brick
  set(23, 9, '?');  // Coin
  set(22, 5, '?');  // Upper question block - coin (above the cluster)
  
  // ── Pipes ──
  // Pipe 1 (small, 2 tiles tall) at x=28
  set(28, 11, '['); set(29, 11, ']');
  set(28, 12, '{'); set(29, 12, '}');
  
  // Pipe 2 (3 tiles tall) at x=38
  set(38, 10, '['); set(39, 10, ']');
  set(38, 11, '{'); set(39, 11, '}');
  set(38, 12, '{'); set(39, 12, '}');
  
  // Pipe 3 (4 tiles tall) at x=46
  set(46, 9, '['); set(47, 9, ']');
  set(46, 10, '{'); set(47, 10, '}');
  set(46, 11, '{'); set(47, 11, '}');
  set(46, 12, '{'); set(47, 12, '}');
  
  // Pipe 4 (4 tiles tall) at x=57 — ENTERABLE (leads to underground)
  set(57, 9, '['); set(58, 9, ']');
  set(57, 10, '{'); set(58, 10, '}');
  set(57, 11, '{'); set(58, 11, '}');
  set(57, 12, '{'); set(58, 12, '}');
  
  // ── Brick/Block section after first pit (tiles 77-83) ──
  // Upper row of blocks at row 5
  set(77, 9, '-');
  set(78, 9, 'Q');  // Question - mushroom/star
  set(79, 9, '-');
  
  // Floating blocks at row 5 (above)
  set(80, 5, '-');
  set(81, 5, '-');
  set(82, 5, '-');
  set(83, 5, '-');
  set(84, 5, '-');
  set(85, 5, '-');
  set(86, 5, '-');
  set(87, 5, '-');
  
  // ── Mid-section blocks (around tiles 91-103) ──
  set(91, 9, '-');
  set(92, 9, '-');
  set(93, 9, '?');  // Coin
  set(94, 9, '-');  // Contains hidden star in original? Annotated below
  
  // Upper blocks
  set(94, 5, '-');
  set(95, 5, '-');
  set(96, 5, '-');
  set(100, 5, '?');  // Coin
  set(101, 5, '?');  // Coin  
  set(106, 5, '?');  // Coin
  
  // Lower blocks
  set(100, 9, '-');
  set(101, 9, '-');
  set(106, 9, '-');
  set(109, 9, '-');
  set(110, 9, '?');  // Coin
  set(111, 9, '-');
  
  // ── Brick row section (tiles 118-130) ──
  set(118, 9, '-');
  set(119, 9, '-');
  set(120, 9, '-');
  set(121, 9, '?');  // Coin
  set(122, 9, '-');
  
  // Upper bricks
  set(128, 5, '-');
  set(129, 5, '-');
  set(130, 5, '-');
  
  // ── Staircase blocks before second pit ──
  // Small staircase at ~134
  for (let i = 0; i < 4; i++) {
    fill(134 + i, 12 - i, 134 + i, 12, 'H');
  }
  // Descending after gap
  for (let i = 0; i < 4; i++) {
    fill(140 + (3 - i), 12 - i, 140 + (3 - i), 12, 'H');
  }
  
  // ── Another staircase section ~148 ──
  for (let i = 0; i < 4; i++) {
    fill(148 + i, 12 - i, 148 + i, 12, 'H');
  }
  // Gap, then descending
  for (let i = 0; i < 4; i++) {
    fill(155 + (3 - i), 12 - i, 155 + (3 - i), 12, 'H');
  }
  
  // ── Pipe after stairs at ~163 ──
  set(163, 11, '['); set(164, 11, ']');
  set(163, 12, '{'); set(164, 12, '}');
  
  // ── Final blocks section ~168 ──
  set(168, 9, '-');
  set(169, 9, '-');
  set(170, 9, '?');  // Coin
  set(171, 9, '-');
  
  // ── End staircase to flagpole ~181-189 ──
  for (let i = 0; i < 8; i++) {
    fill(181 + i, 12 - i, 181 + i, 12, 'H');
  }
  
  // ── Flagpole at ~189 ──
  set(198, 4, '^');  // Flag top
  for (let r = 5; r <= 12; r++) {
    set(198, r, '|');
  }
  
  return map.map(row => row.join(''));
}

const WORLD_1_1: LevelDef = {
  name: 'World 1-1',
  width: 212,
  height: 15,
  tiles: buildTileMap(),
  playerStart: { x: 3, y: 12 },
  
  enemies: [
    // Enemy placements based on original 1-1
    { type: 'goomba', x: 22, y: 12, dir: -1 },
    { type: 'goomba', x: 40, y: 12, dir: -1 },
    { type: 'goomba', x: 51, y: 12, dir: -1 },
    { type: 'goomba', x: 52, y: 12, dir: -1 },
    { type: 'goomba', x: 80, y: 4, dir: -1 },   // On upper platform
    { type: 'goomba', x: 82, y: 4, dir: -1 },   // On upper platform
    { type: 'koopa',  x: 107, y: 12, dir: -1 },
    { type: 'goomba', x: 114, y: 12, dir: -1 },
    { type: 'goomba', x: 115, y: 12, dir: -1 },
    { type: 'goomba', x: 124, y: 12, dir: -1 },
    { type: 'goomba', x: 125, y: 12, dir: -1 },
    { type: 'goomba', x: 128, y: 12, dir: -1 },
    { type: 'goomba', x: 129, y: 12, dir: -1 },
    { type: 'goomba', x: 174, y: 12, dir: -1 },
    { type: 'goomba', x: 175, y: 12, dir: -1 },
  ],
  
  secrets: [
    // ── Hidden 1-UP block ──
    // In the original, there's a hidden 1-UP block above the first pipe area
    {
      x: 64, y: 8,
      type: 'hidden-block',
      action: 'spawn-1up',
      note: 'Hidden 1-UP mushroom block. In original, located near tile 64 row 8. Adjust x/y if needed.',
    },
    
    // ── Multi-coin brick ──
    // Several bricks in the original contain multiple coins when hit repeatedly
    {
      x: 94, y: 5,
      type: 'multi-coin',
      action: 'spawn-coins',
      note: 'Multi-coin brick. Hit repeatedly for up to 10 coins before becoming used.',
    },
    
    // ── Star block ──
    // Hidden in a brick block
    {
      x: 94, y: 9,
      type: 'star-block',
      action: 'spawn-star',
      note: 'Star power-up hidden in brick. Approximate position.',
    },
    
    // ── Pipe entry to underground bonus area ──
    {
      x: 57, y: 12,
      type: 'pipe-entry',
      action: 'teleport-subarea',
      targetScene: 'subarea-underground',
      returnX: 163,
      note: 'Pipe at x=57 leads to underground coin room. Player enters by pressing down on pipe. Returns near x=163.',
    },
    
    // ── Hidden coin blocks ──
    {
      x: 21, y: 5,
      type: 'hidden-block',
      action: 'spawn-coin',
      note: 'Hidden coin block above the first block cluster.',
    },
    
    // ── Upper route / vine block ──
    // In the original, there is a beanstalk that leads to a coin heaven
    // Located in the block section around tile 118
    {
      x: 118, y: 9,
      type: 'vine-block',
      action: 'teleport-subarea',
      targetScene: 'subarea-sky',
      returnX: 163,
      note: 'Vine/beanstalk block. Leads to sky bonus area (coin heaven). Returns near x=163.',
    },
    
    // ── Power-up blocks ──
    {
      x: 21, y: 9,
      type: 'powerup-block',
      action: 'spawn-mushroom',
      note: 'First power-up question block. Gives mushroom (or fire flower if big).',
    },
    {
      x: 78, y: 9,
      type: 'powerup-block',
      action: 'spawn-mushroom',
      note: 'Second power-up question block after first pit.',
    },
  ],
  
  flagX: 198,
  castleX: 203,
  bgColor: '#6185F8',
  timeLimit: 400,
};

export default WORLD_1_1;

/**
 * Underground Bonus Area Definition
 * A small room full of coins, entered via pipe.
 */
export const UNDERGROUND_SUBAREA = {
  name: 'Underground Bonus',
  width: 32,
  height: 15,
  tiles: (() => {
    const W = 32;
    const H = 15;
    const m: string[][] = [];
    for (let y = 0; y < H; y++) {
      m.push(new Array(W).fill('.'));
    }
    // Ceiling
    for (let x = 0; x < W; x++) { m[0][x] = 'H'; m[1][x] = 'H'; }
    // Floor
    for (let x = 0; x < W; x++) { m[13][x] = '='; m[14][x] = '='; }
    // Walls
    for (let y = 0; y < H; y++) { m[y][0] = 'H'; m[y][W - 1] = 'H'; }
    // Coin rows
    for (let x = 3; x < 28; x++) { m[5][x] = '*'; }
    for (let x = 3; x < 28; x++) { m[8][x] = '*'; }
    for (let x = 3; x < 28; x++) { m[11][x] = '*'; }
    // Exit pipe at right side
    m[11][29] = '['; m[11][30] = ']';
    m[12][29] = '{'; m[12][30] = '}';
    return m.map(r => r.join(''));
  })(),
  playerStart: { x: 2, y: 12 },
  bgColor: '#000000',
};

/**
 * Sky Bonus Area (Coin Heaven)
 * Reached via vine/beanstalk. Floating coins in the sky.
 */
export const SKY_SUBAREA = {
  name: 'Coin Heaven',
  width: 40,
  height: 15,
  tiles: (() => {
    const W = 40;
    const H = 15;
    const m: string[][] = [];
    for (let y = 0; y < H; y++) {
      m.push(new Array(W).fill('.'));
    }
    // Cloud platforms
    for (let x = 3; x < 12; x++) { m[10][x] = 'H'; }
    for (let x = 15; x < 24; x++) { m[8][x] = 'H'; }
    for (let x = 27; x < 36; x++) { m[6][x] = 'H'; }
    // Coins on platforms
    for (let x = 4; x < 11; x++) { m[9][x] = '*'; }
    for (let x = 16; x < 23; x++) { m[7][x] = '*'; }
    for (let x = 28; x < 35; x++) { m[5][x] = '*'; }
    // More floating coins
    for (let x = 5; x < 10; x++) { m[6][x] = '*'; }
    return m.map(r => r.join(''));
  })(),
  playerStart: { x: 2, y: 9 },
  bgColor: '#6185F8',
};
