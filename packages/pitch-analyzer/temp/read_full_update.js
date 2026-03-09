const ExcelJS = require("exceljs");
const fs = require("fs");

async function read() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile("C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_Final.xlsx");
    const ws = wb.worksheets[0];

    const rows = [];
    for (let r = 4; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const num = row.getCell(1).value;
        if (num == null) continue;
        rows.push({
            num: num,
            video: row.getCell(2).value || "",
            pitchType: row.getCell(3).value || "",
            velocity: row.getCell(4).value || "",
            velRange: row.getCell(5).value || "",
            ballStrike: row.getCell(6).value || "",
            result: row.getCell(7).value || "",
            batter: row.getCell(8).value || "",
            count: row.getCell(9).value || "",
            abResult: row.getCell(10).value || "",
        });
    }

    console.log("Total rows: " + rows.length + "\n");

    // Print all rows
    console.log("# | Video | Type | Vel | B/S | Result | Batter | Count | AB Result");
    console.log("--|-------|------|-----|-----|--------|--------|-------|----------");
    rows.forEach((r) => {
        console.log(
            [
                String(r.num).padStart(2),
                String(r.video).replace(".MOV", "").padEnd(8),
                String(r.pitchType).padEnd(10),
                String(r.velocity).padStart(5),
                String(r.ballStrike).padEnd(6),
                String(r.result).padEnd(20),
                String(r.batter).padEnd(15),
                String(r.count).padEnd(5),
                String(r.abResult),
            ].join(" | ")
        );
    });

    // Summaries
    const strikes = rows.filter((r) => r.ballStrike === "Strike").length;
    const balls = rows.filter((r) => r.ballStrike === "Ball").length;
    const hbp = rows.filter((r) => String(r.ballStrike).toUpperCase() === "HBP").length;

    console.log("\n=== GAME SUMMARY ===");
    console.log("Total pitches: " + rows.length);
    console.log("Strikes: " + strikes + " (" + ((strikes / rows.length) * 100).toFixed(1) + "%)");
    console.log("Balls: " + balls + " (" + ((balls / rows.length) * 100).toFixed(1) + "%)");
    if (hbp) console.log("HBP: " + hbp);

    // Unique batters
    const batters = [...new Set(rows.map((r) => r.batter).filter((b) => b && String(b).trim()))];
    console.log("\nBatters faced: " + batters.length);
    batters.forEach((b) => {
        const bRows = rows.filter((r) => r.batter === b);
        const abRes = bRows.filter((r) => r.abResult && String(r.abResult).trim());
        const lastResult = abRes.length > 0 ? abRes[abRes.length - 1].abResult : "";
        const pitchCount = bRows.length;
        const bStrikes = bRows.filter((r) => r.ballStrike === "Strike").length;
        const bBalls = bRows.filter((r) => r.ballStrike === "Ball").length;
        console.log("  " + b + ": " + pitchCount + " pitches (" + bStrikes + "S/" + bBalls + "B) -> " + lastResult);
    });

    // AB Results breakdown
    const abResults = {};
    rows.forEach((r) => {
        if (r.abResult && String(r.abResult).trim()) {
            const key = String(r.abResult).trim();
            abResults[key] = (abResults[key] || 0) + 1;
        }
    });
    if (Object.keys(abResults).length > 0) {
        console.log("\nAB Results: " + JSON.stringify(abResults));
    }

    // Result breakdown
    const results = {};
    rows.forEach((r) => {
        if (r.result && String(r.result).trim()) {
            const key = String(r.result).trim();
            results[key] = (results[key] || 0) + 1;
        }
    });
    if (Object.keys(results).length > 0) {
        console.log("Pitch Results: " + JSON.stringify(results));
    }

    // Pitch type breakdown by B/S
    console.log("\n=== PITCH TYPE x BALL/STRIKE ===");
    const types = [...new Set(rows.map((r) => r.pitchType))];
    types.forEach((t) => {
        const tRows = rows.filter((r) => r.pitchType === t);
        const tS = tRows.filter((r) => r.ballStrike === "Strike").length;
        const tB = tRows.filter((r) => r.ballStrike === "Ball").length;
        console.log("  " + t + ": " + tRows.length + " total | " + tS + " strikes (" + ((tS / tRows.length) * 100).toFixed(0) + "%) | " + tB + " balls");
    });

    // Save
    fs.writeFileSync("./temp/full_game_data.json", JSON.stringify(rows, null, 2));
}

read().catch((e) => console.error(e));
