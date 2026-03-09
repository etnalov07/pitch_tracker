var fs = require('fs');
var path = require('path');

// Load the calibration module from built output
var calibration = require('../dist/calibration');

var sessionPath = path.resolve(__dirname, 'session_analysis.json');
var calibPath = path.resolve(__dirname, '..', 'calibration.json');
var radarMap = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'radar.json'), 'utf8'));

var results = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
var db = calibration.loadCalibration(calibPath);

console.log('Before: ' + db.entries.length + ' entries');

var result = calibration.addEntries(db, results, 'Angelo_Bullpen_2023', '2023-03-25', radarMap);
calibration.saveCalibration(db, calibPath);

console.log('Added: ' + result.added + ', Updated: ' + result.updated + ', Skipped: ' + result.skipped);
console.log('After: ' + db.entries.length + ' entries');

// Show per-type counts
var types = {};
db.entries.forEach(function(e) {
    types[e.pitch_type] = (types[e.pitch_type] || 0) + 1;
});
console.log('By type:', JSON.stringify(types));

// Show summary
console.log('\n' + calibration.getCalibrationSummary(db));
