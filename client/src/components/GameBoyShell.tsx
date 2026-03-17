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

// ── Screen area: inner LCD display bounds (pixel-accurate from image analysis) ──
// Skin: 944×2048px  |  Outer bezel: left=6.9%, top=12.3%, right=89.1%, bottom=50.8%
// Inner LCD: left=11.5%, top=14.5%, right=89.0%, bottom=48.9%
const SCREEN = { left: 11.5, top: 14.5, width: 77.5, height: 34.4 };

// ── D-pad (center: 28.3%, 65.2%) ──
const DPAD_CX = 28.3, DPAD_CY = 65.2;
const DPAD_ARM_W = 8, DPAD_ARM_H = 6;

// ── A / B buttons ──
const A_CX = 82.4, A_CY = 62.7, A_R = 6.5;
const B_CX = 61.8, B_CY = 67.8, B_R = 5.5;

// ── Pills (SELECT=INFO pill, START=RESTART pill) ──
// Pixel-accurate from image: INFO pill center ~x=370 (39.2%), y=1810 (88.4%)
//                            RESTART pill center ~x=510 (54.0%), y=1810 (88.4%)
const PILL_W = 14, PILL_H = 4.5;
const SELECT_L = 32.0, SELECT_T = 86.2;  // INFO pill
const START_L  = 46.5, START_T  = 86.2;  // RESTART pill

// ── INFO / RESTART labels (same pills, larger tap zone) ──
const INFO_L = 32.0, INFO_T = 86.2;
const RESTART_L = 46.5, RESTART_T = 86.2;

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
// Minimum iframe width in px for EJS to use ejs_big_screen mode (game loop runs)
const EJS_MIN_WIDTH = 600;

export default function GameBoyShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [gameReady, setGameReady] = useState(false);
  // iframeScale: scale factor applied to the iframe so it's always >=600px wide internally
  const [iframeScale, setIframeScale] = useState(1);

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

  // ResizeObserver: keep iframe scale so internal width >= EJS_MIN_WIDTH
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const shellW = entry.contentRect.width;
        // LCD pixel width = shellW * SCREEN.width / 100
        const lcdW = shellW * SCREEN.width / 100;
        if (lcdW > 0) {
          // scale so iframe internal width = max(lcdW, EJS_MIN_WIDTH)
          const scale = lcdW >= EJS_MIN_WIDTH ? 1 : lcdW / EJS_MIN_WIDTH;
          setIframeScale(scale);
        }
      }
    });
    ro.observe(shell);
    return () => ro.disconnect();
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

  // Fallback: hide loading overlay after 15 seconds regardless
  useEffect(() => {
    const t = setTimeout(() => setGameReady(true), 15000);
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
          background: #8C0CE0;
          margin: 0;
          padding: 0;
        }
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
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
          ref={shellRef}
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

          {/* ── Loading overlay — shown until game is ready ── */}
          {!gameReady && (
            <div style={{
              position: 'absolute',
              left: `${SCREEN.left}%`, top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`, height: `${SCREEN.height}%`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: '#0a140a', zIndex: 6,
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

          {/* ── EmulatorJS iframe — positioned over the inner LCD screen ── */}
          {/* EJS requires >=600px internal width to avoid ejs_small_screen mode (blank canvas). */}
          {/* Fix: clip container at LCD bounds (overflow:hidden), iframe sized to max(lcdW, 600px), */}
          {/* scaled down by iframeScale so it visually fits the LCD window. */}
          <div
            style={{
              position: 'absolute',
              left: `${SCREEN.left}%`,
              top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`,
              height: `${SCREEN.height}%`,
              overflow: 'hidden',
              zIndex: gameReady ? 4 : 3,
              borderRadius: '2px',
            }}
          >
            <iframe
              ref={iframeRef}
              src="/emulator.html"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                // Internal size: always EJS_MIN_WIDTH (600px) wide so EJS renders in big_screen mode
                // Scaled down by iframeScale to fit the LCD window visually
                width: `${EJS_MIN_WIDTH}px`,
                // Game Boy native resolution is 160×144 (aspect ratio 10:9)
                // Use 160:144 ratio so the game canvas fills the full LCD height
                height: `${EJS_MIN_WIDTH * (144 / 160)}px`,
                border: 'none',
                display: 'block',
                background: '#000',
                pointerEvents: 'none',
                transformOrigin: '0 0',
                transform: `scale(${iframeScale})`,
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

          {/* INFO pill — show keyboard hint */}
          <ButtonZone label="NFO"
            style={{ ...pct(INFO_L, INFO_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={() => {}} onRelease={() => {}} isTap />

          {/* RESTART pill — uses EJS restart API, not page reload */}
          <ButtonZone label="RST"
            style={{ ...pct(RESTART_L, RESTART_T, PILL_W, PILL_H), borderRadius: '99px' }}
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
