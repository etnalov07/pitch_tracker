/**
 * Generate optimized Excel with multi-feature velocity model
 */
const ExcelJS = require("exceljs");
const fs = require("fs");

const comparison = JSON.parse(fs.readFileSync("./temp/ground_truth_comparison.json", "utf8"));

const BASELINES = { Fastball: 79, Curveball: 65, Changeup: 72 };
const SCALES = { Fastball: 2.5, Curveball: 2.0, Changeup: 2.0 };
const RANGE = { Fastball: 2, Curveball: 2, Changeup: 2 }; // ±range
const featureNames = ["amplitude", "decayRatio", "popZcr", "fbScore", "peakRatio", "sustainedMs"];
const weights = { amplitude: 0.4, peakRatio: 0.2, sustainedMs: 0.15, fbScore: 0.15, decayRatio: -0.05, popZcr: 0.05 };

const types = ["Fastball", "Curveball", "Changeup"];

// Compute multi-feature velocities per type
const velocities = {};

for (const type of types) {
    const pitches = comparison.filter((p) => p.actual_pitch_type === type);
    if (pitches.length < 2) {
        pitches.forEach((p) => { velocities[p.video] = { vel: BASELINES[type], low: BASELINES[type] - 2, high: BASELINES[type] + 2 }; });
        continue;
    }

    // Normalize features within type
    const normalized = {};
    for (const fn of featureNames) {
        const vals = pitches.map((p) => {
            if (fn === "amplitude") return p.glove_pop_amplitude;
            if (fn === "decayRatio") return p.decay_ratio;
            if (fn === "popZcr") return p.pop_zcr;
            if (fn === "fbScore") return p.fb_score;
            if (fn === "peakRatio") return p.peak_ratio;
            if (fn === "sustainedMs") return p.sustained_ms;
            return 0;
        });
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        const std = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length) || 1;
        normalized[fn] = { avg, std };
    }

    // Compute composite scores
    const scores = pitches.map((p) => {
        let score = 0;
        for (const fn of featureNames) {
            let val;
            if (fn === "amplitude") val = p.glove_pop_amplitude;
            else if (fn === "decayRatio") val = p.decay_ratio;
            else if (fn === "popZcr") val = p.pop_zcr;
            else if (fn === "fbScore") val = p.fb_score;
            else if (fn === "peakRatio") val = p.peak_ratio;
            else if (fn === "sustainedMs") val = p.sustained_ms;
            else val = 0;
            score += (weights[fn] || 0) * ((val - normalized[fn].avg) / normalized[fn].std);
        }
        return score;
    });

    const scoreAvg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const scoreStd = Math.sqrt(scores.reduce((s, v) => s + (v - scoreAvg) ** 2, 0) / scores.length) || 1;

    const baseline = BASELINES[type];
    const scale = SCALES[type];
    const range = RANGE[type];

    pitches.forEach((p, i) => {
        const z = (scores[i] - scoreAvg) / scoreStd;
        const vel = baseline + Math.max(-4, Math.min(4, z * scale));
        velocities[p.video] = {
            vel: Math.round(vel * 10) / 10,
            low: Math.round((vel - range) * 10) / 10,
            high: Math.round((vel + range) * 10) / 10,
        };
    });
}

