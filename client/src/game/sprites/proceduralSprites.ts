/**
 * Procedural Sprite Generator
 * 
 * Generates pixel-art style placeholder sprites using Canvas API.
 * These are used when no real image assets are provided.
 * Each sprite is designed to be visually clear and game-functional.
 * 
 * All sprites use the classic Game Boy green palette:
 *   #0f380f (darkest), #306230, #8bac0f, #9bbc0f (lightest)
 */

const GB_DARK = '#0f380f';
const GB_MID_DARK = '#306230';
const GB_MID_LIGHT = '#8bac0f';
const GB_LIGHT = '#9bbc0f';

// Color palette for non-GB mode (full color)
const COLORS = {
  brown: '#8B4513',
  darkBrown: '#5C2E00',
  orange: '#D2691E',
  yellow: '#FFD700',
  gold: '#DAA520',
  red: '#DC143C',
  green: '#228B22',
  darkGreen: '#006400',
  lightGreen: '#90EE90',
  blue: '#4169E1',
  skyBlue: '#87CEEB',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#808080',
  lightGray: '#C0C0C0',
  pink: '#FFB6C1',
  beige: '#F5DEB3',
};

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function pixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

function fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ── Tile Sprites ──

function groundTile(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, COLORS.orange);
  // Brick pattern
  for (let y = 0; y < 16; y += 4) {
    fillRect(ctx, 0, y, 16, 1, COLORS.darkBrown);
    const offset = (y % 8 === 0) ? 0 : 4;
    for (let x = offset; x < 16; x += 8) {
      fillRect(ctx, x, y, 1, 4, COLORS.darkBrown);
    }
  }
  // Highlight
  fillRect(ctx, 0, 0, 16, 1, COLORS.brown);
  return c;
}

function brickTile(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, '#C84C09');
  // Brick lines
  for (let y = 0; y < 16; y += 8) {
    fillRect(ctx, 0, y, 16, 1, COLORS.darkBrown);
    const offset = (y === 0) ? 0 : 4;
    for (let x = offset; x < 16; x += 8) {
      fillRect(ctx, x, y, 1, 8, COLORS.darkBrown);
    }
  }
  // Highlights
  fillRect(ctx, 1, 1, 7, 1, '#E8A060');
  fillRect(ctx, 5, 9, 7, 1, '#E8A060');
  return c;
}

function questionBlock(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, COLORS.gold);
  fillRect(ctx, 0, 0, 16, 1, COLORS.yellow);
  fillRect(ctx, 0, 0, 1, 16, COLORS.yellow);
  fillRect(ctx, 15, 0, 1, 16, COLORS.darkBrown);
  fillRect(ctx, 0, 15, 16, 1, COLORS.darkBrown);
  // Question mark
  ctx.fillStyle = COLORS.darkBrown;
  fillRect(ctx, 5, 3, 6, 2, COLORS.darkBrown);
  fillRect(ctx, 9, 5, 2, 2, COLORS.darkBrown);
  fillRect(ctx, 7, 7, 2, 2, COLORS.darkBrown);
  fillRect(ctx, 7, 10, 2, 2, COLORS.darkBrown);
  return c;
}

function usedBlock(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, '#6B4226');
  fillRect(ctx, 0, 0, 16, 1, COLORS.brown);
  fillRect(ctx, 0, 0, 1, 16, COLORS.brown);
  fillRect(ctx, 15, 0, 1, 16, COLORS.darkBrown);
  fillRect(ctx, 0, 15, 16, 1, COLORS.darkBrown);
  return c;
}

function hardBlock(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, COLORS.gray);
  fillRect(ctx, 0, 0, 16, 1, COLORS.lightGray);
  fillRect(ctx, 0, 0, 1, 16, COLORS.lightGray);
  fillRect(ctx, 15, 0, 1, 16, '#404040');
  fillRect(ctx, 0, 15, 16, 1, '#404040');
  // Cross pattern
  fillRect(ctx, 4, 4, 8, 1, '#404040');
  fillRect(ctx, 4, 11, 8, 1, '#404040');
  fillRect(ctx, 7, 1, 1, 14, '#404040');
  return c;
}

function pipeTopLeft(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, COLORS.green);
  fillRect(ctx, 0, 0, 2, 16, COLORS.darkGreen);
  fillRect(ctx, 2, 0, 2, 16, COLORS.lightGreen);
  fillRect(ctx, 0, 0, 16, 2, COLORS.darkGreen);
  fillRect(ctx, 0, 2, 16, 2, COLORS.lightGreen);
  return c;
}

