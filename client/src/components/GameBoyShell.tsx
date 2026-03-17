/**
 * GameBoyShell — iOS Safari compatible version
 *
 * Key changes from previous version:
 * - Uses Pointer Events API (onPointerDown/onPointerUp) instead of Touch Events
 *   → Works on iOS Safari, Chrome, Firefox, desktop — all in one
 * - Uses 100dvh (dynamic viewport height) to account for Safari browser chrome
 * - Device scales down to fit within viewport including bottom bar
 * - pointerCapture on each button so drag-off still releases correctly
 * - No preventDefault() calls that Safari blocks in passive listeners
 * - WasmBoy default joypad disabled to prevent frame-by-frame override
 *
 * Skin image: 944 × 2048 px
 * Screen (inner LCD): left=8.8% top=13.5% width=82.2% height=36%
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { WasmBoy } from 'wasmboy';

const SKIN_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/gameboy-skin_288fe3ff.png';

const ROM_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/SuperMarioBrosMini_9a61d5e5.gb';

// ── Screen area as % of skin image (944×2048) ──
// Width: 82.2% of 944px = 776px. Game Boy is 160×144 (aspect 0.9).
// Correct height: 776 * 0.9 / 2048 = 34.1%
const SCREEN = { left: 8.8, top: 13.5, width: 82.2, height: 34.1 };

// ── D-pad (center: 28.3%, 65.2%; bbox x=11.4-44.8%, y=57.7-77.9%) ──
const DPAD_CX = 28.3, DPAD_CY = 65.2;
const DPAD_ARM_W = 8, DPAD_ARM_H = 6;

// ── A / B (pixel-accurate from image analysis) ──
// A center: 82.4%, 62.7%
const A_CX = 82.4, A_CY = 62.7, A_R = 6.5;
// B center: 61.8%, 67.8%
const B_CX = 61.8, B_CY = 67.8, B_R = 5.5;

// ── Pills (pixel-accurate from image analysis) ──
const PILL_W = 12, PILL_H = 5;
// INFO pill center: 37.4%, 89.5%
const SELECT_L = 31.4, SELECT_T = 87;
// RESTART pill center: 53.0%, 88.8%
const START_L  = 47, START_T  = 86.3;

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
// WasmBoy hook
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

  // Continuously push joypad state every frame so WasmBoy can't override it
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      pushJoypad();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [pushJoypad]);

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
      .then(() => { try { WasmBoy.disableDefaultJoypad(); } catch (_) {} })
      .catch(() => {});
  }, []);

  // ── Init ──
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
        try { WasmBoy.disableDefaultJoypad(); } catch (_) {}

        // Force canvas to fill container — WasmBoy resets inline style
        const enforceCanvasStyle = () => {
          const el = canvasRef.current;
          if (!el) return;
          el.style.setProperty('position', 'absolute', 'important');
          el.style.setProperty('top', '0', 'important');
          el.style.setProperty('left', '0', 'important');
          el.style.setProperty('width', '100%', 'important');
          el.style.setProperty('height', '100%', 'important');
          el.style.setProperty('display', 'block', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        };
        enforceCanvasStyle();
        const obs = new MutationObserver(enforceCanvasStyle);
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

  // ── Keyboard (desktop) ──
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
// ButtonZone — uses native touch events (passive:false) for iOS Safari
// ─────────────────────────────────────────────────────────────────────────────
interface BtnProps {
  style: React.CSSProperties;
  onPress: () => void;
  onRelease: () => void;
  isTap?: boolean;
  label?: string;
}

function ButtonZone({ style, onPress, onRelease, isTap = false, label }: BtnProps) {
  const divRef = useRef<HTMLDivElement>(null);
  // Use stable refs so the effect doesn't re-run on every render
  const onPressRef = useRef(onPress);
  const onReleaseRef = useRef(onRelease);
  onPressRef.current = onPress;
  onReleaseRef.current = onRelease;

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    const activeTouches = new Set<number>();

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scroll / zoom on iOS
      e.stopPropagation();
      const wasEmpty = activeTouches.size === 0;
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.add(e.changedTouches[i].identifier);
      }
      if (isTap) {
        onPressRef.current();
        setTimeout(() => onReleaseRef.current(), 200);
      } else if (wasEmpty) {
        onPressRef.current();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (!isTap && activeTouches.size === 0) {
        onReleaseRef.current();
      }
    };

    const handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (!isTap && activeTouches.size === 0) {
        onReleaseRef.current();
      }
    };

    // { passive: false } is REQUIRED for iOS Safari to allow preventDefault()
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    // Also handle mouse clicks for desktop testing
    const handleMouseDown = () => { if (!isTap) onPressRef.current(); else { onPressRef.current(); setTimeout(() => onReleaseRef.current(), 200); } };
    const handleMouseUp = () => { if (!isTap) onReleaseRef.current(); };
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mouseleave', handleMouseUp);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isTap]); // isTap is stable, effect runs once

  return (
    <div
      ref={divRef}
      style={{
        position: 'absolute',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        zIndex: 10,
        WebkitTapHighlightColor: 'transparent',
        ...(DEBUG ? {
          background: 'rgba(255,50,50,0.3)',
          border: '2px solid red',
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
  const [showPressStart, setShowPressStart] = useState(true);

  const dismissStart = useCallback(() => setShowPressStart(false), []);

  const handleStart = useCallback(() => {
    dismissStart();
    // Two START presses: first shows title screen, second begins the game
    tap('START', 250);
    setTimeout(() => tap('START', 250), 600);
  }, [tap, dismissStart]);

  const handleRestart = useCallback(() => {
    dismissStart();
    restart();
  }, [restart, dismissStart]);

  // Helper: % → absolute style
  const pct = (l: number, t: number, w: number, h: number): React.CSSProperties => ({
    left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`,
  });

  return (
    <>
      {/* Global style: prevent scroll bounce on iOS, use dvh */}
      <style>{`
        html, body { 
          overflow: hidden; 
          overscroll-behavior: none;
          height: 100%;
          background: #000;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          // Use dvh to account for Safari browser chrome
          height: '100dvh',
          touchAction: 'none',
        }}
      >
        {/* Ambient lime glow */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(160,200,40,0.07) 0%, transparent 65%)',
          zIndex: 0,
        }} />

        {/* ── Game Boy Shell ── */}
        {/* 
          Skin is 944×2048 (aspect ~0.461).
          We want it to fit within the viewport with some padding.
          Use max-height: 96dvh so buttons are always visible.
        */}
        <div
          style={{
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            // Fit height first, then constrain width
            height: 'min(96dvh, calc(100vw / 0.461))',
            width: 'min(calc(96dvh * 0.461), 100vw)',
            maxHeight: '96dvh',
            maxWidth: '100vw',
            zIndex: 1,
            touchAction: 'none',
          }}
        >
          {/* Skin image */}
          <img
            src={SKIN_URL}
            alt="Game Box"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              zIndex: 0,
              display: 'block',
            }}
            draggable={false}
          />

          {/* ── Emulator canvas ── */}
          <div
            style={{
              position: 'absolute',
              left: `${SCREEN.left}%`,
              top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`,
              height: `${SCREEN.height}%`,
              overflow: 'hidden',
              borderRadius: '2px',
              zIndex: 1,
              pointerEvents: 'none',  // canvas itself never needs pointer events
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

            {/* Loading */}
            {status === 'loading' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(10,20,10,0.97)', zIndex: 5,
              }}>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#8bac0f',
                  fontSize: 'clamp(5px, 2vw, 11px)',
                  lineHeight: 2, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 'clamp(6px, 2.5vw, 13px)', marginBottom: '8px' }}>GAME BOX</div>
                  <div>LOADING...</div>
                  <div style={{ marginTop: '6px', opacity: 0.55, fontSize: 'clamp(4px, 1.5vw, 8px)' }}>
                    SUPER MARIO BROS MINI
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: '8px',
                background: 'rgba(20,0,0,0.97)', zIndex: 5,
              }}>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#ff4444',
                  fontSize: 'clamp(4px, 1.5vw, 8px)',
                  lineHeight: 2, textAlign: 'center',
                }}>
                  <div style={{ marginBottom: '6px' }}>ERROR</div>
                  <div style={{ fontSize: 'clamp(3px, 1vw, 6px)', color: '#ff8888', wordBreak: 'break-all' }}>
                    {errorMsg.slice(0, 100)}
                  </div>
                </div>
              </div>
            )}

            {/* PRESS START placeholder - actual overlay is outside this div */}
          </div>

          {/* Scanline overlay */}
          <div style={{
            position: 'absolute',
            left: `${SCREEN.left}%`, top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`, height: `${SCREEN.height}%`,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.025) 1px, rgba(0,0,0,0.025) 2px)',
            zIndex: 5, borderRadius: '2px', pointerEvents: 'none',
          }} />

          {/* ════════════════════════════════════════
              BUTTON OVERLAY ZONES — Pointer Events
              Each button is its own absolute div.
              touchAction: none is REQUIRED for iOS.
          ════════════════════════════════════════ */}

          {/* D-pad UP */}
          <ButtonZone label="▲"
            style={pct(DPAD_CX - DPAD_ARM_W / 2, DPAD_CY - DPAD_ARM_H * 2.3, DPAD_ARM_W, DPAD_ARM_H * 1.9)}
            onPress={() => { dismissStart(); press('UP'); }}
            onRelease={() => release('UP')} />

          {/* D-pad DOWN */}
          <ButtonZone label="▼"
            style={pct(DPAD_CX - DPAD_ARM_W / 2, DPAD_CY + DPAD_ARM_H * 0.4, DPAD_ARM_W, DPAD_ARM_H * 1.9)}
            onPress={() => { dismissStart(); press('DOWN'); }}
            onRelease={() => release('DOWN')} />

          {/* D-pad LEFT */}
          <ButtonZone label="◀"
            style={pct(DPAD_CX - DPAD_ARM_W * 2.9, DPAD_CY - DPAD_ARM_H / 2, DPAD_ARM_W * 2.3, DPAD_ARM_H)}
            onPress={() => { dismissStart(); press('LEFT'); }}
            onRelease={() => release('LEFT')} />

          {/* D-pad RIGHT */}
          <ButtonZone label="▶"
            style={pct(DPAD_CX + DPAD_ARM_W * 0.6, DPAD_CY - DPAD_ARM_H / 2, DPAD_ARM_W * 2.3, DPAD_ARM_H)}
            onPress={() => { dismissStart(); press('RIGHT'); }}
            onRelease={() => release('RIGHT')} />

          {/* A button */}
          <ButtonZone label="A"
            style={{ ...pct(A_CX - A_R, A_CY - A_R, A_R * 2, A_R * 2), borderRadius: '50%' }}
            onPress={() => { dismissStart(); press('A'); }}
            onRelease={() => release('A')} />

          {/* B button */}
          <ButtonZone label="B"
            style={{ ...pct(B_CX - B_R, B_CY - B_R, B_R * 2, B_R * 2), borderRadius: '50%' }}
            onPress={() => { dismissStart(); press('B'); }}
            onRelease={() => release('B')} />

          {/* SELECT / INFO pill */}
          <ButtonZone label="SEL"
            style={{ ...pct(SELECT_L, SELECT_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={() => { dismissStart(); tap('SELECT', 200); }}
            onRelease={() => {}} isTap />

          {/* START / RESTART pill */}
          <ButtonZone label="RST"
            style={{ ...pct(START_L, START_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={handleRestart}
            onRelease={() => {}} isTap />

          {/* PRESS START overlay — uses ButtonZone for iOS Safari native touch */}
          {status === 'ready' && showPressStart && (
            <ButtonZone
              isTap
              style={{
                left: `${SCREEN.left}%`,
                top: `${SCREEN.top + SCREEN.height * 0.55}%`,
                width: `${SCREEN.width}%`,
                height: `${SCREEN.height * 0.45}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 8,
              }}
              onPress={handleStart}
              onRelease={() => {}}
              label="START"
            />
          )}
          {/* PRESS START text label (non-interactive, just visual) */}
          {status === 'ready' && showPressStart && (
            <div
              style={{
                position: 'absolute',
                left: `${SCREEN.left}%`,
                top: `${SCREEN.top + SCREEN.height * 0.55}%`,
                width: `${SCREEN.width}%`,
                height: `${SCREEN.height * 0.45}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 7,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                color: '#fff',
                fontSize: 'clamp(5px, 2vw, 10px)',
                textAlign: 'center',
                animation: 'blink 1s step-end infinite',
                textShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.4)',
                letterSpacing: '0.05em',
                userSelect: 'none',
              }}>
                PRESS START
              </div>
            </div>
          )}

        </div>

        {/* Keyboard hint — desktop only, fades out */}
        <KeyboardHint />
      </div>
    </>
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
      style={{
        position: 'fixed', bottom: '12px',
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 50, pointerEvents: 'none',
        fontFamily: "'Space Mono', monospace",
        fontSize: 'clamp(8px, 1.2vw, 11px)',
        color: `rgba(255,255,255,${opacity * 0.3})`,
        whiteSpace: 'nowrap',
        transition: 'color 1s',
      }}
    >
      Arrows: Move &nbsp;|&nbsp; Space: Jump &nbsp;|&nbsp; Enter: Start
    </div>
  );
}
