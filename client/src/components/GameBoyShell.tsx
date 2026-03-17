/**
 * GameBoyShell Component
 *
 * Design: Clean Void — pure black background, device floats centered.
 *
 * Mobile touch strategy: Each button is a dedicated absolutely-positioned
 * transparent div with its own onTouchStart/onTouchEnd handlers.
 * This avoids the canvas intercepting touch events.
 *
 * Skin image: 944 × 2048 px
 *
 * LCD screen area (inner LCD):
 *   top=13.5%, bottom=49.5%, left=8.8%, right=91.0%
 *   Width: 82.2%  Height: 36.0%
 *
 * Button positions (% of skin image 944×2048):
 *   D-pad center: 29% x, 63% y
 *   A button:     75% x, 62% y  radius ~6.5%
 *   B button:     57% x, 67% y  radius ~5.5%
 *   SELECT (INFO pill): 29% x, 84.5% y
 *   START (RESTART pill): 44% x, 84.5% y
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

// ── D-pad geometry ──
const DPAD_CX = 29;
const DPAD_CY = 64.5;
const DPAD_ARM_W = 6.5;
const DPAD_ARM_H = 4.5;

// ── A / B buttons ──
const A_CX = 75, A_CY = 63, A_R = 6.5;
const B_CX = 57, B_CY = 68, B_R = 5.5;

// ── Pill buttons ──
const PILL_W = 11, PILL_H = 4;
const SELECT_L = 28, SELECT_T = 83.5;
const START_L  = 43, START_T  = 83.5;

// Set to true to show coloured debug overlays on button zones
const DEBUG = false;

interface JoypadState {
  UP: boolean; DOWN: boolean; LEFT: boolean; RIGHT: boolean;
  A: boolean; B: boolean; SELECT: boolean; START: boolean;
}

const defaultJoypad: JoypadState = {
  UP: false, DOWN: false, LEFT: false, RIGHT: false,
  A: false, B: false, SELECT: false, START: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook: manages WasmBoy lifecycle and exposes press/release helpers
// ─────────────────────────────────────────────────────────────────────────────
function useGameBoy(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const joypadRef = useRef<JoypadState>({ ...defaultJoypad });

  const pushJoypad = useCallback(() => {
    const s = joypadRef.current;
    try {
      WasmBoy.setJoypadState({
        UP: s.UP, DOWN: s.DOWN, LEFT: s.LEFT, RIGHT: s.RIGHT,
        A: s.A, B: s.B, SELECT: s.SELECT, START: s.START,
      });
    } catch (_) {}
  }, []);

  const press = useCallback((btn: keyof JoypadState) => {
    joypadRef.current[btn] = true;
    pushJoypad();
  }, [pushJoypad]);

  const release = useCallback((btn: keyof JoypadState) => {
    joypadRef.current[btn] = false;
    pushJoypad();
  }, [pushJoypad]);

  const tap = useCallback((btn: keyof JoypadState, ms = 200) => {
    press(btn);
    setTimeout(() => release(btn), ms);
  }, [press, release]);

  const restart = useCallback(() => {
    WasmBoy.reset()
      .then(() => WasmBoy.play())
      .then(() => WasmBoy.disableDefaultJoypad())
      .catch(() => {});
  }, []);

  // ── WasmBoy init ──
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    (async () => {
      try {
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
        WasmBoy.disableDefaultJoypad();

        // Force canvas to fill its container (WasmBoy resets inline style)
        const enforce = () => {
          const el = canvasRef.current;
          if (!el) return;
          el.style.setProperty('position', 'absolute', 'important');
          el.style.setProperty('top', '0', 'important');
          el.style.setProperty('left', '0', 'important');
          el.style.setProperty('width', '100%', 'important');
          el.style.setProperty('height', '100%', 'important');
          el.style.setProperty('display', 'block', 'important');
        };
        enforce();
        const obs = new MutationObserver(enforce);
        obs.observe(canvasRef.current!, { attributes: true, attributeFilter: ['style'] });

        if (!cancelled) setStatus('ready');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message ?? String(err));
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      WasmBoy.pause().catch(() => {});
    };
  }, [canvasRef]);

  // ── Keyboard input ──
  useEffect(() => {
    const map: Record<string, keyof JoypadState> = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      z: 'A', Z: 'A', ' ': 'A',
      x: 'B', X: 'B',
      Enter: 'START',
      Shift: 'SELECT',
      a: 'LEFT', d: 'RIGHT', w: 'UP', s: 'DOWN',
    };
    const down = (e: KeyboardEvent) => {
      const btn = map[e.key];
      if (btn) { e.preventDefault(); if (!joypadRef.current[btn]) press(btn); }
    };
    const up = (e: KeyboardEvent) => {
      const btn = map[e.key];
      if (btn) { e.preventDefault(); release(btn); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [press, release]);

  return { status, errorMsg, press, release, tap, restart };
}

// ─────────────────────────────────────────────────────────────────────────────
// ButtonZone — a single transparent overlay div that handles touch/mouse
// ─────────────────────────────────────────────────────────────────────────────
interface BtnProps {
  style: React.CSSProperties;
  onPress: () => void;
  onRelease: () => void;
  isTap?: boolean;   // true = press+release immediately (for START/SELECT)
  label?: string;
}

function ButtonZone({ style, onPress, onRelease, isTap = false, label }: BtnProps) {
  const held = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTap) {
      onPress();
      setTimeout(onRelease, 200);
    } else {
      held.current = true;
      onPress();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isTap && held.current) {
      held.current = false;
      onRelease();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isTap) {
      onPress();
      setTimeout(onRelease, 200);
    } else {
      held.current = true;
      onPress();
    }
  };

  const handleMouseUp = () => {
    if (!isTap && held.current) {
      held.current = false;
      onRelease();
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        zIndex: 10,
        // Debug styling
        ...(DEBUG ? {
          background: 'rgba(255,50,50,0.25)',
          border: '2px solid rgba(255,50,50,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          color: 'red',
          fontWeight: 'bold',
          fontFamily: 'monospace',
        } : {}),
        ...style,
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {DEBUG && label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function GameBoyShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, errorMsg, press, release, tap, restart } = useGameBoy(canvasRef);

  // "Press Start" overlay — shown until user taps START for the first time
  const [showPressStart, setShowPressStart] = useState(true);

  const handleStart = useCallback(() => {
    setShowPressStart(false);
    tap('START', 250);
  }, [tap]);

  const handleRestart = useCallback(() => {
    setShowPressStart(false);
    restart();
  }, [restart]);

  // Dismiss press-start on any button interaction
  const dismissStart = useCallback(() => {
    setShowPressStart(false);
  }, []);

  // Helper: pct-based absolute style
  const pct = (l: number, t: number, w: number, h: number): React.CSSProperties => ({
    left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`,
  });

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Ambient lime glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(160,200,40,0.07) 0%, transparent 65%)',
          zIndex: 0,
        }}
      />

      {/* ── Game Boy Shell ── */}
      <div
        className="relative select-none"
        style={{
          height: '100vh',
          maxHeight: '100vh',
          maxWidth: '100vw',
          aspectRatio: '944 / 2048',
          zIndex: 1,
        }}
      >
        {/* Skin image — pointer-events none so it never intercepts touches */}
        <img
          src={SKIN_URL}
          alt="Game Box"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
        />

        {/* ── Emulator canvas ── */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${SCREEN.left}%`,
            top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`,
            height: `${SCREEN.height}%`,
            borderRadius: '2px',
            zIndex: 1,
            pointerEvents: 'none', // canvas must NOT intercept touch
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              display: 'block',
              imageRendering: 'pixelated',
              pointerEvents: 'none',
            }}
          />

          {/* Loading overlay */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'rgba(10,20,10,0.97)', zIndex: 5 }}>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                color: '#8bac0f',
                fontSize: 'clamp(5px, 1.5vw, 10px)',
                lineHeight: 2, textAlign: 'center',
              }}>
                <div style={{ fontSize: 'clamp(6px, 1.8vw, 12px)', marginBottom: '8px' }}>GAME BOX</div>
                <div>LOADING...</div>
                <div style={{ marginTop: '6px', opacity: 0.55, fontSize: 'clamp(4px, 1vw, 7px)' }}>
                  SUPER MARIO BROS MINI
                </div>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2"
              style={{ background: 'rgba(20,0,0,0.97)', zIndex: 5 }}>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                color: '#ff4444',
                fontSize: 'clamp(4px, 1vw, 7px)',
                lineHeight: 2, textAlign: 'center',
              }}>
                <div style={{ marginBottom: '6px' }}>ERROR</div>
                <div style={{ fontSize: 'clamp(3px, 0.8vw, 6px)', color: '#ff8888', wordBreak: 'break-all' }}>
                  {errorMsg.slice(0, 100)}
                </div>
              </div>
            </div>
          )}

          {/* ── PRESS START overlay ── */}
          {status === 'ready' && showPressStart && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-end"
              style={{
                background: 'transparent',
                zIndex: 6,
                paddingBottom: '8%',
                cursor: 'pointer',
              }}
              onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
              onMouseDown={handleStart}
            >
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                color: '#fff',
                fontSize: 'clamp(5px, 1.4vw, 10px)',
                textAlign: 'center',
                animation: 'blink 1s step-end infinite',
                textShadow: '0 0 8px rgba(255,255,255,0.6)',
                letterSpacing: '0.05em',
              }}>
                PRESS START
              </div>
            </div>
          )}
        </div>

        {/* Scanline overlay — pointer-events none */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${SCREEN.left}%`, top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`, height: `${SCREEN.height}%`,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)',
            zIndex: 5, borderRadius: '2px',
          }}
        />

        {/* ════════════════════════════════════════
            BUTTON OVERLAY ZONES
            Each is an absolutely-positioned div
            with its own touch/mouse handlers.
            zIndex: 10 so they sit above canvas.
        ════════════════════════════════════════ */}

        {/* D-pad UP */}
        <ButtonZone label="▲"
          style={pct(DPAD_CX - DPAD_ARM_W / 2, DPAD_CY - DPAD_ARM_H * 2.3, DPAD_ARM_W, DPAD_ARM_H * 1.9)}
          onPress={() => { dismissStart(); press('UP'); }} onRelease={() => release('UP')} />

        {/* D-pad DOWN */}
        <ButtonZone label="▼"
          style={pct(DPAD_CX - DPAD_ARM_W / 2, DPAD_CY + DPAD_ARM_H * 0.4, DPAD_ARM_W, DPAD_ARM_H * 1.9)}
          onPress={() => { dismissStart(); press('DOWN'); }} onRelease={() => release('DOWN')} />

        {/* D-pad LEFT */}
        <ButtonZone label="◀"
          style={pct(DPAD_CX - DPAD_ARM_W * 2.9, DPAD_CY - DPAD_ARM_H / 2, DPAD_ARM_W * 2.3, DPAD_ARM_H)}
          onPress={() => { dismissStart(); press('LEFT'); }} onRelease={() => release('LEFT')} />

        {/* D-pad RIGHT */}
        <ButtonZone label="▶"
          style={pct(DPAD_CX + DPAD_ARM_W * 0.6, DPAD_CY - DPAD_ARM_H / 2, DPAD_ARM_W * 2.3, DPAD_ARM_H)}
          onPress={() => { dismissStart(); press('RIGHT'); }} onRelease={() => release('RIGHT')} />

        {/* A button */}
        <ButtonZone label="A"
          style={{ ...pct(A_CX - A_R, A_CY - A_R, A_R * 2, A_R * 2), borderRadius: '50%' }}
          onPress={() => { dismissStart(); press('A'); }} onRelease={() => release('A')} />

        {/* B button */}
        <ButtonZone label="B"
          style={{ ...pct(B_CX - B_R, B_CY - B_R, B_R * 2, B_R * 2), borderRadius: '50%' }}
          onPress={() => { dismissStart(); press('B'); }} onRelease={() => release('B')} />

        {/* SELECT / INFO pill */}
        <ButtonZone label="SEL"
          style={{ ...pct(SELECT_L, SELECT_T, PILL_W, PILL_H), borderRadius: '99px' }}
          onPress={() => tap('SELECT', 200)} onRelease={() => {}} isTap />

        {/* START / RESTART pill */}
        <ButtonZone label="STA"
          style={{ ...pct(START_L, START_T, PILL_W, PILL_H), borderRadius: '99px' }}
          onPress={handleStart} onRelease={() => {}} isTap />

        {/* RESTART button — same as START but resets the game */}
        {/* Note: the RESTART label on the skin is the second pill (START_L) */}
        {/* We repurpose the area to the right of INFO as a hard reset */}
        {/* Actually the skin has INFO (select) and RESTART (start) pills side by side */}
        {/* So START pill = restart game from beginning */}

      </div>

      {/* Keyboard hint */}
      <KeyboardHint />

      {/* Blink animation */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function KeyboardHint() {
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setOpacity(0), 5000);
    return () => clearTimeout(t);
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
      Arrows: Move &nbsp;|&nbsp; Space: Jump &nbsp;|&nbsp; Enter: Start
    </div>
  );
}
