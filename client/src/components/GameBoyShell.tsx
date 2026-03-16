/**
 * GameBoyShell Component
 *
 * Design: Clean Void — pure black background, device floats centered.
 *
 * Skin image: 944 × 2048 px
 *
 * LCD screen area (measured from black bezel boundaries):
 *   Bezel outer: top=12.2%, bottom=50.5%, left=6.7%, right=92.8%
 *   Inner LCD:   top=13.5%, bottom=49.5%, left=8.8%, right=91.0%
 *   Width: 82.2%  Height: 36.0%
 *
 * Button positions (% of skin image):
 *   D-pad center: 29% x, 63% y
 *   A button:     76% x, 60% y
 *   B button:     57% x, 65% y
 *   SELECT (INFO pill): 30% x, 85.5% y
 *   START (RESTART pill): 46% x, 85.5% y
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { WasmBoy } from 'wasmboy';

const SKIN_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/gameboy-skin_288fe3ff.png';

const ROM_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/SuperMarioBrosMini_9a61d5e5.gb';

// ── Screen area as % of the skin image (944×2048) ──
const SCREEN = {
  left: 8.8,
  top: 13.5,
  width: 82.2,
  height: 36.0,
};

// ── Touch zones as % of the skin image ──
// D-pad
const DPAD_CX = 29;
const DPAD_CY = 63;
const DPAD_ARM_W = 6.5;
const DPAD_ARM_H = 4.5;

// A button (large round, upper-right area)
const A_CX = 75;
const A_CY = 62;
const BTN_R = 6.5;

// B button (smaller, lower-left of A)
const B_CX = 57;
const B_CY = 67;
const BTN_R_B = 5.5;

// SELECT = INFO pill
const SELECT_L = 29;
const SELECT_T = 84.5;
const PILL_W = 10;
const PILL_H = 3.5;

// START = RESTART pill
const START_L = 44;
const START_T = 84.5;

interface JoypadState {
  UP: boolean;
  DOWN: boolean;
  LEFT: boolean;
  RIGHT: boolean;
  A: boolean;
  B: boolean;
  SELECT: boolean;
  START: boolean;
}

interface TouchZone {
  id: keyof JoypadState | 'restart';
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}

const TOUCH_ZONES: TouchZone[] = [
  // D-pad arms
  { id: 'UP',    left: DPAD_CX - DPAD_ARM_W / 2, top: DPAD_CY - DPAD_ARM_H * 2.2, width: DPAD_ARM_W, height: DPAD_ARM_H * 1.8, label: '▲' },
  { id: 'DOWN',  left: DPAD_CX - DPAD_ARM_W / 2, top: DPAD_CY + DPAD_ARM_H * 0.4, width: DPAD_ARM_W, height: DPAD_ARM_H * 1.8, label: '▼' },
  { id: 'LEFT',  left: DPAD_CX - DPAD_ARM_W * 2.8, top: DPAD_CY - DPAD_ARM_H / 2, width: DPAD_ARM_W * 2.2, height: DPAD_ARM_H, label: '◀' },
  { id: 'RIGHT', left: DPAD_CX + DPAD_ARM_W * 0.6, top: DPAD_CY - DPAD_ARM_H / 2, width: DPAD_ARM_W * 2.2, height: DPAD_ARM_H, label: '▶' },
  // A button
  { id: 'A', left: A_CX - BTN_R, top: A_CY - BTN_R, width: BTN_R * 2, height: BTN_R * 2, label: 'A' },
  // B button
  { id: 'B', left: B_CX - BTN_R_B, top: B_CY - BTN_R_B, width: BTN_R_B * 2, height: BTN_R_B * 2, label: 'B' },
  // SELECT (INFO)
  { id: 'SELECT', left: SELECT_L, top: SELECT_T, width: PILL_W, height: PILL_H, label: 'SEL' },
  // START (RESTART)
  { id: 'START', left: START_L, top: START_T, width: PILL_W, height: PILL_H, label: 'STA' },
];

// Set to true to show debug overlays
const DEBUG = false;

const defaultJoypad: JoypadState = {
  UP: false, DOWN: false, LEFT: false, RIGHT: false,
  A: false, B: false, SELECT: false, START: false,
};

export default function GameBoyShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const joypadRef = useRef<JoypadState>({ ...defaultJoypad });
  const activeTouches = useRef<Map<number, keyof JoypadState | 'restart'>>(new Map());

  // ── WasmBoy initialization ──
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    const init = async () => {
      try {
        setStatus('loading');

        await WasmBoy.config(
          {
            headless: false,
            useGbcWhenOptional: false,
            isAudioEnabled: true,
            frameSkip: 1,
            audioBatchProcessing: true,
            timersBatchProcessing: false,
            isAudioAccumulateSamples: true,
            graphicsBatchProcessing: false,
            graphicsDisableScanlineRendering: false,
            tileRendering: true,
            tileCaching: true,
            gameboyFPSCap: 60,
            updateGraphicsCallback: false,
            updateAudioCallback: false,
            saveStateCallback: false,
          },
          canvasRef.current!
        );

        if (cancelled) return;

        await WasmBoy.loadROM(ROM_URL);

        if (cancelled) return;

        await WasmBoy.play();

        // Disable WasmBoy's built-in ResponsiveGamepad so our custom input isn't overwritten each frame
        WasmBoy.disableDefaultJoypad();

        // Force canvas to fill container — WasmBoy resets inline style, so use MutationObserver
        const enforceCanvasStyle = () => {
          if (canvasRef.current) {
            const el = canvasRef.current;
            el.style.setProperty('position', 'absolute', 'important');
            el.style.setProperty('top', '0', 'important');
            el.style.setProperty('left', '0', 'important');
            el.style.setProperty('width', '100%', 'important');
            el.style.setProperty('height', '100%', 'important');
            el.style.setProperty('display', 'block', 'important');
          }
        };
        enforceCanvasStyle();

        // Watch for WasmBoy resetting the style and re-apply
        if (canvasRef.current) {
          const observer = new MutationObserver(enforceCanvasStyle);
          observer.observe(canvasRef.current, { attributes: true, attributeFilter: ['style'] });
          // Store observer to disconnect on cleanup
          (canvasRef.current as any).__styleObserver = observer;
        }

        if (!cancelled) setStatus('ready');
      } catch (err: any) {
        if (!cancelled) {
          console.error('WasmBoy init error:', err);
          setErrorMsg(err?.message || String(err));
          setStatus('error');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      WasmBoy.pause().catch(() => {});
    };
  }, []);

  // ── Push joypad state to WasmBoy ──
  // setJoypadState is synchronous — do NOT call .catch() on it
  const pushJoypad = useCallback(() => {
    const s = joypadRef.current;
    try {
      WasmBoy.setJoypadState({
        UP: s.UP, DOWN: s.DOWN, LEFT: s.LEFT, RIGHT: s.RIGHT,
        A: s.A, B: s.B, SELECT: s.SELECT, START: s.START,
      });
    } catch (_) {}
  }, []);

  // ── Keyboard input ──
  useEffect(() => {
    const keyMap: Record<string, keyof JoypadState> = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      z: 'A', Z: 'A', ' ': 'A',
      x: 'B', X: 'B',
      Enter: 'START',
      Shift: 'SELECT',
      a: 'LEFT', d: 'RIGHT', w: 'UP', s: 'DOWN',
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const btn = keyMap[e.key];
      if (btn) {
        e.preventDefault();
        if (!joypadRef.current[btn]) {
          joypadRef.current[btn] = true;
          pushJoypad();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const btn = keyMap[e.key];
      if (btn) {
        e.preventDefault();
        joypadRef.current[btn] = false;
        pushJoypad();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [pushJoypad]);

  // ── Touch zone helpers ──
  const findZone = useCallback((clientX: number, clientY: number): TouchZone | null => {
    const shell = shellRef.current;
    if (!shell) return null;
    const rect = shell.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;
    for (const zone of TOUCH_ZONES) {
      if (
        xPct >= zone.left && xPct <= zone.left + zone.width &&
        yPct >= zone.top && yPct <= zone.top + zone.height
      ) {
        return zone;
      }
    }
    return null;
  }, []);

  const pressButton = useCallback((id: keyof JoypadState | 'restart') => {
    if (id === 'restart') {
      WasmBoy.reset().then(() => WasmBoy.play()).then(() => WasmBoy.disableDefaultJoypad()).catch((_: any) => {});
      return;
    }
    joypadRef.current[id] = true;
    pushJoypad();
  }, [pushJoypad]);

  const releaseButton = useCallback((id: keyof JoypadState | 'restart') => {
    if (id === 'restart') return;
    joypadRef.current[id] = false;
    pushJoypad();
  }, [pushJoypad]);

  // ── Touch handlers ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const zone = findZone(t.clientX, t.clientY);
      if (zone) {
        activeTouches.current.set(t.identifier, zone.id);
        pressButton(zone.id);
      }
    }
  }, [findZone, pressButton]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const id = activeTouches.current.get(t.identifier);
      if (id !== undefined) {
        releaseButton(id);
        activeTouches.current.delete(t.identifier);
      }
    }
  }, [releaseButton]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const prev = activeTouches.current.get(t.identifier);
      const zone = findZone(t.clientX, t.clientY);
      if (prev !== undefined && (!zone || zone.id !== prev)) {
        releaseButton(prev);
        activeTouches.current.delete(t.identifier);
      }
      if (zone && zone.id !== prev) {
        activeTouches.current.set(t.identifier, zone.id);
        pressButton(zone.id);
      }
    }
  }, [findZone, pressButton, releaseButton]);

  // ── Mouse handlers (desktop) ──
  const mouseHeld = useRef<(keyof JoypadState) | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const zone = findZone(e.clientX, e.clientY);
    if (zone) {
      if (zone.id === 'SELECT' || zone.id === 'START' || zone.id === 'restart') {
        pressButton(zone.id);
        setTimeout(() => releaseButton(zone.id), 300);
      } else {
        mouseHeld.current = zone.id as keyof JoypadState;
        pressButton(zone.id);
      }
    }
  }, [findZone, pressButton, releaseButton]);

  const handleMouseUp = useCallback(() => {
    if (mouseHeld.current) {
      releaseButton(mouseHeld.current);
      mouseHeld.current = null;
    }
  }, [releaseButton]);

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(160,200,40,0.07) 0%, transparent 65%)',
          zIndex: 0,
        }}
      />

      {/* Game Boy Shell */}
      <div
        ref={shellRef}
        className="relative select-none"
        style={{
          height: '100vh',
          maxHeight: '100vh',
          maxWidth: '100vw',
          aspectRatio: '944 / 2048',
          zIndex: 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Skin image */}
        <img
          src={SKIN_URL}
          alt="Game Box"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />

        {/* Emulator canvas container */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${SCREEN.left}%`,
            top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`,
            height: `${SCREEN.height}%`,
            borderRadius: '2px',
            // Stretch canvas to fill regardless of aspect ratio
            display: 'flex',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              // Force stretch to fill container (override WasmBoy's inline style)
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'block',
              imageRendering: 'pixelated',
            }}
          />

          {/* Loading overlay */}
          {status === 'loading' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'rgba(10,20,10,0.95)' }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#8bac0f',
                  fontSize: 'clamp(5px, 1.2vw, 9px)',
                  lineHeight: 2,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 'clamp(6px, 1.5vw, 11px)', marginBottom: '8px' }}>GAME BOX</div>
                <div>LOADING...</div>
                <div style={{ marginTop: '6px', opacity: 0.55, fontSize: 'clamp(4px, 0.9vw, 7px)' }}>
                  SUPER MARIO BROS MINI
                </div>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {status === 'error' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2"
              style={{ background: 'rgba(20,0,0,0.97)' }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#ff4444',
                  fontSize: 'clamp(4px, 1vw, 7px)',
                  lineHeight: 2,
                  textAlign: 'center',
                }}
              >
                <div style={{ marginBottom: '6px' }}>ERROR</div>
                <div style={{ fontSize: 'clamp(3px, 0.8vw, 6px)', color: '#ff8888', wordBreak: 'break-all' }}>
                  {errorMsg.slice(0, 80)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scanline overlay for LCD texture */}
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
            pointerEvents: 'none',
          }}
        />

        {/* Debug overlays */}
        {DEBUG && TOUCH_ZONES.map((zone, i) => (
          <div
            key={i}
            className="absolute flex items-center justify-center"
            style={{
              left: `${zone.left}%`,
              top: `${zone.top}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
              border: '2px solid rgba(255,80,80,0.8)',
              background: 'rgba(255,0,0,0.18)',
              zIndex: 20,
              fontSize: '6px',
              color: 'red',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              pointerEvents: 'none',
            }}
          >
            {zone.label}
          </div>
        ))}
      </div>

      {/* Keyboard hint — fades out after 5s */}
      <KeyboardHint />
    </div>
  );
}

function KeyboardHint() {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(0), 4000);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-opacity duration-1000"
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 'clamp(8px, 1.2vw, 11px)',
        color: 'rgba(255,255,255,0.3)',
        opacity,
        whiteSpace: 'nowrap',
      }}
    >
      Arrows: Move &nbsp;|&nbsp; Z/Space: A &nbsp;|&nbsp; X: B &nbsp;|&nbsp; Enter: Start &nbsp;|&nbsp; Shift: Select
    </div>
  );
}
