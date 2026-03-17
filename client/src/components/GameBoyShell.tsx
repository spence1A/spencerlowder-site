/**
 * GameBoyShell — EmulatorJS (Gambatte/GBC core) in an iframe
 *
 * Architecture:
 * - emulator.html is served as a static page that initializes EmulatorJS
 * - The iframe is positioned exactly over the LCD bezel of the skin image
 * - Touch/keyboard controls are forwarded to the iframe via postMessage
 * - The iframe hides ALL EJS chrome including the virtual gamepad
 *
 * Skin: gameboxwiderbackgroundwithdropshadow.webp  (1011×2048px, RGBA with drop shadow)
 * Inner LCD screen bounds (pixel-accurate from image analysis):
 *   left=13.16%, top=14.40%, width=74.18%, height=34.52%
 *   (inner boundary of the black bezel, where game canvas should render)
 */

import { useRef, useEffect, useCallback, useState } from 'react';

const SKIN_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/gameboxwiderbackgroundwithdropshadow_46e5266c.webp';

// ── Screen area: inner LCD display bounds (pixel-accurate from image analysis) ──
// Skin: 1011×2048px  |  Inner LCD: left=13.16%, top=14.40%, right=87.34%, bottom=48.93%
const SCREEN = { left: 13.16, top: 14.40, width: 74.18, height: 34.52 };

// ── D-pad (center measured from new wider skin) ──
// D-pad center is at approximately x=230/1011=22.7%, y=1330/2048=65.0%
const DPAD_CX = 22.7, DPAD_CY = 65.0;
const DPAD_ARM_W = 8, DPAD_ARM_H = 6;

// ── A / B buttons (measured from wider skin) ──
// A button: x=815/1011=80.6%, y=1290/2048=63.0%
// B button: x=600/1011=59.3%, y=1360/2048=66.4%
const A_CX = 80.6, A_CY = 63.0, A_R = 6.5;
const B_CX = 59.3, B_CY = 66.4, B_R = 5.5;

// ── Pills (SELECT=INFO pill, START=RESTART pill) ──
// INFO pill center: x=412/1011=40.8%, y=1820/2048=88.9%
// RESTART pill center: x=560/1011=55.4%, y=1820/2048=88.9%
const PILL_W = 13, PILL_H = 4.5;
const SELECT_L = 33.8, SELECT_T = 86.9;  // INFO pill
const START_L  = 48.4, START_T  = 86.9;  // RESTART pill

const DEBUG = false;

