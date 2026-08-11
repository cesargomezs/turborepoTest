const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

let config = getDefaultConfig(projectRoot);

// 1. Configuración de Activos (Assets)
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'bin');

if (!config.resolver.assetExts.includes('bin')) {
  config.resolver.assetExts.push('bin');
}

// 2. Configuración del Monorepo (Workspace)
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 🚀 ESTA ES LA LÍNEA CRÍTICA PARA QUE PNPM NO ROMPA LA APP EN BLANCO:
config.resolver.disableHierarchicalLookup = true;

// 3. Optimización
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// 4. Envolvemos con NativeWind apuntando a tu global.css
module.exports = withNativeWind(config, { input: './global.css' });