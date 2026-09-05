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

// 2. Configuración del Monorepo (Workspace con pnpm)
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// CRÍTICO PARA PNPM: Permite que Metro resuelva los symlinks del monorepo en EAS
config.resolver.unstable_enableSymlinks = true;
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