// ─────────────────────────────────────────────────────────────────────────────
// ButtonZone — native touch events (passive:false) for iOS Safari
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
  const onPressRef = useRef(onPress);
  const onReleaseRef = useRef(onRelease);
  onPressRef.current = onPress;
  onReleaseRef.current = onRelease;

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    const activeTouches = new Set<number>();

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
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
      if (!isTap && activeTouches.size === 0) onReleaseRef.current();
    };

    const handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (!isTap && activeTouches.size === 0) onReleaseRef.current();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    const handleMouseDown = () => {
      if (!isTap) onPressRef.current();
      else { onPressRef.current(); setTimeout(() => onReleaseRef.current(), 200); }
    };
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
  }, [isTap]);

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
          background: 'rgba(255,50,50,0.35)',
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [gameReady, setGameReady] = useState(false);

  // Send a button event to the iframe
  const sendBtn = useCallback((btn: string, eventType: 'keydown' | 'keyup') => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'gamekey',
      btn,
      eventType,
    }, '*');
  }, []);

  const pressBtn = useCallback((btn: string) => sendBtn(btn, 'keydown'), [sendBtn]);
  const releaseBtn = useCallback((btn: string) => sendBtn(btn, 'keyup'), [sendBtn]);
  const tapBtn = useCallback((btn: string, ms = 150) => {
    pressBtn(btn);
    setTimeout(() => releaseBtn(btn), ms);
  }, [pressBtn, releaseBtn]);

  // Restart via EJS API (not page reload)
  const restartGame = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'restart' }, '*');
  }, []);

  // Listen for gameReady message from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'gameReady') {
        setGameReady(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Fallback: hide loading overlay after 20 seconds regardless
  useEffect(() => {
    const t = setTimeout(() => setGameReady(true), 20000);
    return () => clearTimeout(t);
  }, []);

  // Keyboard controls (desktop) — forward to iframe
  useEffect(() => {
    const keyToBtn: Record<string, string> = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      z: 'A', Z: 'A',
      x: 'B', X: 'B',
      Enter: 'START',
      v: 'SELECT', V: 'SELECT',
    };

    const down = (e: KeyboardEvent) => {
      const btn = keyToBtn[e.key];
      if (btn) { e.preventDefault(); pressBtn(btn); }
    };
    const up = (e: KeyboardEvent) => {
      const btn = keyToBtn[e.key];
      if (btn) { e.preventDefault(); releaseBtn(btn); }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [pressBtn, releaseBtn]);

  // Helper: % → absolute style
  const pct = (l: number, t: number, w: number, h: number): React.CSSProperties => ({
    left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`,
  });

  return (
    <>
      <style>{`
        html, body {
          overflow: hidden;
          overscroll-behavior: none;
          height: 100%;
          background: transparent;
          margin: 0;
          padding: 0;
        }
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          height: '100dvh',
          touchAction: 'none',
        }}
      >
        {/* ── Game Boy Shell ── */}
        <div
          style={{
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            // New skin: 1011×2048px
            aspectRatio: '1011 / 2048',
            height: 'min(95dvh, calc(95vw * 2048 / 1011))',
            width: 'min(calc(95dvh * 1011 / 2048), 95vw)',
            maxHeight: '95dvh',
            maxWidth: '95vw',
            zIndex: 1,
            touchAction: 'none',
            flexShrink: 0,
          }}
        >
          {/* Skin image — RGBA with drop shadow, transparent background */}
          <img
            src={SKIN_URL}
            alt="Game Box"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'block',
            }}
            draggable={false}
          />

          {/* ── Loading overlay — shown until game is ready ── */}
          {!gameReady && (
            <div style={{
              position: 'absolute',
              left: `${SCREEN.left}%`, top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`, height: `${SCREEN.height}%`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: '#0a140a', zIndex: 7,
              borderRadius: '2px',
              pointerEvents: 'none',
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

          {/* ── EmulatorJS iframe — clipped to LCD bounds but iframe itself is full-size ── */}
          {/* EJS requires a large canvas (>600px) to avoid ejs_small_screen mode which stops rendering */}
          {/* Solution: clip container at LCD bounds, iframe fills the full GameBoy shell */}
          <div
            style={{
              position: 'absolute',
              left: `${SCREEN.left}%`,
              top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`,
              height: `${SCREEN.height}%`,
              overflow: 'hidden',
              zIndex: 4,
              borderRadius: '2px',
              opacity: gameReady ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          >
            {/* iframe covers the full GameBoy shell, clipped to LCD window by parent overflow:hidden */}
            {/* Percentages are relative to the clip container (which is SCREEN.width% x SCREEN.height% of shell) */}
            {/* left = -SCREEN.left/SCREEN.width*100 = -13.16/74.18*100 = -17.74% */}
            {/* top  = -SCREEN.top/SCREEN.height*100 = -14.40/34.52*100 = -41.71% */}
            {/* w    = 100/SCREEN.width*100 = 100/74.18*100 = 134.8% */}
            {/* h    = 100/SCREEN.height*100 = 100/34.52*100 = 289.7% */}
            <iframe
              ref={iframeRef}
              src="/emulator.html?v=20260317"
              style={{
                position: 'absolute',
                left: '0',
                top: '0',
                width: '134.8%',
                height: '289.7%',
                border: 'none',
                display: 'block',
                background: '#000',
                pointerEvents: 'none',
              }}
              allow="autoplay"
              title="Game Boy Emulator"
            />
          </div>

          {/* Scanline overlay */}
          <div style={{
            position: 'absolute',
            left: `${SCREEN.left}%`, top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`, height: `${SCREEN.height}%`,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.02) 1px, rgba(0,0,0,0.02) 2px)',
            zIndex: 5, borderRadius: '2px', pointerEvents: 'none',
          }} />

          {/* ════════════════════════════════════════
              BUTTON OVERLAY ZONES
          ════════════════════════════════════════ */}

          {/* D-pad UP */}
          <ButtonZone label="▲"
            style={pct(DPAD_CX - DPAD_ARM_W / 2, DPAD_CY - DPAD_ARM_H * 2.3, DPAD_ARM_W, DPAD_ARM_H * 1.9)}
            onPress={() => pressBtn('UP')}
            onRelease={() => releaseBtn('UP')} />

          {/* D-pad DOWN */}
          <ButtonZone label="▼"
            style={pct(DPAD_CX - DPAD_ARM_W / 2, DPAD_CY + DPAD_ARM_H * 0.4, DPAD_ARM_W, DPAD_ARM_H * 1.9)}
            onPress={() => pressBtn('DOWN')}
            onRelease={() => releaseBtn('DOWN')} />

          {/* D-pad LEFT */}
          <ButtonZone label="◀"
            style={pct(DPAD_CX - DPAD_ARM_W * 2.9, DPAD_CY - DPAD_ARM_H / 2, DPAD_ARM_W * 2.3, DPAD_ARM_H)}
            onPress={() => pressBtn('LEFT')}
            onRelease={() => releaseBtn('LEFT')} />

          {/* D-pad RIGHT */}
          <ButtonZone label="▶"
            style={pct(DPAD_CX + DPAD_ARM_W * 0.6, DPAD_CY - DPAD_ARM_H / 2, DPAD_ARM_W * 2.3, DPAD_ARM_H)}
            onPress={() => pressBtn('RIGHT')}
            onRelease={() => releaseBtn('RIGHT')} />

          {/* A button */}
          <ButtonZone label="A"
            style={{ ...pct(A_CX - A_R, A_CY - A_R, A_R * 2, A_R * 2), borderRadius: '50%' }}
            onPress={() => pressBtn('A')}
            onRelease={() => releaseBtn('A')} />

          {/* B button */}
          <ButtonZone label="B"
            style={{ ...pct(B_CX - B_R, B_CY - B_R, B_R * 2, B_R * 2), borderRadius: '50%' }}
            onPress={() => pressBtn('B')}
            onRelease={() => releaseBtn('B')} />

          {/* SELECT pill (INFO) — sends SELECT game button */}
          <ButtonZone label="SEL"
            style={{ ...pct(SELECT_L, SELECT_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={() => tapBtn('SELECT', 150)}
            onRelease={() => {}} isTap />

          {/* RESTART pill — restarts the game via EJS API */}
          <ButtonZone label="RST"
            style={{ ...pct(START_L, START_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={() => restartGame()}
            onRelease={() => {}} isTap />

        </div>

        {/* Keyboard hint — desktop only */}
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
    <div style={{
      position: 'fixed', bottom: '12px',
      left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, pointerEvents: 'none',
      fontFamily: "'Space Mono', monospace",
      fontSize: 'clamp(8px, 1.2vw, 11px)',
      color: `rgba(255,255,255,${opacity * 0.3})`,
      whiteSpace: 'nowrap',
      transition: 'color 1s',
    }}>
      Arrows: Move &nbsp;|&nbsp; Z: Jump &nbsp;|&nbsp; Enter: Start
    </div>
  );
}
