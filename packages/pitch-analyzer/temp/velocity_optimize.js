/**
 * Velocity Optimization — Analyze all audio features to build better estimates
 *
 * Key insight: multiple audio features correlate with velocity differently.
 * - Glove pop amplitude: louder = harder throw (but affected by mic distance, glove position)
 * - Glove pop time from start: shorter video = catcher was ready = possibly faster pitch
 * - Decay ratio: how quickly the pop fades (harder catches may sustain longer)
 * - Pop ZCR (zero-crossing rate): frequency content of the pop
 * - Peak ratio / mean ratio: umpire call features (louder pop vs ambient)
 *
 * Strategy: Use per-pitch-type analysis to find the best features,
 * then build a multi-feature regression model.
 */

const fs = require("fs");

const comparison = JSON.parse(fs.readFileSync("./temp/ground_truth_comparison.json", "utf8"));

console.log("=== AUDIO FEATURE ANALYSIS FOR VELOCITY ESTIMATION ===\n");
console.log("Total pitches:", comparison.length);

// Extract all potentially velocity-correlated features
const features = comparison.map((p) => ({
    video: p.video,
    type: p.actual_pitch_type,
    bs: p.actual_ball_strike,
    amplitude: p.glove_pop_amplitude,
    popTime: p.glove_pop_time_s,
    duration: p.duration_s,
    decayRatio: p.decay_ratio,
    popZcr: p.pop_zcr,
    fbScore: p.fb_score,
    peakRatio: p.peak_ratio,
    meanRatio: p.mean_ratio,
    p75Ratio: p.p75_ratio,
    sustainedMs: p.sustained_ms,
    baselineRms: p.baseline_rms,
    postMaxRms: p.post_max_rms,
    audioAfterPop: p.audio_after_pop_s,
}));

// Per-type statistics
const types = ["Fastball", "Curveball", "Changeup"];
const featureNames = [
    "amplitude", "popTime", "duration", "decayRatio", "popZcr", "fbScore",
    "peakRatio", "meanRatio", "p75Ratio", "sustainedMs", "baselineRms",
    "postMaxRms", "audioAfterPop"
];

function stats(arr) {
    if (arr.length === 0) return { avg: 0, std: 0, min: 0, max: 0, med: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length);
    return {
        avg: Math.round(avg * 100) / 100,
        std: Math.round(std * 100) / 100,
        min: Math.round(sorted[0] * 100) / 100,
        max: Math.round(sorted[sorted.length - 1] * 100) / 100,
        med: Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100,
    };
}

// Print per-type feature distributions
console.log("\n--- Feature Distributions by Pitch Type ---\n");
for (const type of types) {
    const pitches = features.filter((f) => f.type === type);
    if (pitches.length === 0) continue;
    console.log(`${type} (n=${pitches.length}):`);
    for (const fn of featureNames) {
        const vals = pitches.map((p) => p[fn]).filter((v) => v !== undefined && v !== null && isFinite(v));
        if (vals.length === 0) continue;
        const s = stats(vals);
        console.log(`  ${fn.padEnd(16)} avg=${String(s.avg).padStart(8)} std=${String(s.std).padStart(8)} range=[${s.min}, ${s.max}] med=${s.med}`);
    }
    console.log("");
}

// Key question: which features best SEPARATE pitch types?
// Compute discriminability (Cohen's d) between Fastball and Curveball
console.log("--- Feature Discriminability (Fastball vs Curveball, Cohen's d) ---\n");
const fb = features.filter((f) => f.type === "Fastball");
const cb = features.filter((f) => f.type === "Curveball");

const discriminability = [];
for (const fn of featureNames) {
    const fbVals = fb.map((p) => p[fn]).filter((v) => v !== undefined && isFinite(v));
    const cbVals = cb.map((p) => p[fn]).filter((v) => v !== undefined && isFinite(v));
    const fbStats = stats(fbVals);
    const cbStats = stats(cbVals);
    const pooledStd = Math.sqrt((fbStats.std ** 2 + cbStats.std ** 2) / 2);
    const d = pooledStd > 0 ? Math.abs(fbStats.avg - cbStats.avg) / pooledStd : 0;
    discriminability.push({ fn, d, fbAvg: fbStats.avg, cbAvg: cbStats.avg });
    console.log(`  ${fn.padEnd(16)} d=${d.toFixed(3).padStart(6)}  FB=${String(fbStats.avg).padStart(8)}  CB=${String(cbStats.avg).padStart(8)}`);
}
discriminability.sort((a, b) => b.d - a.d);
console.log("\n  Best discriminators: " + discriminability.slice(0, 5).map((d) => d.fn + "(d=" + d.d.toFixed(2) + ")").join(", "));

// Within-type amplitude analysis (for velocity spread within a pitch type)
console.log("\n\n--- Within-Type Amplitude Distribution ---\n");
console.log("If amplitude correlates with velocity, we expect a roughly normal distribution.\n");

