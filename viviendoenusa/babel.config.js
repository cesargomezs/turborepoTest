const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // FORZAMOS la ruta absoluta a la carpeta app de este paquete
      [
        'expo-router/babel',
        {
          src: path.resolve(__dirname, 'app'),
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};