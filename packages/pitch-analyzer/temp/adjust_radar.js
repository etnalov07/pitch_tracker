var fs = require('fs');
var path = require('path');
var calibration = require('../dist/calibration');

var calibPath = path.resolve(__dirname, '..', 'calibration.json');
var db = calibration.loadCalibration(calibPath);

var adjusted = 0;
db.entries.forEach(function(e) {
    if (e.radar_velocity) {
        e.radar_velocity = e.radar_velocity + 1.5;
        adjusted++;
    }
});

// Recalculate baselines from adjusted radar
var radarByType = {};
db.entries.forEach(function(e) {
    if (e.radar_velocity) {
        if (!radarByType[e.pitch_type]) radarByType[e.pitch_type] = [];
        radarByType[e.pitch_type].push(e.radar_velocity);
    }
});

console.log('Adjusted ' + adjusted + ' radar readings by +1.5 mph\n');
console.log('New baselines (from radar):');
Object.keys(radarByType).forEach(function(type) {
    var vals = radarByType[type];
    var avg = Math.round(vals.reduce(function(s,v){return s+v},0) / vals.length * 10) / 10;
    var old = db.baselines[type];
    db.baselines[type] = avg;
    console.log('  ' + type + ': ' + old + ' -> ' + avg + ' mph (' + vals.length + ' radar readings)');
});

db.updated = new Date().toISOString();
calibration.saveCalibration(db, calibPath);

console.log('\nSaved updated calibration.json');
console.log('\n' + calibration.getCalibrationSummary(db));
