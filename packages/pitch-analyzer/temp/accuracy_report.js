const data = require('./session_analysis.json');
const withGT = data.filter(p => p.actual_pitch_type);
const correct = withGT.filter(p => p.pitch_type_correct);

const byType = {};
withGT.forEach(p => {
    const t = p.actual_pitch_type;
    if (!byType[t]) byType[t] = { total: 0, correct: 0 };
    byType[t].total++;
    if (p.detected_pitch_type === t) byType[t].correct++;
});

console.log('=== ACCURACY REPORT ===');
console.log('Overall:', correct.length + '/' + withGT.length, '(' + (100 * correct.length / withGT.length).toFixed(0) + '%)');
Object.entries(byType).forEach(([t, s]) => {
    console.log('  ' + t + ':', s.correct + '/' + s.total, '(' + (100 * s.correct / s.total).toFixed(0) + '%)');
});

console.log('\n=== CONFUSION MATRIX ===');
console.log('Actual \\ Detected  | Fastball | Curveball | Changeup');
['Fastball', 'Curveball', 'Changeup'].forEach(actual => {
    const row = withGT.filter(p => p.actual_pitch_type === actual);
    const fb = row.filter(p => p.detected_pitch_type === 'Fastball').length;
    const cb = row.filter(p => p.detected_pitch_type === 'Curveball').length;
    const ch = row.filter(p => p.detected_pitch_type === 'Changeup').length;
    console.log(actual.padEnd(19), String(fb).padStart(8), String(cb).padStart(9), String(ch).padStart(8));
});

const bs = { Strike: 0, Ball: 0 };
withGT.forEach(p => { bs[p.ball_strike_detected]++; });
console.log('\nBall/Strike:', JSON.stringify(bs));
console.log('Strike %:', (100 * bs.Strike / (bs.Strike + bs.Ball)).toFixed(0) + '%');
