import { useRef, useEffect, useCallback, useState, type CSSProperties } from 'react';

const SKIN_URL =
  'https://d2xsxph8kpxj0f.cloudfront.net/92674841/7HRuzqv5FoVkY7UCaEELrN/gameboxwiderbackgroundwithdropshadow_46e5266c.webp';

const SCREEN = { left: 13.16, top: 14.4, width: 74.18, height: 34.52 };

const DPAD_CX = 22.7;
const DPAD_CY = 65.0;
const DPAD_ARM_W = 8;
const DPAD_ARM_H = 6;

const A_CX = 80.6;
const A_CY = 63.0;
const A_R = 6.5;
const B_CX = 59.3;
const B_CY = 66.4;
const B_R = 5.5;

const PILL_W = 13;
const PILL_H = 4.5;
const SELECT_L = 33.8;
const SELECT_T = 86.9;
const START_L = 48.4;
const START_T = 86.9;

const DEBUG = false;
const MIN_EMULATOR_WIDTH = 600;

interface BtnProps {
  style: CSSProperties;
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
      for (let i = 0; i < e.changedTouches.length; i += 1) {
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
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (!isTap && activeTouches.size === 0) onReleaseRef.current();
    };

    const handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (!isTap && activeTouches.size === 0) onReleaseRef.current();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    const handleMouseDown = () => {
      if (!isTap) {
        onPressRef.current();
      } else {
        onPressRef.current();
        setTimeout(() => onReleaseRef.current(), 200);
      }
    };
    const handleMouseUp = () => {
      if (!isTap) onReleaseRef.current();
    };

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
        ...(DEBUG
          ? {
              background: 'rgba(255, 50, 50, 0.35)',
              border: '2px solid red',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: 'red',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }
          : {}),
        ...style,
      }}
    >
      {DEBUG && label}
    </div>
  );
}

