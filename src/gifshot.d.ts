declare module 'gifshot' {
  interface GifOptions {
    images: string[];
    gifWidth?: number;
    gifHeight?: number;
    interval?: number;
    numFrames?: number;
    frameDuration?: number;
    sampleInterval?: number;
  }

  interface GifResult {
    error: boolean;
    errorCode?: string;
    errorMsg?: string;
    image: string;
  }

  const gifshot: {
    createGIF(options: GifOptions, callback: (result: GifResult) => void): void;
    default?: typeof gifshot;
  };

  export default gifshot;
}
