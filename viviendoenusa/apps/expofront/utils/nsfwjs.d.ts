declare module 'nsfwjs' {
    import * as tf from '@tensorflow/tfjs';
  
    export interface predictionType {
      className: 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy';
      probability: number;
    }
  
    export interface NSFWPredictor {
      classify(
        img: tf.Tensor3D | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
        topk?: number
      ): Promise<predictionType[]>;
    }
  
    export function load(base?: string, config?: { size?: number }): Promise<NSFWPredictor>;
  }