const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# === withFmtConstevalFix BEGIN ===';
const END_MARKER = '# === withFmtConstevalFix END ===';

// fmt 11.0.2 (bundled with RN 0.81.5) hard-defines FMT_USE_CONSTEVAL based on
// compiler detection — it's not user-overridable via -D. Xcode 26.4's clang
// makes FMT_STRING("...") calls in non-constexpr functions fail. fmt's
// detection branch `FMT_CPLUSPLUS < 201709L` sets FMT_USE_CONSTEVAL=0, so
// compiling the fmt Pod at c++17 (while the rest of the RN graph stays at
// c++20) flips the consteval path off cleanly.
const PATCH_BODY = `    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
    ${END_MARKER}`;

function patchPodfile(podfile) {
    if (podfile.includes(MARKER)) {
        return podfile;
    }

    const lines = podfile.split('\n');
    const openerRe = /^\s*post_install\s+do\s*\|installer\|\s*$/;
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (openerRe.test(lines[i])) {
            startIdx = i;
            break;
        }
    }

    if (startIdx === -1) {
        return podfile.trimEnd() + `\n\npost_install do |installer|\n${PATCH_BODY}\nend\n`;
    }

    let depth = 1;
    let endIdx = -1;
    const blockOpenerRe = /\bdo\b(\s*\|[^|]*\|)?\s*$/;
    const endRe = /^\s*end\s*$/;
    for (let i = startIdx + 1; i < lines.length; i++) {
        if (blockOpenerRe.test(lines[i])) depth++;
        if (endRe.test(lines[i])) {
            depth--;
            if (depth === 0) {
                endIdx = i;
                break;
            }
        }
    }

    if (endIdx === -1) {
        return podfile.trimEnd() + `\n\npost_install do |installer|\n${PATCH_BODY}\nend\n`;
    }

    lines.splice(endIdx, 0, PATCH_BODY);
    return lines.join('\n');
}

module.exports = function withFmtConstevalFix(config) {
    return withDangerousMod(config, [
        'ios',
        async (cfg) => {
            const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
            if (!fs.existsSync(podfilePath)) {
                return cfg;
            }
            const original = fs.readFileSync(podfilePath, 'utf8');
            const patched = patchPodfile(original);
            if (patched !== original) {
                fs.writeFileSync(podfilePath, patched);
            }
            return cfg;
        },
    ]);
};
