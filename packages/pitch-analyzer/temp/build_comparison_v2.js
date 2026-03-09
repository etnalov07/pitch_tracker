const fs = require('fs');

const session = require('./session_analysis.json');
const gt = require('./ground_truth_v2.json');

// Build ground_truth_comparison.json format from session analysis + ground truth
const comparison = session
    .filter(p => gt[p.video]) // only pitches with ground truth
    .map(p => ({
        video: p.video,
        duration_s: p.duration_s,
        glove_pop_time_s: p.glove_pop_time_s,
        glove_pop_amplitude: p.glove_pop_amplitude,
        audio_amplitude: p.audio_amplitude,
        decay_ratio: p.decay_ratio,
        pop_zcr: p.pop_zcr,
        fb_score: p.fb_score,
        ball_strike_detected: p.ball_strike_detected,
        bs_confidence: p.bs_confidence,
        bs_score: p.bs_score,
        actual_pitch_type: gt[p.video].pitch_type,
        actual_ball_strike: gt[p.video].result || p.ball_strike_detected,
    }));

fs.writeFileSync('./ground_truth_comparison.json', JSON.stringify(comparison, null, 2));
console.log('Built ground_truth_comparison.json with', comparison.length, 'pitches');

const types = {};
comparison.forEach(p => { types[p.actual_pitch_type] = (types[p.actual_pitch_type] || 0) + 1; });
console.log('Types:', JSON.stringify(types));