for (const type of types) {
    const pitches = features.filter((f) => f.type === type);
    if (pitches.length < 3) continue;

    const amps = pitches.map((p) => p.amplitude).sort((a, b) => a - b);
    const s = stats(amps);

    console.log(`${type} amplitudes (n=${pitches.length}):`);
    console.log(`  Range: ${s.min} - ${s.max}`);
    console.log(`  Mean: ${s.avg}, Median: ${s.med}, Std: ${s.std}`);
    console.log(`  CV (std/mean): ${(s.std / s.avg).toFixed(3)}`);

    // Quartiles
    const q1 = amps[Math.floor(amps.length * 0.25)];
    const q3 = amps[Math.floor(amps.length * 0.75)];
    console.log(`  Q1=${q1}, Q3=${q3}, IQR=${q3 - q1}`);

    // Histogram (5 bins)
    const binWidth = (s.max - s.min) / 5;
    const bins = [0, 0, 0, 0, 0];
    amps.forEach((a) => {
        const b = Math.min(4, Math.floor((a - s.min) / binWidth));
        bins[b]++;
    });
    console.log(`  Histogram: ${bins.map((b, i) => {
        const lo = Math.round(s.min + i * binWidth);
        const hi = Math.round(s.min + (i + 1) * binWidth);
        return `[${lo}-${hi}]:${b}`;
    }).join(" ")}`);
    console.log("");
}

// Multi-feature velocity model
// Use amplitude + decay_ratio + fbScore for Fastball internal ranking
console.log("\n--- Multi-Feature Velocity Model ---\n");

for (const type of types) {
    const pitches = features.filter((f) => f.type === type);
    if (pitches.length < 3) continue;

    // Normalize each feature within the type
    const fns = ["amplitude", "decayRatio", "popZcr", "fbScore", "peakRatio", "sustainedMs"];
    const normalized = {};

    for (const fn of fns) {
        const vals = pitches.map((p) => p[fn]);
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        const std = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length) || 1;
        normalized[fn] = pitches.map((p) => (p[fn] - avg) / std);
    }

    // Composite score: weighted combination
    // Higher amplitude = faster, higher peakRatio = faster, higher sustainedMs = harder hit
    const weights = { amplitude: 0.4, peakRatio: 0.2, sustainedMs: 0.15, fbScore: 0.15, decayRatio: -0.05, popZcr: 0.05 };

    const scores = pitches.map((p, i) => {
        let score = 0;
        for (const fn of fns) {
            score += (weights[fn] || 0) * normalized[fn][i];
        }
        return { video: p.video, score, amplitude: p.amplitude };
    });

    scores.sort((a, b) => b.score - a.score);

    const BASELINES = { Fastball: 79, Curveball: 65, Changeup: 72 };
    const SCALES = { Fastball: 2.5, Curveball: 2.0, Changeup: 2.0 };
    const baseline = BASELINES[type];
    const scale = SCALES[type];

    // Map scores to velocity: z-score * scale + baseline
    const scoreVals = scores.map((s) => s.score);
    const scoreAvg = scoreVals.reduce((s, v) => s + v, 0) / scoreVals.length;
    const scoreStd = Math.sqrt(scoreVals.reduce((s, v) => s + (v - scoreAvg) ** 2, 0) / scoreVals.length) || 1;

    console.log(`${type} (baseline=${baseline}, scale=±${scale} mph):`);
    scores.forEach((s) => {
        const z = (s.score - scoreAvg) / scoreStd;
        const vel = baseline + Math.max(-4, Math.min(4, z * scale));
        console.log(`  ${s.video.padEnd(14)} score=${s.score.toFixed(3).padStart(7)} z=${z.toFixed(2).padStart(6)} vel=${vel.toFixed(1)} mph  amp=${s.amplitude}`);
    });
    console.log("");
}

// Compare old vs new velocity estimates
console.log("\n--- Old (amp-only) vs New (multi-feature) Comparison ---\n");

const BASELINES = { Fastball: 79, Curveball: 65, Changeup: 72 };
const SCALES_NEW = { Fastball: 2.5, Curveball: 2.0, Changeup: 2.0 };
const fns = ["amplitude", "decayRatio", "popZcr", "fbScore", "peakRatio", "sustainedMs"];
const weights = { amplitude: 0.4, peakRatio: 0.2, sustainedMs: 0.15, fbScore: 0.15, decayRatio: -0.05, popZcr: 0.05 };

for (const type of types) {
    const pitches = features.filter((f) => f.type === type);
    if (pitches.length < 3) continue;

    // Old: amplitude-only z-score
    const amps = pitches.map((p) => p.amplitude);
    const ampAvg = amps.reduce((s, v) => s + v, 0) / amps.length;
    const ampStd = Math.sqrt(amps.reduce((s, v) => s + (v - ampAvg) ** 2, 0) / amps.length) || 1;

    // New: multi-feature z-score
    const normalized = {};
    for (const fn of fns) {
        const vals = pitches.map((p) => p[fn]);
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        const std = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length) || 1;
        normalized[fn] = pitches.map((p) => (p[fn] - avg) / std);
    }

    const newScores = pitches.map((p, i) => {
        let score = 0;
        for (const fn of fns) score += (weights[fn] || 0) * normalized[fn][i];
        return score;
    });
    const nsAvg = newScores.reduce((s, v) => s + v, 0) / newScores.length;
    const nsStd = Math.sqrt(newScores.reduce((s, v) => s + (v - nsAvg) ** 2, 0) / newScores.length) || 1;

    const baseline = BASELINES[type];
    const oldScale = type === "Fastball" ? 2.0 : 1.5;
    const newScale = SCALES_NEW[type];

    let totalDiff = 0;
    pitches.forEach((p, i) => {
        const oldZ = (p.amplitude - ampAvg) / ampStd;
        const oldVel = baseline + Math.max(-4, Math.min(4, oldZ * oldScale));

        const newZ = (newScores[i] - nsAvg) / nsStd;
        const newVel = baseline + Math.max(-4, Math.min(4, newZ * newScale));

        totalDiff += Math.abs(newVel - oldVel);
    });

    console.log(`${type}: avg velocity shift = ${(totalDiff / pitches.length).toFixed(2)} mph`);
}
