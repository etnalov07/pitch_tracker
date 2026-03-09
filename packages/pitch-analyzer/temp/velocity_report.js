const fs = require("fs");

const comparison = JSON.parse(fs.readFileSync("./temp/ground_truth_comparison.json", "utf8"));

// Replicate the corrected velocity logic from excel.ts using ACTUAL pitch types
const VELOCITY_BASELINES = {
    Fastball: 79,
    Changeup: 72,
    Curveball: 65,
};

// Compute per-type amplitude stats
const typeAmps = {};
for (const p of comparison) {
    const type = p.actual_pitch_type;
    if (!typeAmps[type]) typeAmps[type] = [];
    typeAmps[type].push(p.glove_pop_amplitude);
}

const typeStats = {};
for (const [type, amps] of Object.entries(typeAmps)) {
    const avg = amps.reduce((s, v) => s + v, 0) / amps.length;
    const std = Math.sqrt(amps.reduce((s, v) => s + (v - avg) ** 2, 0) / amps.length);
    typeStats[type] = { avg, std, count: amps.length };
}

console.log("=== Glove Pop Amplitude Stats by Pitch Type ===");
for (const [type, stats] of Object.entries(typeStats)) {
    console.log(`  ${type}: avg=${stats.avg.toFixed(0)}, std=${stats.std.toFixed(0)}, n=${stats.count}`);
}
console.log("");

// Compute corrected velocities
const corrected = comparison.map((p) => {
    const type = p.actual_pitch_type;
    const baseline = VELOCITY_BASELINES[type] || 75;
    const stats = typeStats[type];
    const z = stats && stats.std > 0 ? (p.glove_pop_amplitude - stats.avg) / stats.std : 0;
    const scale = type === "Fastball" ? 2.0 : 1.5;
    const velocity = baseline + Math.max(-4, Math.min(4, z * scale));
    return {
        ...p,
        corrected_velocity: Math.round(velocity * 10) / 10,
        corrected_vel_low: Math.round((velocity - 3) * 10) / 10,
        corrected_vel_high: Math.round((velocity + 3) * 10) / 10,
    };
});

// Print full table
console.log("=== CORRECTED VELOCITY TABLE ===\n");
console.log("# | Video | Actual Type | Velocity | Range | B/S | Glove Pop Amp");
console.log("--|-------|-------------|----------|-------|-----|-------------");
corrected.forEach((p) => {
    console.log(
        `${p.pitch_number} | ${p.video.replace(".MOV", "")} | ${p.actual_pitch_type.padEnd(10)} | ${p.corrected_velocity.toFixed(1).padStart(5)} mph | ${p.corrected_vel_low.toFixed(1)}-${p.corrected_vel_high.toFixed(1)} | ${p.ball_strike.padEnd(6)} | ${p.glove_pop_amplitude}`
    );
});

// Summary by type
console.log("\n=== VELOCITY SUMMARY BY PITCH TYPE ===\n");
for (const type of ["Fastball", "Curveball", "Changeup"]) {
    const pitches = corrected.filter((p) => p.actual_pitch_type === type);
    if (pitches.length === 0) continue;
    const vels = pitches.map((p) => p.corrected_velocity);
    const avg = (vels.reduce((a, b) => a + b, 0) / vels.length).toFixed(1);
    const min = Math.min(...vels).toFixed(1);
    const max = Math.max(...vels).toFixed(1);
    console.log(`  ${type}: ${pitches.length} pitches | Avg: ${avg} mph | Range: ${min}-${max} mph | Baseline: ${VELOCITY_BASELINES[type]} mph`);
}

// Save corrected data
fs.writeFileSync("./temp/corrected_velocity_data.json", JSON.stringify(corrected, null, 2));
console.log("\nSaved corrected data to temp/corrected_velocity_data.json");