async function generate() {
    const wb = new ExcelJS.Workbook();

    // ── Sheet 1: Pitch Chart ──────────────────────────────────────────────────
    const ws = wb.addWorksheet("Pitch Chart");

    const TYPE_COLORS = { Fastball: "FFE74C3C", Curveball: "FF3498DB", Changeup: "FF2ECC71" };
    const VEL_COLORS = { Fastball: "FFFDEBD0", Curveball: "FFD6EAF8", Changeup: "FFD5F5E3" };

    const strikes = comparison.filter((p) => p.actual_ball_strike === "Strike").length;
    const balls = comparison.filter((p) => p.actual_ball_strike === "Ball").length;
    const fbCount = comparison.filter((p) => p.actual_pitch_type === "Fastball").length;
    const cbCount = comparison.filter((p) => p.actual_pitch_type === "Curveball").length;
    const chCount = comparison.filter((p) => p.actual_pitch_type === "Changeup").length;

    ws.mergeCells("A1:J1");
    ws.getCell("A1").value = "Gino vs Clear Falls — Optimized Pitch Analysis";
    ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4F72" } };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.mergeCells("A2:J2");
    ws.getCell("A2").value = `${comparison.length} Pitches | ${strikes} Strikes / ${balls} Balls (${Math.round((strikes / comparison.length) * 100)}%) | ${fbCount} FB / ${cbCount} CB / ${chCount} CH | Multi-Feature Velocity Model`;
    ws.getCell("A2").font = { size: 10, color: { argb: "FFD4E6F1" } };
    ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4F72" } };
    ws.getCell("A2").alignment = { horizontal: "center" };

    const headers = [
        { header: "#", width: 4 },
        { header: "Video", width: 14 },
        { header: "Pitch Type", width: 12 },
        { header: "Velocity\n(mph)", width: 10 },
        { header: "Vel Range\n(mph)", width: 13 },
        { header: "B/S", width: 7 },
        { header: "Result", width: 14 },
        { header: "Batter", width: 14 },
        { header: "Count", width: 7 },
        { header: "AB Result", width: 14 },
    ];

    const headerRow = ws.getRow(3);
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h.header;
        cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C3E50" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        ws.getColumn(i + 1).width = h.width;
    });
    headerRow.height = 30;

    comparison.forEach((p, idx) => {
        const row = ws.getRow(idx + 4);
        const type = p.actual_pitch_type;
        const v = velocities[p.video];

        row.getCell(1).value = idx + 1;
        row.getCell(2).value = p.video;
        row.getCell(3).value = type;
        row.getCell(4).value = v.vel;
        row.getCell(5).value = `${v.low} - ${v.high}`;
        row.getCell(6).value = p.actual_ball_strike;
        row.getCell(7).value = p.actual_result || "";
        row.getCell(8).value = p.batter || "";
        row.getCell(9).value = p.count || "";
        row.getCell(10).value = p.ab_result || "";

        row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TYPE_COLORS[type] || "FFCCCCCC" } };
        row.getCell(3).font = { bold: true, color: { argb: "FFFFFFFF" } };
        row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: VEL_COLORS[type] || "FFEEEEEE" } };

        if (p.actual_ball_strike === "Strike") {
            row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8E6C9" } };
        } else {
            row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCDD2" } };
        }

        if (idx % 2 === 1) {
            [1, 2, 5, 7, 8, 9, 10].forEach((c) => {
                row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F9FA" } };
            });
        }
        row.alignment = { horizontal: "center", vertical: "middle" };
    });

    // ── Sheet 2: Velocity Summary ──────────────────────────────────────────
    const ws2 = wb.addWorksheet("Velocity Summary");
    ws2.mergeCells("A1:F1");
    ws2.getCell("A1").value = "Velocity Analysis — Multi-Feature Model";
    ws2.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    ws2.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4F72" } };
    ws2.getCell("A1").alignment = { horizontal: "center" };

    let r = 3;
    const summHeaders = ["Pitch Type", "Count", "Avg Vel", "Min", "Max", "Baseline"];
    const summRow = ws2.getRow(r);
    summHeaders.forEach((h, i) => {
        summRow.getCell(i + 1).value = h;
        summRow.getCell(i + 1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        summRow.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C3E50" } };
        summRow.getCell(i + 1).alignment = { horizontal: "center" };
    });
    r++;

    for (const type of types) {
        const pitches = comparison.filter((p) => p.actual_pitch_type === type);
        if (pitches.length === 0) continue;
        const vels = pitches.map((p) => velocities[p.video].vel);
        const avg = (vels.reduce((s, v) => s + v, 0) / vels.length).toFixed(1);
        const row = ws2.getRow(r);
        row.getCell(1).value = type;
        row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TYPE_COLORS[type] } };
        row.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        row.getCell(2).value = pitches.length;
        row.getCell(3).value = parseFloat(avg);
        row.getCell(4).value = Math.min(...vels);
        row.getCell(5).value = Math.max(...vels);
        row.getCell(6).value = BASELINES[type];
        for (let c = 1; c <= 6; c++) row.getCell(c).alignment = { horizontal: "center" };
        r++;
    }

    r += 2;
    ws2.getRow(r).getCell(1).value = "Model Details";
    ws2.getRow(r).getCell(1).font = { bold: true, size: 12 };
    r++;
    ws2.getRow(r).getCell(1).value = "Features used:";
    ws2.getRow(r).getCell(2).value = "amplitude (40%), peakRatio (20%), sustainedMs (15%), fbScore (15%), popZcr (5%), decayRatio (-5%)";
    r++;
    ws2.getRow(r).getCell(1).value = "Method:";
    ws2.getRow(r).getCell(2).value = "Per-type z-score normalization of weighted feature composite, mapped to ±4 mph around baseline";
    r++;
    ws2.getRow(r).getCell(1).value = "Uncertainty:";
    ws2.getRow(r).getCell(2).value = "±2 mph (audio proxy — no radar calibration available)";
    r++;
    ws2.getRow(r).getCell(1).value = "Confidence:";
    ws2.getRow(r).getCell(2).value = "Moderate — relative ordering within pitch types is reliable; absolute values assume baselines are correct";

    ws2.getColumn(1).width = 18;
    ws2.getColumn(2).width = 80;
    ws2.getColumn(3).width = 10;
    ws2.getColumn(4).width = 8;
    ws2.getColumn(5).width = 8;
    ws2.getColumn(6).width = 10;

    // ── Sheet 3: Batter Summary ──────────────────────────────────────────
    const ws3 = wb.addWorksheet("Batter Summary");
    ws3.mergeCells("A1:H1");
    ws3.getCell("A1").value = "Batter-by-Batter Summary";
    ws3.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    ws3.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4F72" } };
    ws3.getCell("A1").alignment = { horizontal: "center" };

    const batHeaders = ["Batter", "Pitches", "Strikes", "Balls", "Strike %", "FB / CB / CH", "Avg FB Vel", "AB Results"];
    const batRow = ws3.getRow(3);
    batHeaders.forEach((h, i) => {
        batRow.getCell(i + 1).value = h;
        batRow.getCell(i + 1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        batRow.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C3E50" } };
        batRow.getCell(i + 1).alignment = { horizontal: "center" };
    });

    const batters = [];
    const seen = new Set();
    comparison.forEach((p) => {
        const b = p.batter;
        if (b && !seen.has(b)) { seen.add(b); batters.push(b); }
    });

    let br = 4;
    batters.forEach((batter) => {
        const bPitches = comparison.filter((p) => p.batter === batter);
        const bStrikes = bPitches.filter((p) => p.actual_ball_strike === "Strike").length;
        const bBalls = bPitches.filter((p) => p.actual_ball_strike === "Ball").length;
        const bFb = bPitches.filter((p) => p.actual_pitch_type === "Fastball").length;
        const bCb = bPitches.filter((p) => p.actual_pitch_type === "Curveball").length;
        const bCh = bPitches.filter((p) => p.actual_pitch_type === "Changeup").length;
        const fbVels = bPitches.filter((p) => p.actual_pitch_type === "Fastball").map((p) => velocities[p.video].vel);
        const avgFbVel = fbVels.length > 0 ? (fbVels.reduce((s, v) => s + v, 0) / fbVels.length).toFixed(1) : "-";
        const abResults = bPitches.filter((p) => p.ab_result && String(p.ab_result).trim()).map((p) => p.ab_result);

        const row = ws3.getRow(br);
        row.getCell(1).value = batter;
        row.getCell(1).font = { bold: true };
        row.getCell(2).value = bPitches.length;
        row.getCell(3).value = bStrikes;
        row.getCell(4).value = bBalls;
        row.getCell(5).value = Math.round((bStrikes / bPitches.length) * 100) + "%";
        row.getCell(6).value = `${bFb} / ${bCb} / ${bCh}`;
        row.getCell(7).value = avgFbVel === "-" ? "-" : parseFloat(avgFbVel);
        row.getCell(8).value = abResults.join(", ");
        for (let c = 1; c <= 8; c++) row.getCell(c).alignment = { horizontal: "center" };
        row.getCell(8).alignment = { horizontal: "left" };
        br++;
    });

    ws3.getColumn(1).width = 16;
    ws3.getColumn(2).width = 9;
    ws3.getColumn(3).width = 9;
    ws3.getColumn(4).width = 8;
    ws3.getColumn(5).width = 10;
    ws3.getColumn(6).width = 14;
    ws3.getColumn(7).width = 12;
    ws3.getColumn(8).width = 40;

    const outPath = "C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_Optimized.xlsx";
    await wb.xlsx.writeFile(outPath);
    console.log("Saved: " + outPath);

    // Print summary
    console.log("\n=== OPTIMIZED VELOCITY SUMMARY ===\n");
    for (const type of types) {
        const pitches = comparison.filter((p) => p.actual_pitch_type === type);
        if (pitches.length === 0) continue;
        const vels = pitches.map((p) => velocities[p.video].vel);
        const avg = (vels.reduce((s, v) => s + v, 0) / vels.length).toFixed(1);
        console.log(`${type}: ${pitches.length} pitches | Avg ${avg} mph | Range ${Math.min(...vels)}-${Math.max(...vels)} mph`);
    }
}

generate().catch(console.error);
