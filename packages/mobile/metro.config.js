const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the shared package for changes
config.watchFolders = [
    path.resolve(workspaceRoot, 'packages/shared'),
];

// Resolve from mobile's node_modules first, then shared package
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
];

// Map the shared package to its location
config.resolver.extraNodeModules = new Proxy(
    {
        '@pitch-tracker/shared': path.resolve(workspaceRoot, 'packages/shared'),
    },
    {
        get: (target, name) => {
            if (target.hasOwnProperty(name)) {
                return target[name];
            }
            // Fall back to mobile's node_modules for everything else
            return path.resolve(projectRoot, 'node_modules', name);
        },
    }
);

module.exports = config;
