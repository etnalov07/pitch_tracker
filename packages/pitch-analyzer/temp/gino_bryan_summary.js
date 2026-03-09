const data = require('./session_analysis.json');
const { computeVelocity } = require('../dist/calibration');
const calibDb = require('../calibration.json');

const valid = data.filter(p => !p.error);
const types = {};
const bs = { Strike: 0, Ball: 0 };
const conf = { high: 0, medium: 0, low: 0, none: 0 };
const velocities = [];

console.log('#  Video           Type        Velocity   B/S     Confidence');
console.log('-'.repeat(70));

valid.forEach((p, i) => {
    const pitchType = p.detected_pitch_type || 'Fastball';
    types[pitchType] = (types[pitchType] || 0) + 1;
    bs[p.ball_strike_detected]++;
    conf[p.bs_confidence]++;

    const vel = computeVelocity(pitchType, {
        glove_pop_amplitude: p.glove_pop_amplitude || 0,
        fb_score: p.fb_score || 0,
        decay_ratio: p.decay_ratio || 0,
        pop_zcr: p.pop_zcr || 0,
    }, calibDb);

    velocities.push({ type: pitchType, vel: vel.velocity });

    console.log(
        String(i + 1).padStart(2),
        p.video.padEnd(15),
        pitchType.padEnd(11),
        (vel.velocity + ' mph').padStart(9),
        p.ball_strike_detected.padEnd(7),
        p.bs_confidence
    );
});

console.log('-'.repeat(70));
console.log('\nSummary:');
console.log('  Total pitches:', valid.length);
console.log('  Pitch types:', JSON.stringify(types));
console.log('  B/S:', bs.Strike, 'Strikes /', bs.Ball, 'Balls (' + Math.round(100 * bs.Strike / valid.length) + '% strike rate)');
console.log('  Confidence:', JSON.stringify(conf));

// Per-type velocity
for (const type of Object.keys(types)) {
    const typeVels = velocities.filter(v => v.type === type).map(v => v.vel);
    const avg = typeVels.reduce((s, v) => s + v, 0) / typeVels.length;
    const min = Math.min(...typeVels);
    const max = Math.max(...typeVels);
    console.log(`  ${type} velocity: avg=${avg.toFixed(1)}, range=${min.toFixed(1)}-${max.toFixed(1)} mph (n=${typeVels.length})`);
}
