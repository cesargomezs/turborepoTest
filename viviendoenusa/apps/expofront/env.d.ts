// env.d.ts
declare module '@tensorflow/tfjs-react-native' {
    import * as tf from '@tensorflow/tfjs';
    export function decodeJpeg(contents: Uint8Array, channels?: number): tf.Tensor3D;
    export function fetch(url: string, config?: RequestInit, options?: {isBinary?: boolean}): Promise<Response>;
  }
  
  declare module 'nsfwjs' {
    import * as tf from '@tensorflow/tfjs';
    export interface predictionType {
      className: 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy';
      probability: number;
    }
    export interface NSFWPredictor {
      classify(img: tf.Tensor3D | HTMLImageElement | HTMLCanvasElement, topk?: number): Promise<predictionType[]>;
    }
    export function load(base?: string, options?: { size?: number }): Promise<NSFWPredictor>;
  }