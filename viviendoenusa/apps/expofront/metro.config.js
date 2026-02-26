const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Configuración de Activos (Assets)
// Filtramos 'bin' de sourceExts para que Metro NO intente leerlo como código
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'bin');

// Aseguramos que 'bin' esté en assetExts para que se trate como binario crudo
if (!config.resolver.assetExts.includes('bin')) {
  config.resolver.assetExts.push('bin');
}

// 2. Configuración del Monorepo (Workspace)
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. (Opcional) Optimización para archivos grandes
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true, // Ayuda con el rendimiento de carga
  },
});

module.exports = config;