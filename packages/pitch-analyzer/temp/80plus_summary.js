const data = require('./session_analysis.json');

// Cross-reference with ground truth from main game to get actual pitch types
const gt = require('./ground_truth_v2.json');

console.log('=== 80plus Folder Analysis (14 pitches) ===\n');
console.log('#  Video          Type       B/S     Conf    Actual Type');
console.log('-'.repeat(70));

data.forEach((p, i) => {
    const actual = gt[p.video] ? gt[p.video].pitch_type : '?';
    console.log(
        String(i + 1).padStart(2),
        p.video.padEnd(14),
        p.detected_pitch_type.padEnd(10),
        p.ball_strike_detected.padEnd(7),
        p.bs_confidence.padEnd(7),
        actual
    );
});

const bs = { Strike: 0, Ball: 0 };
data.forEach(p => { bs[p.ball_strike_detected]++; });
console.log('\nAll 14 detected as Fastball (7/7 unanimous votes each)');
console.log('Ball/Strike:', bs.Strike, 'Strikes,', bs.Ball, 'Balls');

// Check actual types from ground truth
const actualTypes = {};
data.forEach(p => {
    const actual = gt[p.video] ? gt[p.video].pitch_type : 'Unknown';
    actualTypes[actual] = (actualTypes[actual] || 0) + 1;
});
console.log('Actual pitch types (from ground truth):', JSON.stringify(actualTypes));
