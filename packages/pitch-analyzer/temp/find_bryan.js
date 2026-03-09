var fs = require('fs');
var path = require('path');
var calibration = require('../dist/calibration');

var db = calibration.loadCalibration(path.resolve(__dirname, '..', 'calibration.json'));
var bryanEntries = db.entries.filter(function(e) { return e.game === 'Gino-Bryan_Bullpen'; });
console.log('Gino-Bryan entries: ' + bryanEntries.length);
console.log('First video: ' + bryanEntries[0].video);
console.log('Last video: ' + bryanEntries[bryanEntries.length-1].video);

// Check if we have a session file for these
var dir = __dirname;
var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.json'); });
files.forEach(function(f) {
    try {
        var data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (!Array.isArray(data) || data.length === 0) return;
        if (data[0].video && data[0].video.indexOf('IMG_72') === 0) {
            console.log('\nFound Bryan data in: ' + f + ' (' + data.length + ' entries)');
            var hasKhs = data[0].glove_pop_amplitude !== undefined && data[0].fb_score !== undefined;
            console.log('  Has KHS fields: ' + hasKhs);
        }
    } catch(e) {}
});
