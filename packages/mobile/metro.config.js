const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire workspace so Metro can resolve hoisted packages (react-native, etc.)
config.watchFolders = [workspaceRoot];

// Resolve from mobile's node_modules first, then workspace root for hoisted packages
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')];

// Map the shared package
config.resolver.extraNodeModules = {
    '@pitch-tracker/shared': path.resolve(workspaceRoot, 'packages/shared'),
};

// Force all imports of 'react' and 'react-dom' to resolve from mobile's node_modules
// to prevent duplicate React instances (root has 19.2.3, mobile has 19.1.0)
const mobileReact = path.resolve(projectRoot, 'node_modules/react');
const mobileReactDom = path.resolve(projectRoot, 'node_modules/react-dom');

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react' || moduleName.startsWith('react/')) {
        const newContext = { ...context, originModulePath: path.resolve(projectRoot, 'index.js') };
        return context.resolveRequest(newContext, moduleName, platform);
    }
    if (moduleName === 'react-dom' || moduleName.startsWith('react-dom/')) {
        const newContext = { ...context, originModulePath: path.resolve(projectRoot, 'index.js') };
        return context.resolveRequest(newContext, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
