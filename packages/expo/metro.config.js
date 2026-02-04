const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve packages from both the project and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Resolve workspace packages
config.resolver.extraNodeModules = {
  '@mockd/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

// Ensure proper resolution of react-native and expo packages
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
