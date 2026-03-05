/**
 * Input Manager
 * 
 * Bridges React touch zones and keyboard input to Kaboom game state.
 * Uses a shared state object read by Kaboom every frame.
 * React writes to this via refs for low latency.
 */

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;    // A button
  sprint: boolean;  // B button
  info: boolean;    // INFO button
  restart: boolean; // RESTART button
}

// Singleton input state — shared between React and Kaboom
const inputState: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  sprint: false,
  info: false,
  restart: false,
};

// One-shot flags (consumed after reading)
const oneShotFlags = {
  infoPressed: false,
  restartPressed: false,
  jumpPressed: false,
};

export function getInputState(): InputState {
  return inputState;
}

export function getAndClearOneShots() {
  const result = { ...oneShotFlags };
  oneShotFlags.infoPressed = false;
  oneShotFlags.restartPressed = false;
  oneShotFlags.jumpPressed = false;
  return result;
}

// ── Touch Input API (called by React) ──

export function setTouchInput(button: keyof InputState, pressed: boolean) {
  if (button === 'info' && pressed && !inputState.info) {
    oneShotFlags.infoPressed = true;
  }
  if (button === 'restart' && pressed && !inputState.restart) {
    oneShotFlags.restartPressed = true;
  }
  if (button === 'jump' && pressed && !inputState.jump) {
    oneShotFlags.jumpPressed = true;
  }
  inputState[button] = pressed;
}

// ── Keyboard Input Setup ──

const keyMap: Record<string, keyof InputState> = {
  'ArrowLeft': 'left',
  'ArrowRight': 'right',
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  'a': 'left',
  'd': 'right',
  'w': 'up',
  's': 'down',
  ' ': 'jump',
  'Shift': 'sprint',
  'i': 'info',
  'r': 'restart',
  'I': 'info',
  'R': 'restart',
};

export function initKeyboardInput() {
  const handleKeyDown = (e: KeyboardEvent) => {
    const mapped = keyMap[e.key];
    if (mapped) {
      if (mapped === 'info' && !inputState.info) {
        oneShotFlags.infoPressed = true;
      }
      if (mapped === 'restart' && !inputState.restart) {
        oneShotFlags.restartPressed = true;
      }
      if (mapped === 'jump' && !inputState.jump) {
        oneShotFlags.jumpPressed = true;
      }
      inputState[mapped] = true;
      e.preventDefault();
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    const mapped = keyMap[e.key];
    if (mapped) {
      inputState[mapped] = false;
      e.preventDefault();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}