function pipeTopRight(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, COLORS.green);
  fillRect(ctx, 14, 0, 2, 16, COLORS.darkGreen);
  fillRect(ctx, 12, 0, 2, 16, COLORS.lightGreen);
  fillRect(ctx, 0, 0, 16, 2, COLORS.darkGreen);
  fillRect(ctx, 0, 2, 16, 2, COLORS.lightGreen);
  return c;
}

function pipeBodyLeft(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, COLORS.green);
  fillRect(ctx, 0, 0, 2, 16, COLORS.darkGreen);
  fillRect(ctx, 2, 0, 2, 16, COLORS.lightGreen);
  return c;
}

function pipeBodyRight(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 0, 0, 16, 16, COLORS.green);
  fillRect(ctx, 14, 0, 2, 16, COLORS.darkGreen);
  fillRect(ctx, 12, 0, 2, 16, COLORS.lightGreen);
  return c;
}

function flagPole(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 7, 0, 2, 16, COLORS.lightGray);
  fillRect(ctx, 6, 0, 1, 16, COLORS.gray);
  return c;
}

function flagTop(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 7, 4, 2, 12, COLORS.lightGray);
  // Ball on top
  fillRect(ctx, 5, 0, 6, 4, COLORS.gold);
  fillRect(ctx, 6, 0, 4, 1, COLORS.yellow);
  return c;
}

function flagSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  // Flag triangle
  fillRect(ctx, 0, 0, 8, 2, COLORS.red);
  fillRect(ctx, 0, 2, 6, 2, COLORS.red);
  fillRect(ctx, 0, 4, 4, 2, COLORS.red);
  fillRect(ctx, 0, 6, 2, 2, COLORS.red);
  // Pole
  fillRect(ctx, 8, 0, 2, 16, COLORS.lightGray);
  return c;
}

// ── Character Sprites ──

function playerSpritesheet(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(128, 16);
  const frames = 8;
  
  for (let f = 0; f < frames; f++) {
    const ox = f * 16;
    
    // Body
    fillRect(ctx, ox + 4, 2, 8, 10, COLORS.red);
    // Head
    fillRect(ctx, ox + 4, 0, 8, 5, COLORS.beige);
    // Eyes
    pixel(ctx, ox + 6, 2, COLORS.black);
    pixel(ctx, ox + 10, 2, COLORS.black);
    // Hat
    fillRect(ctx, ox + 3, 0, 10, 2, COLORS.red);
    // Legs
    fillRect(ctx, ox + 4, 12, 3, 4, COLORS.blue);
    fillRect(ctx, ox + 9, 12, 3, 4, COLORS.blue);
    // Shoes
    fillRect(ctx, ox + 3, 14, 4, 2, COLORS.brown);
    fillRect(ctx, ox + 9, 14, 4, 2, COLORS.brown);
    
    // Frame variations
    if (f >= 1 && f <= 3) {
      // Running frames - alternate legs
      const legOffset = f === 2 ? 1 : 0;
      fillRect(ctx, ox + 4, 12, 3, 4, COLORS.blue);
      fillRect(ctx, ox + 9 + legOffset, 12, 3, 4, COLORS.blue);
    }
    if (f === 4) {
      // Jump frame - arms up
      fillRect(ctx, ox + 2, 4, 2, 4, COLORS.red);
      fillRect(ctx, ox + 12, 4, 2, 4, COLORS.red);
    }
    if (f === 5) {
      // Die frame - upside down look
      fillRect(ctx, ox + 4, 0, 8, 16, COLORS.red);
      fillRect(ctx, ox + 4, 8, 8, 5, COLORS.beige);
      pixel(ctx, ox + 6, 10, COLORS.black);
      pixel(ctx, ox + 10, 10, COLORS.black);
      // X eyes
      pixel(ctx, ox + 6, 9, COLORS.black);
      pixel(ctx, ox + 10, 9, COLORS.black);
    }
  }
  
  return c;
}

