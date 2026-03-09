var fs = require('fs');
var path = require('path');
var dir = __dirname;

// Check which files have KhsResult-like format (video, glove_pop_amplitude, fb_score, detected_pitch_type)
var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.json'); });
files.forEach(function(f) {
    try {
        var data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (!Array.isArray(data) || data.length === 0) return;
        var first = data[0];
        var hasKhs = first.glove_pop_amplitude !== undefined && first.fb_score !== undefined && first.detected_pitch_type !== undefined;
        if (hasKhs) {
            console.log(f + ': ' + data.length + ' entries, KhsResult format, first=' + first.video);
        }
    } catch(e) {}
});
