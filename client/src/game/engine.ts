/**
 * Game Engine — Kaboom.js initialization and sprite loading
 * 
 * Design: Clean Void
 * The game canvas renders inside the Game Boy screen area.
 * Background is handled by the Game Boy shell component.
 */

import kaboom, { KaboomCtx } from 'kaboom';
import { PROCEDURAL_SPRITES } from './sprites/proceduralSprites';
import { ASSET_MANIFEST } from '../assets/manifest';

let k: KaboomCtx | null = null;

export function getKaboom(): KaboomCtx | null {
  return k;
}

/**
 * Initialize Kaboom engine on the given canvas element.
 * Returns the Kaboom context.
 */
export function initKaboom(canvas: HTMLCanvasElement): KaboomCtx {
  if (k) {
    // Already initialized — just return existing context
    return k;
  }

  k = kaboom({
    canvas,
    width: 256,
    height: 240,
    scale: 1,
    crisp: true,
    stretch: true,
    letterbox: false,
    background: [97, 133, 248],  // Sky blue
    global: false,
    touchToMouse: false,
    debug: false,
  });

  return k;
}

/**
 * Load all sprites — tries real assets first, falls back to procedural.
 */
export async function loadSprites(k: KaboomCtx) {
  // Load procedural sprites for MVP
  for (const [key, generator] of Object.entries(PROCEDURAL_SPRITES)) {
    const canvas = generator();
    const dataUrl = canvas.toDataURL();
    
    // Find manifest entry for animation info
    const entry = ASSET_MANIFEST.find(a => a.key === key);
    
    if (entry?.type === 'spritesheet' && entry.frameSize) {
      k.loadSprite(key, dataUrl, {
        sliceX: Math.floor(canvas.width / entry.frameSize[0]),
        sliceY: Math.floor(canvas.height / entry.frameSize[1]),
        anims: entry.anims ? Object.fromEntries(
          Object.entries(entry.anims).map(([name, def]) => [
            name,
            { from: def.from, to: def.to, speed: def.speed || 8, loop: def.loop ?? false }
          ])
        ) : undefined,
      });
    } else {
      k.loadSprite(key, dataUrl);
    }
  }
  
  // Load a simple colored rect as fallback for any missing sprites
  const fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = 16;
  fallbackCanvas.height = 16;
  const fctx = fallbackCanvas.getContext('2d')!;
  fctx.fillStyle = '#FF00FF';
  fctx.fillRect(0, 0, 16, 16);
  k.loadSprite('fallback', fallbackCanvas.toDataURL());
}

export function destroyKaboom() {
  k = null;
}
