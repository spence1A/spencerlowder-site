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
 * 
 * Coordinate reference (% of image):
 *   Screen LCD:    top=17.5%, left=15.5%, width=70%, height=26%
 *   D-pad center:  (29%, 62.5%)
 *   A button:      (78%, 59.5%)
 *   B button:      (56%, 64%)
 *   INFO:          (43%, 87.5%)
 *   RESTART:       (59%, 87.5%)
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { startGame, stopGame } from '../game';
import { setTouchInput, initKeyboardInput, InputState } from '../game/inputManager';

const SKIN_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/gameboy-skin_288fe3ff.png';

// Screen position as percentage of image dimensions
// Carefully measured from the 944x2048 image
// This is the inner LCD area (dark green screen) inside the black bezel
const SCREEN = {
  left: 15.5,
  top: 18.2,
  width: 70,
  height: 24.5,
};

// Touch zone definitions as percentage of image dimensions
interface TouchZone {
  id: keyof InputState;
  left: number;
  top: number;
  width: number;
  height: number;
  label?: string;
}

// D-pad center: ~29%, 62.5%
// D-pad is about 20% wide and 10% tall
const DPAD_CX = 29;
const DPAD_CY = 62.5;
const DPAD_ARM_W = 7;   // half-width of each arm
const DPAD_ARM_H = 5;   // half-height of each arm

// A button center: ~77%, 66% — radius ~7%
const A_CX = 77;
const A_CY = 66;
const BTN_R = 7;

// B button center: ~57%, 69% — radius ~6%
const B_CX = 57;
const B_CY = 69;
const BTN_R_B = 6;

const TOUCH_ZONES: TouchZone[] = [
  // D-pad Up
  {
    id: 'up',
    left: DPAD_CX - DPAD_ARM_W,
    top: DPAD_CY - DPAD_ARM_H * 2.5,
    width: DPAD_ARM_W * 2,
    height: DPAD_ARM_H * 2,
    label: 'UP',
  },
  // D-pad Down
  {
    id: 'down',
    left: DPAD_CX - DPAD_ARM_W,
    top: DPAD_CY + DPAD_ARM_H * 0.5,
    width: DPAD_ARM_W * 2,
    height: DPAD_ARM_H * 2,
    label: 'DOWN',
  },
  // D-pad Left
  {
    id: 'left',
    left: DPAD_CX - DPAD_ARM_W * 3,
    top: DPAD_CY - DPAD_ARM_H,
    width: DPAD_ARM_W * 2.5,
    height: DPAD_ARM_H * 2,
    label: 'LEFT',
  },
  // D-pad Right
  {
    id: 'right',
    left: DPAD_CX + DPAD_ARM_W * 0.5,
    top: DPAD_CY - DPAD_ARM_H,
    width: DPAD_ARM_W * 2.5,
    height: DPAD_ARM_H * 2,
    label: 'RIGHT',
  },
  // A Button (Jump) — large circle upper-right
  {
    id: 'jump',
    left: A_CX - BTN_R,
    top: A_CY - BTN_R,
    width: BTN_R * 2,
    height: BTN_R * 2,
    label: 'A',
  },
  // B Button (Sprint) — circle below-left of A
  {
    id: 'sprint',
    left: B_CX - BTN_R_B,
    top: B_CY - BTN_R_B,
    width: BTN_R_B * 2,
    height: BTN_R_B * 2,
    label: 'B',
  },
  // INFO Button — small pill near bottom
  {
    id: 'info',
    left: 37,
    top: 85.5,
    width: 12,
    height: 4,
    label: 'INFO',
  },
  // RESTART Button — small pill near bottom
  {
    id: 'restart',
    left: 52,
    top: 85.5,
    width: 14,
    height: 4,
    label: 'RESTART',
  },
];

// Set to true to visualize touch zones for debugging
const DEBUG_TOUCH_ZONES = false;

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
  const findZone = useCallback((clientX: number, clientY: number): TouchZone | null => {
    const shell = shellRef.current;
    if (!shell) return null;
    const rect = shell.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;

    for (const zone of TOUCH_ZONES) {
      if (
        xPct >= zone.left &&
        xPct <= zone.left + zone.width &&
        yPct >= zone.top &&
        yPct <= zone.top + zone.height
      ) {
        return zone;
      }
    }
    return null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const zone = findZone(touch.clientX, touch.clientY);
      if (zone) {
        activeTouches.current.set(touch.identifier, zone.id);
        setTouchInput(zone.id, true);
      }
    }
  }, [findZone]);

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
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const prevButton = activeTouches.current.get(touch.identifier);
      const zone = findZone(touch.clientX, touch.clientY);

      if (prevButton && (!zone || zone.id !== prevButton)) {
        setTouchInput(prevButton, false);
        activeTouches.current.delete(touch.identifier);
      }

      if (zone && zone.id !== prevButton) {
        activeTouches.current.set(touch.identifier, zone.id);
        setTouchInput(zone.id, true);
      }
    }
  }, [findZone]);

  // Also handle mouse clicks for desktop testing of button zones
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const zone = findZone(e.clientX, e.clientY);
    if (zone) {
      setTouchInput(zone.id, true);
      // Release after a short delay for one-shot buttons
      if (zone.id === 'info' || zone.id === 'restart') {
        setTimeout(() => setTouchInput(zone.id, false), 150);
      }
    }
  }, [findZone]);

  const handleMouseUp = useCallback(() => {
    // Release all non-oneshot buttons
    const buttons: (keyof InputState)[] = ['left', 'right', 'up', 'down', 'jump', 'sprint'];
    buttons.forEach(b => setTouchInput(b, false));
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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            borderRadius: '2px',
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
            left: `${SCREEN.left - 0.5}%`,
            top: `${SCREEN.top - 0.5}%`,
            width: `${SCREEN.width + 1}%`,
            height: `${SCREEN.height + 1}%`,
            boxShadow: '0 0 15px 3px rgba(139, 172, 15, 0.12)',
            borderRadius: '3px',
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

        {/* Debug: touch zone visualization */}
        {DEBUG_TOUCH_ZONES && TOUCH_ZONES.map((zone, i) => (
          <div
            key={i}
            className="absolute border-2 border-red-500 bg-red-500/20 flex items-center justify-center"
            style={{
              left: `${zone.left}%`,
              top: `${zone.top}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
              zIndex: 10,
              fontSize: '8px',
              color: 'red',
              fontWeight: 'bold',
            }}
          >
            {zone.label}
          </div>
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
