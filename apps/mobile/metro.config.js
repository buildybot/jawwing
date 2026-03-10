const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch both mobile and monorepo root for files
config.watchFolders = [monorepoRoot];

// Mobile node_modules first, then root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// CRITICAL: Force ALL react-related imports to resolve from the mobile app's
// local node_modules, preventing duplicate React instances in the monorepo
const mobileModules = path.resolve(projectRoot, 'node_modules');
config.resolver.extraNodeModules = new Proxy(
  {
    'react': path.resolve(mobileModules, 'react'),
    'react-native': path.resolve(mobileModules, 'react-native'),
    'react/jsx-runtime': path.resolve(mobileModules, 'react/jsx-runtime'),
    'react/jsx-dev-runtime': path.resolve(mobileModules, 'react/jsx-dev-runtime'),
  },
  {
    get: (target, name) => {
      if (name in target) return target[name];
      // Fall back to mobile node_modules, then root
      const localPath = path.resolve(mobileModules, String(name));
      try {
        require.resolve(localPath);
        return localPath;
      } catch {
        return path.resolve(monorepoRoot, 'node_modules', String(name));
      }
    },
  }
);

// Block ONLY the root's react and react-native packages (not react-devtools-core etc.)
const escPath = (p) => p.replace(/[/\\]/g, '[/\\\\]');
config.resolver.blockList = [
  new RegExp(escPath(path.resolve(monorepoRoot, 'node_modules/react/')) + '.*'),
  new RegExp(escPath(path.resolve(monorepoRoot, 'node_modules/react-native/')) + '.*'),
  // Don't block react-devtools-core, react-refresh, etc.
];

module.exports = config;
