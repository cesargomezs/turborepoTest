// tensorflow-fix.d.ts
import * as tf from '@tensorflow/tfjs';

declare module '@tensorflow/tfjs-react-native' {
  export function decodeJpeg(
    contents: Uint8Array,
    channels?: number
  ): tf.Tensor3D;
  export function bundleResourceIO(
    modelJson: any,
    modelWeights: any
  ): any;
  export function cameraWithTensors(
    component: any
  ): any;
  // Agrega esta línea para que reconozca cualquier exportación del dist
}

declare module '@tensorflow/tfjs-react-native/dist/index' {
  export * from '@tensorflow/tfjs-react-native';
}