function goombaSpritesheet(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(48, 16);
  
  for (let f = 0; f < 3; f++) {
    const ox = f * 16;
    
    if (f < 2) {
      // Walking frames
      fillRect(ctx, ox + 2, 2, 12, 10, '#8B4513');
      // Eyes
      fillRect(ctx, ox + 4, 4, 3, 3, COLORS.white);
      fillRect(ctx, ox + 9, 4, 3, 3, COLORS.white);
      pixel(ctx, ox + 5, 5, COLORS.black);
      pixel(ctx, ox + 10, 5, COLORS.black);
      // Angry brow
      fillRect(ctx, ox + 4, 3, 3, 1, COLORS.darkBrown);
      fillRect(ctx, ox + 9, 3, 3, 1, COLORS.darkBrown);
      // Feet
      const footOffset = f === 0 ? 0 : 1;
      fillRect(ctx, ox + 1 + footOffset, 12, 5, 4, COLORS.darkBrown);
      fillRect(ctx, ox + 10 - footOffset, 12, 5, 4, COLORS.darkBrown);
    } else {
      // Squished frame
      fillRect(ctx, ox + 1, 12, 14, 4, '#8B4513');
      fillRect(ctx, ox + 3, 13, 3, 2, COLORS.white);
      fillRect(ctx, ox + 10, 13, 3, 2, COLORS.white);
    }
  }
  
  return c;
}

function koopaSpritesheet(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(48, 24);
  
  for (let f = 0; f < 3; f++) {
    const ox = f * 16;
    
    if (f < 2) {
      // Walking frames
      // Shell
      fillRect(ctx, ox + 2, 6, 12, 12, COLORS.green);
      fillRect(ctx, ox + 3, 7, 10, 10, COLORS.darkGreen);
      // Head
      fillRect(ctx, ox + 4, 0, 8, 8, COLORS.beige);
      pixel(ctx, ox + 8, 3, COLORS.black);
      // Feet
      const footOffset = f === 0 ? 0 : 2;
      fillRect(ctx, ox + 3, 18 + footOffset, 4, 4, COLORS.beige);
      fillRect(ctx, ox + 9, 18, 4, 4 + footOffset, COLORS.beige);
    } else {
      // Shell only
      fillRect(ctx, ox + 2, 10, 12, 12, COLORS.green);
      fillRect(ctx, ox + 3, 11, 10, 10, COLORS.darkGreen);
    }
  }
  
  return c;
}

// ── Item Sprites ──

function coinSpritesheet(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(64, 16);
  
  const widths = [8, 6, 2, 6];
  for (let f = 0; f < 4; f++) {
    const ox = f * 16;
    const w = widths[f];
    const xOff = (16 - w) / 2;
    fillRect(ctx, ox + xOff, 2, w, 12, COLORS.gold);
    fillRect(ctx, ox + xOff + 1, 1, w - 2, 1, COLORS.yellow);
    fillRect(ctx, ox + xOff + 1, 14, w - 2, 1, COLORS.darkBrown);
    if (w > 4) {
      fillRect(ctx, ox + xOff + 2, 5, w - 4, 6, COLORS.yellow);
    }
  }
  
  return c;
}

function mushroomSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  // Cap
  fillRect(ctx, 2, 2, 12, 6, COLORS.red);
  fillRect(ctx, 4, 0, 8, 2, COLORS.red);
  // White spots
  fillRect(ctx, 5, 3, 2, 2, COLORS.white);
  fillRect(ctx, 9, 3, 2, 2, COLORS.white);
  // Stem
  fillRect(ctx, 4, 8, 8, 6, COLORS.beige);
  fillRect(ctx, 6, 14, 4, 2, COLORS.beige);
  // Eyes
  pixel(ctx, 6, 10, COLORS.black);
  pixel(ctx, 9, 10, COLORS.black);
  return c;
}

function oneupSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  // Cap (green)
  fillRect(ctx, 2, 2, 12, 6, COLORS.green);
  fillRect(ctx, 4, 0, 8, 2, COLORS.green);
  fillRect(ctx, 5, 3, 2, 2, COLORS.white);
  fillRect(ctx, 9, 3, 2, 2, COLORS.white);
  // Stem
  fillRect(ctx, 4, 8, 8, 6, COLORS.beige);
  fillRect(ctx, 6, 14, 4, 2, COLORS.beige);
  pixel(ctx, 6, 10, COLORS.black);
  pixel(ctx, 9, 10, COLORS.black);
  return c;
}

function starSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  fillRect(ctx, 6, 0, 4, 4, COLORS.yellow);
  fillRect(ctx, 2, 4, 12, 4, COLORS.yellow);
  fillRect(ctx, 0, 6, 16, 4, COLORS.gold);
  fillRect(ctx, 2, 10, 4, 4, COLORS.yellow);
  fillRect(ctx, 10, 10, 4, 4, COLORS.yellow);
  // Eyes
  pixel(ctx, 6, 7, COLORS.black);
  pixel(ctx, 9, 7, COLORS.black);
  return c;
}

function fireFlowerSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  // Petals
  fillRect(ctx, 4, 0, 4, 4, COLORS.red);
  fillRect(ctx, 8, 0, 4, 4, COLORS.yellow);
  fillRect(ctx, 2, 2, 4, 4, COLORS.yellow);
  fillRect(ctx, 10, 2, 4, 4, COLORS.red);
  // Center
  fillRect(ctx, 6, 2, 4, 4, COLORS.white);
  // Stem
  fillRect(ctx, 7, 6, 2, 6, COLORS.green);
  // Leaves
  fillRect(ctx, 4, 8, 3, 2, COLORS.green);
  fillRect(ctx, 9, 10, 3, 2, COLORS.green);
  // Base
  fillRect(ctx, 5, 12, 6, 4, COLORS.green);
  return c;
}

function cloudSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(48, 32);
  fillRect(ctx, 8, 8, 32, 16, COLORS.white);
  fillRect(ctx, 16, 4, 16, 4, COLORS.white);
  fillRect(ctx, 4, 12, 4, 8, COLORS.white);
  fillRect(ctx, 40, 12, 4, 8, COLORS.white);
  // Eyes
  pixel(ctx, 16, 14, COLORS.black);
  pixel(ctx, 28, 14, COLORS.black);
  return c;
}

function bushSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(48, 16);
  fillRect(ctx, 4, 4, 40, 12, COLORS.green);
  fillRect(ctx, 8, 0, 12, 4, COLORS.green);
  fillRect(ctx, 28, 0, 12, 4, COLORS.green);
  fillRect(ctx, 0, 8, 4, 8, COLORS.green);
  fillRect(ctx, 44, 8, 4, 8, COLORS.green);
  return c;
}

function hillSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(80, 32);
  fillRect(ctx, 16, 8, 48, 24, COLORS.lightGreen);
  fillRect(ctx, 24, 4, 32, 4, COLORS.lightGreen);
  fillRect(ctx, 32, 0, 16, 4, COLORS.lightGreen);
  fillRect(ctx, 8, 16, 8, 16, COLORS.lightGreen);
  fillRect(ctx, 64, 16, 8, 16, COLORS.lightGreen);
  fillRect(ctx, 0, 24, 8, 8, COLORS.lightGreen);
  fillRect(ctx, 72, 24, 8, 8, COLORS.lightGreen);
  return c;
}

function castleSprite(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(80, 80);
  // Main body
  fillRect(ctx, 8, 24, 64, 56, COLORS.gray);
  // Towers
  fillRect(ctx, 8, 8, 16, 72, COLORS.gray);
  fillRect(ctx, 56, 8, 16, 72, COLORS.gray);
  // Battlements
  fillRect(ctx, 8, 0, 8, 8, COLORS.lightGray);
  fillRect(ctx, 24, 16, 8, 8, COLORS.lightGray);
  fillRect(ctx, 48, 16, 8, 8, COLORS.lightGray);
  fillRect(ctx, 64, 0, 8, 8, COLORS.lightGray);
  // Door
  fillRect(ctx, 32, 56, 16, 24, COLORS.black);
  fillRect(ctx, 34, 48, 12, 8, COLORS.black);
  // Window
  fillRect(ctx, 34, 32, 12, 8, COLORS.skyBlue);
  return c;
}

// ── Export Map ──

export type SpriteGeneratorMap = Record<string, () => HTMLCanvasElement>;

export const PROCEDURAL_SPRITES: SpriteGeneratorMap = {
  'ground': groundTile,
  'brick': brickTile,
  'question-block': questionBlock,
  'used-block': usedBlock,
  'hard-block': hardBlock,
  'pipe-top-left': pipeTopLeft,
  'pipe-top-right': pipeTopRight,
  'pipe-body-left': pipeBodyLeft,
  'pipe-body-right': pipeBodyRight,
  'flag-pole': flagPole,
  'flag-top': flagTop,
  'flag': flagSprite,
  'castle': castleSprite,
  'cloud': cloudSprite,
  'bush': bushSprite,
  'hill': hillSprite,
  'player': playerSpritesheet,
  'goomba': goombaSpritesheet,
  'koopa': koopaSpritesheet,
  'coin': coinSpritesheet,
  'mushroom': mushroomSprite,
  'oneup': oneupSprite,
  'star': starSprite,
  'fire-flower': fireFlowerSprite,
};
