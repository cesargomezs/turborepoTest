const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// Subimos dos niveles para llegar a la raíz del monorepo: /viviendoenusa
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Vigilar todos los archivos en el monorepo (Indispensable para Turborepo)
config.watchFolders = [workspaceRoot];

// 2. Resolución de módulos: Primero local, luego raíz del monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Forzar a Metro a usar la raíz del workspace como contexto
// Esto ayuda a que expo-router encuentre los archivos de configuración correctamente
config.resolver.disableHierarchicalLookup = true;

// 4. Configuración para Expo Router y soporte de SVGs/activos si los usas
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;