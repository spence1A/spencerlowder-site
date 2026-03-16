declare module 'wasmboy' {
  interface WasmBoyOptions {
    headless?: boolean;
    useGbcWhenOptional?: boolean;
    isAudioEnabled?: boolean;
    frameSkip?: number;
    audioBatchProcessing?: boolean;
    timersBatchProcessing?: boolean;
    isAudioAccumulateSamples?: boolean;
    graphicsBatchProcessing?: boolean;
    graphicsDisableScanlineRendering?: boolean;
    tileRendering?: boolean;
    tileCaching?: boolean;
    gameboyFPSCap?: number;
    updateGraphicsCallback?: boolean | ((imageDataArray: Uint8ClampedArray) => void);
    updateAudioCallback?: boolean | ((leftChannel: Float32Array, rightChannel: Float32Array) => void);
    saveStateCallback?: boolean | ((saveStateObject: object) => void);
  }

  interface JoypadState {
    UP?: boolean;
    DOWN?: boolean;
    LEFT?: boolean;
    RIGHT?: boolean;
    A?: boolean;
    B?: boolean;
    SELECT?: boolean;
    START?: boolean;
  }

  export const WasmBoy: {
    config(options: WasmBoyOptions, canvas: HTMLCanvasElement): Promise<void>;
    loadROM(rom: ArrayBuffer | Uint8Array | string | File): Promise<void>;
    play(): Promise<void>;
    pause(): Promise<void>;
    reset(): Promise<void>;
    isPlaying(): boolean;
    setCanvas(canvas: HTMLCanvasElement): Promise<void>;
    getCanvas(): HTMLCanvasElement;
    setJoypadState(state: JoypadState): void;
    enableDefaultJoypad(): void;
    disableDefaultJoypad(): void;
  };
}
