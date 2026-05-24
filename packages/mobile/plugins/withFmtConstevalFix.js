const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# === withFmtConstevalFix BEGIN ===';
const END_MARKER = '# === withFmtConstevalFix END ===';

const POST_INSTALL_PATCH = `${MARKER}
    # Xcode 26's stricter consteval propagation rejects fmt 11.0.2's FMT_STRING(...)
    # calls inside non-constexpr functions. Force fmt to use the constexpr path
    # until React Native ships a newer fmt (11.1+).
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
          defs = [defs] unless defs.is_a?(Array)
          defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
        end
      end
    end
    ${END_MARKER}`;

function patchPodfile(podfile) {
    if (podfile.includes(MARKER)) {
        return podfile;
    }

    const postInstallMatch = podfile.match(/post_install\s+do\s*\|installer\|\s*\n/);
    if (postInstallMatch) {
        const insertAt = postInstallMatch.index + postInstallMatch[0].length;
        return podfile.slice(0, insertAt) + POST_INSTALL_PATCH + '\n' + podfile.slice(insertAt);
    }

    return podfile.trimEnd() + `\n\npost_install do |installer|\n${POST_INSTALL_PATCH}\nend\n`;
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
