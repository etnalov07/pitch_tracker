const fs = require("fs");

const enriched = JSON.parse(fs.readFileSync("./temp/pitch_analysis_enriched.json", "utf8"));
const labels = JSON.parse(fs.readFileSync("./temp/ground_truth_labels.json", "utf8"));

// Build a map of video -> actual type from Excel labels
const labelMap = {};
labels.forEach((l) => {
    labelMap[l.video + ".MOV"] = l.actual;
});

// Filter enriched to only videos that remain in the labeled set, and add ground truth fields
const comparison = enriched
    .filter((p) => labelMap[p.video])
    .map((p) => ({
        ...p,
        actual_pitch_type: labelMap[p.video],
        detected_pitch_type: p.pitch_type,
        pitch_type_correct: p.pitch_type === labelMap[p.video],
    }));

fs.writeFileSync("./temp/ground_truth_comparison.json", JSON.stringify(comparison, null, 2));
console.log("Ground truth comparison file created with " + comparison.length + " pitches");

// Accuracy summary
const correct = comparison.filter((p) => p.pitch_type_correct).length;
console.log("Audio k-means accuracy: " + correct + "/" + comparison.length + " (" + ((correct / comparison.length) * 100).toFixed(1) + "%)");
