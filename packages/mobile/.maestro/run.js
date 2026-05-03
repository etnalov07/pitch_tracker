#!/usr/bin/env node
/* eslint-disable no-console */
// Cross-platform launcher for Maestro tests.
// Reads .maestro/.env, applies optional --platform flag, then spawns `maestro test`
// with --env flags. Process env overrides .env so CI can inject creds without a file.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PLATFORM_APP_IDS = {
    ios: 'host.exp.Exponent', // Expo Go on iOS simulator
    android: 'host.exp.exponent', // Expo Go on Android emulator
    devclient: 'com.bvolante.pitch-tracker', // Standalone dev client build
};

const REQUIRED_VARS = ['APP_ID', 'EMAIL', 'PASSWORD'];

function parseEnvFile(filePath) {
    const out = {};
    if (!fs.existsSync(filePath)) return out;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        let value = line.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

const args = process.argv.slice(2);
let platform = null;
const passthrough = [];
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform') {
        platform = args[i + 1];
        i++;
    } else {
        passthrough.push(args[i]);
    }
}

const envVars = parseEnvFile(path.resolve(__dirname, '.env'));

if (platform) {
    const appId = PLATFORM_APP_IDS[platform];
    if (!appId) {
        console.error(`Unknown --platform "${platform}". Use one of: ${Object.keys(PLATFORM_APP_IDS).join(', ')}`);
        process.exit(1);
    }
    envVars.APP_ID = appId;
}

for (const key of REQUIRED_VARS) {
    if (process.env[key]) envVars[key] = process.env[key];
}

const missing = REQUIRED_VARS.filter((k) => !envVars[k]);
if (missing.length > 0) {
    console.error(`Missing required env var(s): ${missing.join(', ')}`);
    console.error(`Set them in packages/mobile/.maestro/.env (copy from .env.example) or export them.`);
    console.error(`Or pass --platform ios | android | devclient to set APP_ID automatically.`);
    process.exit(1);
}

const maestroArgs = ['test'];
for (const [k, v] of Object.entries(envVars)) {
    maestroArgs.push('--env', `${k}=${v}`);
}
if (passthrough.length === 0) {
    maestroArgs.push(path.resolve(__dirname, 'run-all.yaml'));
} else {
    maestroArgs.push(...passthrough);
}

console.log(`maestro ${maestroArgs.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
const result = spawnSync('maestro', maestroArgs, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
