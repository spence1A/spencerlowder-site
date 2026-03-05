/**
 * GameBoyShell Component
 * 
 * Design: Clean Void — Pure black background, device floats centered.
 * 
 * Uses the provided gameboy-skin.png as the base image.
 * Positions the Kaboom canvas precisely in the screen cutout area.
 * Invisible touch zones overlay the D-pad, A, B, INFO, and RESTART buttons.
 * 
 * Image dimensions: 944 x 2048
 * Screen area (inner green LCD): ~11.4% left, ~12.1% top, ~77.1% width, ~23.1% height
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { startGame, stopGame } from '../game';
import { setTouchInput, initKeyboardInput, InputState } from '../game/inputManager';

const SKIN_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/gameboy-skin_288fe3ff.png';

// Screen position as percentage of image dimensions
// Measured from pixel analysis of the 944x2048 image
// The inner LCD area (green screen) inside the black bezel
const SCREEN = {
  left: 10,
  top: 14.8,
  width: 80,
  height: 26.5,
};

// Touch zone definitions as percentage of image dimensions
// Each zone: [left%, top%, width%, height%]
interface TouchZone {
  id: keyof InputState;
  left: number;
  top: number;
  width: number;
  height: number;
}

const TOUCH_ZONES: TouchZone[] = [
  // D-pad Up
  { id: 'up', left: 15.5, top: 50.8, width: 8, height: 4.5 },
  // D-pad Down
  { id: 'down', left: 15.5, top: 58.5, width: 8, height: 4.5 },
  // D-pad Left
  { id: 'left', left: 8, top: 53.7, width: 8, height: 5.5 },
  // D-pad Right
  { id: 'right', left: 23, top: 53.7, width: 8, height: 5.5 },
  // A Button (Jump)
  { id: 'jump', left: 72, top: 49, width: 14, height: 7 },
  // B Button (Sprint)
  { id: 'sprint', left: 55, top: 54, width: 14, height: 7 },
  // INFO Button
  { id: 'info', left: 28, top: 74.5, width: 14, height: 3.5 },
  // RESTART Button
  { id: 'restart', left: 42, top: 74.5, width: 16, height: 3.5 },
];

export default function GameBoyShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const activeTouches = useRef<Map<number, keyof InputState>>(new Map());

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current || loaded) return;
    
    const initGame = async () => {
      try {
        await startGame(canvasRef.current!);
        setLoaded(true);
      } catch (err) {
        console.error('Failed to start game:', err);
      }
    };

    initGame();

    return () => {
      stopGame();
    };
  }, [imageLoaded]);

  // Initialize keyboard input
  useEffect(() => {
    const cleanup = initKeyboardInput();
    return cleanup;
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const shell = shellRef.current;
    if (!shell) return;
    const rect = shell.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const xPct = ((touch.clientX - rect.left) / rect.width) * 100;
      const yPct = ((touch.clientY - rect.top) / rect.height) * 100;

      for (const zone of TOUCH_ZONES) {
        if (
          xPct >= zone.left &&
          xPct <= zone.left + zone.width &&
          yPct >= zone.top &&
          yPct <= zone.top + zone.height
        ) {
          activeTouches.current.set(touch.identifier, zone.id);
          setTouchInput(zone.id, true);
          break;
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const buttonId = activeTouches.current.get(touch.identifier);
      if (buttonId) {
        setTouchInput(buttonId, false);
        activeTouches.current.delete(touch.identifier);
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const shell = shellRef.current;
    if (!shell) return;
    const rect = shell.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const xPct = ((touch.clientX - rect.left) / rect.width) * 100;
      const yPct = ((touch.clientY - rect.top) / rect.height) * 100;

      // Release previous button for this touch
      const prevButton = activeTouches.current.get(touch.identifier);
      if (prevButton) {
        setTouchInput(prevButton, false);
        activeTouches.current.delete(touch.identifier);
      }

      // Check if moved to a new button
      for (const zone of TOUCH_ZONES) {
        if (
          xPct >= zone.left &&
          xPct <= zone.left + zone.width &&
          yPct >= zone.top &&
          yPct <= zone.top + zone.height
        ) {
          activeTouches.current.set(touch.identifier, zone.id);
          setTouchInput(zone.id, true);
          break;
        }
      }
    }
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Game Boy Shell Container */}
      <div
        ref={shellRef}
        className="relative select-none"
        style={{
          maxHeight: '100vh',
          maxWidth: '100vw',
          aspectRatio: '944 / 2048',
          height: '100vh',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchEnd}
      >
        {/* Game Boy Skin Image */}
        <img
          src={SKIN_URL}
          alt="Game Box"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Kaboom Canvas — positioned in the screen cutout */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${SCREEN.left}%`,
            top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`,
            height: `${SCREEN.height}%`,
            borderRadius: '3px',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              imageRendering: 'pixelated',
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'fill',
            }}
          />
        </div>

        {/* Subtle screen glow effect */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${SCREEN.left - 1}%`,
            top: `${SCREEN.top - 1}%`,
            width: `${SCREEN.width + 2}%`,
            height: `${SCREEN.height + 2}%`,
            boxShadow: '0 0 20px 5px rgba(139, 172, 15, 0.15)',
            borderRadius: '4px',
          }}
        />

        {/* Scanline overlay for LCD effect */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${SCREEN.left}%`,
            top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`,
            height: `${SCREEN.height}%`,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)',
            zIndex: 5,
            borderRadius: '2px',
          }}
        />

        {/* Debug: touch zone visualization (hidden in production) */}
        {false && TOUCH_ZONES.map((zone, i) => (
          <div
            key={i}
            className="absolute border border-red-500 bg-red-500/20"
            style={{
              left: `${zone.left}%`,
              top: `${zone.top}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
            }}
          />
        ))}
      </div>

      {/* Ambient glow behind the device */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(180, 210, 50, 0.04) 0%, transparent 60%)',
          zIndex: -1,
        }}
      />

      {/* Keyboard shortcut hint — fades after 3 seconds */}
      <KeyboardHint />
    </div>
  );
}

function KeyboardHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs font-mono z-50 transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
    >
      Arrows/WASD: Move | Space: Jump | Shift: Sprint | I: Info | R: Restart
    </div>
  );
}
