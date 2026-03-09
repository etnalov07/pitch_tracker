var fs = require('fs');
var path = require('path');
var dir = __dirname;

var files = ['full_game_data.json', 'ground_truth_comparison.json', 'pitch_analysis_final.json', 'pitch_analysis_enriched.json', 'video_pitch_analysis.json'];
files.forEach(function(f) {
    try {
        var data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        var count = Array.isArray(data) ? data.length : 'not array';
        var sample = Array.isArray(data) && data[0] ? data[0].video || data[0].Video || 'no video field' : '';
        var hasAmp = Array.isArray(data) && data[0] && data[0].glove_pop_amplitude !== undefined;
        console.log(f + ': ' + count + ' entries, first=' + sample + ', hasAmp=' + hasAmp);
    } catch(e) {
        console.log(f + ': ERROR ' + e.message);
    }
});
