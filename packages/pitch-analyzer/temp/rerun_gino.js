var fs = require('fs');
var path = require('path');
var calibration = require('../dist/calibration');

var calibPath = path.resolve(__dirname, '..', 'calibration.json');
var db = calibration.loadCalibration(calibPath);

// Use ground_truth_comparison.json (77 pitches from Gino vs Clear Falls)
var data = JSON.parse(fs.readFileSync(path.join(__dirname, 'ground_truth_comparison.json'), 'utf8'));

console.log('Gino vs Clear Falls — ' + data.length + ' pitches');
console.log('Calibration: ' + db.entries.length + ' entries, ' + db.entries.filter(function(e){return e.radar_velocity}).length + ' with radar\n');

console.log('Video                Type           Old Cal    New Cal    Radar   Diff(Old)  Diff(New)');
console.log('-'.repeat(95));

var oldErrors = [];
var newErrors = [];
var byType = {};

data.forEach(function(r) {
    var pitchType = r.actual_pitch_type || r.detected_pitch_type || 'Fastball';
    var features = {
        glove_pop_amplitude: r.glove_pop_amplitude || 0,
        fb_score: r.fb_score || 0,
        decay_ratio: r.decay_ratio || 0,
        pop_zcr: r.pop_zcr || 0
    };
    
    var calVel = calibration.computeVelocity(pitchType, features, db);
    
    // Old calibration (assumed baselines: FB=79, CB=65, CH=72)
    var oldBaselines = { Fastball: 79, Curveball: 65, Changeup: 72 };
    // We can't exactly reproduce old calibration, but we know the old velocity from the Excel
    // Instead, compute what the old baseline would give
    var typeEntries = db.entries.filter(function(e) { return e.pitch_type === pitchType; });
    var amps = typeEntries.map(function(e) { return e.glove_pop_amplitude; });
    var avgAmp = amps.reduce(function(s,v){return s+v},0) / amps.length;
    var stdAmp = Math.sqrt(amps.reduce(function(s,v){return s+(v-avgAmp)*(v-avgAmp)},0) / amps.length) || 1;
    var z = (features.glove_pop_amplitude - avgAmp) / stdAmp;
    var oldVel = Math.round((oldBaselines[pitchType] || 75 + Math.max(-4, Math.min(4, z * 2.0))) * 10) / 10;
    
    if (!byType[pitchType]) byType[pitchType] = { old: [], new: [], radar: [] };
    byType[pitchType].old.push(oldVel);
    byType[pitchType].new.push(calVel.velocity);
    
    var line = String(r.video).padEnd(21) + String(pitchType).padEnd(15);
    line += String(oldVel + ' mph').padStart(10) + String(calVel.velocity + ' mph').padStart(11);
    line += '      ' + String(calVel.confidence).padEnd(12);
    console.log(line);
});

console.log('\n--- Average Velocity by Type ---\n');
Object.keys(byType).forEach(function(type) {
    var d = byType[type];
    var avgOld = Math.round(d.old.reduce(function(s,v){return s+v},0) / d.old.length * 10) / 10;
    var avgNew = Math.round(d.new.reduce(function(s,v){return s+v},0) / d.new.length * 10) / 10;
    console.log(type + ' (' + d.old.length + ' pitches): Old baseline=' + avgOld + ' mph → New radar-calibrated=' + avgNew + ' mph (diff: ' + Math.round((avgNew - avgOld) * 10) / 10 + ')');
});
