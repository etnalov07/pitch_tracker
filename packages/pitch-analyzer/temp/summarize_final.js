const fs = require("fs");
const data = JSON.parse(fs.readFileSync("./temp/video_pitch_analysis.json", "utf8"));

const total = data.length;
const strikes = data.filter((d) => d.ball_strike === "Strike").length;
const balls = data.filter((d) => d.ball_strike === "Ball").length;

// Actual type breakdown
const actualTypes = {};
data.forEach((d) => {
    actualTypes[d.actual_pitch_type] = (actualTypes[d.actual_pitch_type] || 0) + 1;
});

// Velocity by actual type
const velByType = {};
data.forEach((d) => {
    const t = d.actual_pitch_type;
    if (!velByType[t]) velByType[t] = [];
    velByType[t].push(d.estimated_velocity_mph);
});

console.log("=== GINO VS CLEAR FALLS — FINAL RESULTS ===\n");
console.log("Total pitches: " + total);
console.log("Strikes: " + strikes + " (" + ((strikes / total) * 100).toFixed(0) + "%)");
console.log("Balls: " + balls + " (" + ((balls / total) * 100).toFixed(0) + "%)\n");

console.log("--- Pitch Mix (Actual) ---");
Object.keys(actualTypes)
    .sort()
    .forEach((t) => {
        const vels = velByType[t];
        const avg = (vels.reduce((a, b) => a + b, 0) / vels.length).toFixed(1);
        const min = Math.min(...vels).toFixed(1);
        const max = Math.max(...vels).toFixed(1);
        console.log("  " + t + ": " + actualTypes[t] + " pitches | Avg vel: " + avg + " mph (range: " + min + "-" + max + ")");
    });

console.log("\n--- Video k-NN Detection Accuracy ---");
const videoCorrect = data.filter((d) => d.video_correct).length;
console.log("  " + videoCorrect + "/" + total + " (" + ((videoCorrect / total) * 100).toFixed(1) + "%)");

// Per-type accuracy
Object.keys(actualTypes)
    .sort()
    .forEach((t) => {
        const ofType = data.filter((d) => d.actual_pitch_type === t);
        const correct = ofType.filter((d) => d.video_pitch_type === t).length;
        console.log("  " + t + ": " + correct + "/" + ofType.length + " correct");
    });