export default function GameBoyShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const [gameReady, setGameReady] = useState(false);
  const [needsTap, setNeedsTap] = useState(true);
  const [lcdSize, setLcdSize] = useState({ width: 0, height: 0 });

  const sendBtn = useCallback((btn: string, eventType: 'keydown' | 'keyup') => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'gamekey',
        btn,
        eventType,
      },
      '*',
    );
  }, []);

  const pressBtn = useCallback((btn: string) => sendBtn(btn, 'keydown'), [sendBtn]);
  const releaseBtn = useCallback((btn: string) => sendBtn(btn, 'keyup'), [sendBtn]);
  const tapBtn = useCallback(
    (btn: string, ms = 150) => {
      pressBtn(btn);
      setTimeout(() => releaseBtn(btn), ms);
    },
    [pressBtn, releaseBtn],
  );

  const restartGame = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'restart' }, '*');
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'gameReady') {
        setGameReady(true);
      }
      if (e.data?.type === 'userInteraction') {
        setNeedsTap(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setGameReady(true), 20000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const keyToBtn: Record<string, string> = {
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      z: 'A',
      Z: 'A',
      x: 'B',
      X: 'B',
      Enter: 'START',
      v: 'SELECT',
      V: 'SELECT',
    };

    const down = (e: KeyboardEvent) => {
      const btn = keyToBtn[e.key];
      if (btn) {
        e.preventDefault();
        pressBtn(btn);
      }
    };
    const up = (e: KeyboardEvent) => {
      const btn = keyToBtn[e.key];
      if (btn) {
        e.preventDefault();
        releaseBtn(btn);
      }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [pressBtn, releaseBtn]);

  useEffect(() => {
    const clipEl = clipRef.current;
    if (!clipEl) return;

    const updateSize = (width: number, height: number) => {
      setLcdSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    const syncFromRect = () => {
      const rect = clipEl.getBoundingClientRect();
      updateSize(rect.width, rect.height);
    };

    syncFromRect();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncFromRect);
      return () => window.removeEventListener('resize', syncFromRect);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(clipEl);
    window.addEventListener('orientationchange', syncFromRect);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', syncFromRect);
    };
  }, []);

  const emulatorWidth = Math.max(lcdSize.width, MIN_EMULATOR_WIDTH);
  const emulatorScale = lcdSize.width > 0 ? lcdSize.width / emulatorWidth : 1;
  const emulatorHeight = lcdSize.width > 0 ? lcdSize.height / emulatorScale : lcdSize.height;

  const pct = (l: number, t: number, w: number, h: number): CSSProperties => ({
    left: `${l}%`,
    top: `${t}%`,
    width: `${w}%`,
    height: `${h}%`,
  });

  return (
    <>
      <style>{`
        html, body {
          overflow: hidden;
          overscroll-behavior: none;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at 50% 18%, #2c3138 0%, #101216 42%, #050608 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          height: '100dvh',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none',
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
          <img
            src={SKIN_URL}
            alt="Game Box"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'block',
            }}
            draggable={false}
          />

          {!gameReady && (
            <div
              style={{
                position: 'absolute',
                left: `${SCREEN.left}%`,
                top: `${SCREEN.top}%`,
                width: `${SCREEN.width}%`,
                height: `${SCREEN.height}%`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a140a',
                zIndex: 7,
                borderRadius: '2px',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#8bac0f',
                  fontSize: 'clamp(5px, 2vw, 11px)',
                  lineHeight: 2,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 'clamp(6px, 2.5vw, 13px)', marginBottom: '8px' }}>GAME BOX</div>
                <div>LOADING...</div>
                <div style={{ marginTop: '6px', opacity: 0.55, fontSize: 'clamp(4px, 1.5vw, 8px)' }}>
                  SUPER MARIO BROS MINI
                </div>
              </div>
            </div>
          )}

          {gameReady && needsTap && (
            <div
              style={{
                position: 'absolute',
                left: `${SCREEN.left}%`,
                top: `${SCREEN.top}%`,
                width: `${SCREEN.width}%`,
                height: `${SCREEN.height}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, rgba(10,20,10,0.18), rgba(10,20,10,0.42))',
                zIndex: 8,
                borderRadius: '2px',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#b7d95a',
                  fontSize: 'clamp(6px, 2vw, 10px)',
                  letterSpacing: '0.08em',
                  textAlign: 'center',
                  textShadow: '0 1px 0 rgba(0,0,0,0.55)',
                }}
              >
                TAP SCREEN TO START
              </div>
            </div>
          )}

          <div
            ref={clipRef}
            style={{
              position: 'absolute',
              left: `${SCREEN.left}%`,
              top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`,
              height: `${SCREEN.height}%`,
              overflow: 'hidden',
              zIndex: 4,
              borderRadius: '2px',
              opacity: gameReady && lcdSize.width > 0 ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          >
            <iframe
              ref={iframeRef}
              src="/emulator.html?v=20260317-shellsimplify"
              style={{
                position: 'absolute',
                left: '0',
                top: '0',
                width: `${emulatorWidth}px`,
                height: `${emulatorHeight}px`,
                border: 'none',
                display: 'block',
                background: '#000',
                pointerEvents: 'auto',
                transformOrigin: '0 0',
                transform: `scale(${emulatorScale})`,
              }}
              allow="autoplay"
              title="Game Boy Emulator"
            />
          </div>

          <div
            style={{
              position: 'absolute',
              left: `${SCREEN.left}%`,
              top: `${SCREEN.top}%`,
              width: `${SCREEN.width}%`,
              height: `${SCREEN.height}%`,
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.02) 1px, rgba(0,0,0,0.02) 2px)',
              zIndex: 5,
              borderRadius: '2px',
              pointerEvents: 'none',
            }}
          />

          <ButtonZone
            label="UP"
            style={pct(DPAD_CX - DPAD_ARM_W / 2, DPAD_CY - DPAD_ARM_H * 2.3, DPAD_ARM_W, DPAD_ARM_H * 1.9)}
            onPress={() => pressBtn('UP')}
            onRelease={() => releaseBtn('UP')}
          />

          <ButtonZone
            label="DOWN"
            style={pct(DPAD_CX - DPAD_ARM_W / 2, DPAD_CY + DPAD_ARM_H * 0.4, DPAD_ARM_W, DPAD_ARM_H * 1.9)}
            onPress={() => pressBtn('DOWN')}
            onRelease={() => releaseBtn('DOWN')}
          />

          <ButtonZone
            label="LEFT"
            style={pct(DPAD_CX - DPAD_ARM_W * 2.9, DPAD_CY - DPAD_ARM_H / 2, DPAD_ARM_W * 2.3, DPAD_ARM_H)}
            onPress={() => pressBtn('LEFT')}
            onRelease={() => releaseBtn('LEFT')}
          />

          <ButtonZone
            label="RIGHT"
            style={pct(DPAD_CX + DPAD_ARM_W * 0.6, DPAD_CY - DPAD_ARM_H / 2, DPAD_ARM_W * 2.3, DPAD_ARM_H)}
            onPress={() => pressBtn('RIGHT')}
            onRelease={() => releaseBtn('RIGHT')}
          />

          <ButtonZone
            label="A"
            style={{ ...pct(A_CX - A_R, A_CY - A_R, A_R * 2, A_R * 2), borderRadius: '50%' }}
            onPress={() => pressBtn('A')}
            onRelease={() => releaseBtn('A')}
          />

          <ButtonZone
            label="B"
            style={{ ...pct(B_CX - B_R, B_CY - B_R, B_R * 2, B_R * 2), borderRadius: '50%' }}
            onPress={() => pressBtn('B')}
            onRelease={() => releaseBtn('B')}
          />

          <ButtonZone
            label="SEL"
            style={{ ...pct(SELECT_L, SELECT_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={() => tapBtn('SELECT', 150)}
            onRelease={() => {}}
            isTap
          />

          <ButtonZone
            label="RST"
            style={{ ...pct(START_L, START_T, PILL_W, PILL_H), borderRadius: '99px' }}
            onPress={() => restartGame()}
            onRelease={() => {}}
            isTap
          />
        </div>

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
        position: 'fixed',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        pointerEvents: 'none',
        fontFamily: "'Space Mono', monospace",
        fontSize: 'clamp(8px, 1.2vw, 11px)',
        color: `rgba(255,255,255,${opacity * 0.3})`,
        whiteSpace: 'nowrap',
        transition: 'color 1s',
      }}
    >
      Arrows: Move | Z: Jump | Enter: Start
    </div>
  );
}
