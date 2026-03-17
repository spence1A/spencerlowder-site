/**
 * GameBoyShell — EmulatorJS (Gambatte/GBC core) in an iframe
 *
 * Architecture:
 * - emulator.html is served as a static page that initializes EmulatorJS
 * - The iframe is positioned exactly over the LCD bezel of the skin image
 * - Touch/keyboard controls are forwarded to the iframe via postMessage
 * - The iframe hides EJS chrome (toolbar, menus) — only the canvas is visible
 *
 * Screen overlay (exact bezel bounds from pixel-accurate image analysis of 944×2048 skin):
 *   left=6.9%, top=12.3%, width=82.2%, height=38.4%
 *
 * Background purple: #8C0CE0 (sampled from image border pixels)
 */

import { useRef, useEffect, useCallback, useState } from 'react';

const SKIN_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/gameboy-skin_288fe3ff.png';

// ── Screen area: exact bezel bounds from pixel-accurate image analysis ──
// Skin: 944×2048px  |  Bezel: left=6.9%, top=12.3%, right=89.1%, bottom=50.7%
const SCREEN = { left: 6.9, top: 12.3, width: 82.2, height: 38.4 };

// ── D-pad (center: 28.3%, 65.2%) ──
const DPAD_CX = 28.3, DPAD_CY = 65.2;
const DPAD_ARM_W = 8, DPAD_ARM_H = 6;

// ── A / B buttons ──
const A_CX = 82.4, A_CY = 62.7, A_R = 6.5;
const B_CX = 61.8, B_CY = 67.8, B_R = 5.5;

// ── Pills ──
const PILL_W = 12, PILL_H = 5;
const SELECT_L = 31.4, SELECT_T = 87;
const START_L  = 47,   START_T  = 86.3;

const DEBUG = false;

// EJS key names for the GB core
const BTN_TO_KEY: Record<string, { key: string; keyCode: number }> = {
  UP:     { key: 'ArrowUp',    keyCode: 38 },
  DOWN:   { key: 'ArrowDown',  keyCode: 40 },
  LEFT:   { key: 'ArrowLeft',  keyCode: 37 },
  RIGHT:  { key: 'ArrowRight', keyCode: 39 },
  A:      { key: 'x',          keyCode: 88 },
  B:      { key: 's',          keyCode: 83 },
  START:  { key: 'Enter',      keyCode: 13 },
  SELECT: { key: 'v',          keyCode: 86 },
};

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
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Send a key event to the iframe
  const sendKey = useCallback((btn: string, eventType: 'keydown' | 'keyup') => {
    const mapping = BTN_TO_KEY[btn];
    if (!mapping) return;
    iframeRef.current?.contentWindow?.postMessage({
      type: 'gamekey',
      key: mapping.key,
      keyCode: mapping.keyCode,
      eventType,
    }, '*');
  }, []);

  const pressBtn = useCallback((btn: string) => sendKey(btn, 'keydown'), [sendKey]);
  const releaseBtn = useCallback((btn: string) => sendKey(btn, 'keyup'), [sendKey]);
  const tapBtn = useCallback((btn: string, ms = 150) => {
    pressBtn(btn);
    setTimeout(() => releaseBtn(btn), ms);
  }, [pressBtn, releaseBtn]);

  // Keyboard controls (desktop)
  useEffect(() => {
    const keyToBtn: Record<string, string> = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      z: 'A', Z: 'A', ' ': 'A',
      x: 'B', X: 'B',
      Enter: 'START',
      Shift: 'SELECT',
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
          background: #8C0CE0;
          margin: 0;
          padding: 0;
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#8C0CE0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          height: '100dvh',
          touchAction: 'none',
        }}
      >
        {/* Radial vignette */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(160,40,255,0.25) 0%, rgba(60,0,120,0.55) 100%)',
          zIndex: 0,
        }} />

        {/* ── Game Boy Shell ── */}
        <div
          style={{
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            aspectRatio: '944 / 2048',
            height: 'min(95dvh, calc(95vw * 2048 / 944))',
            width: 'min(calc(95dvh * 944 / 2048), 95vw)',
            maxHeight: '95dvh',
            maxWidth: '95vw',
            zIndex: 1,
            touchAction: 'none',
            flexShrink: 0,
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
              display: 'block',
            }}
            draggable={false}
          />

          {/* ── EmulatorJS iframe — positioned exactly over the LCD bezel ── */}
          {/* Bezel: left=6.9%, top=12.3%, width=82.2%, height=38.4% */}
          <iframe
            ref={iframeRef}
            src="/emulator.html"
            onLoad={() => setIframeLoaded(true)}
            style={{
              position: 'absolute',
              left: `${SCREEN.left}%`,
              top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`,
              height: `${SCREEN.height}%`,
              border: 'none',
              display: 'block',
              zIndex: 2,
              background: '#000',
              // Prevent iframe from capturing touch events — we handle them in ButtonZones
              pointerEvents: 'none',
            }}
            allow="autoplay"
            title="Game Boy Emulator"
          />

          {/* Scanline overlay */}
          <div style={{
            position: 'absolute',
            left: `${SCREEN.left}%`, top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`, height: `${SCREEN.height}%`,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.02) 1px, rgba(0,0,0,0.02) 2px)',
            zIndex: 5, borderRadius: '2px', pointerEvents: 'none',
          }} />

          {/* Loading overlay — shown until iframe loads */}
          {!iframeLoaded && (
            <div style={{
              position: 'absolute',
              left: `${SCREEN.left}%`, top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`, height: `${SCREEN.height}%`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,20,10,0.97)', zIndex: 6,
              borderRadius: '2px',
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

          {/* SELECT pill */}
          <ButtonZone label="SEL"
            style={{ ...pct(SELECT_L, SELECT_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={() => tapBtn('SELECT', 150)}
            onRelease={() => {}} isTap />

          {/* START pill */}
          <ButtonZone label="STA"
            style={{ ...pct(START_L, START_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={() => tapBtn('START', 150)}
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
