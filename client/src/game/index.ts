/**
 * Game Module — Entry point for Kaboom game initialization.
 * 
 * Initializes engine, loads sprites, registers all scenes,
 * and starts the first scene.
 */

import { initKaboom, loadSprites, destroyKaboom } from './engine';
import { registerLevel1_1 } from './scenes/level1_1';
import { registerSubareaUnderground, registerSubareaSky } from './scenes/subareas';
import { registerWorldMap } from './scenes/worldMap';

export async function startGame(canvas: HTMLCanvasElement) {
  const k = initKaboom(canvas);
  
  // Load all sprites (procedural for MVP)
  await loadSprites(k);
  
  // Register all scenes
  registerLevel1_1(k);
  registerSubareaUnderground(k);
  registerSubareaSky(k);
  registerWorldMap(k);
  
  // Start with level 1-1 immediately (no power-on gate)
  k.go('level-1-1');
  
  return k;
}

export function stopGame() {
  destroyKaboom();
}
