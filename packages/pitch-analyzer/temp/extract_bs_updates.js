const ExcelJS = require("exceljs");
const fs = require("fs");

async function extract() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile("C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_Final.xlsx");
    const ws = wb.worksheets[0]; // Pitch Chart (Corrected)

    const rows = [];
    for (let r = 4; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const num = row.getCell(1).value;
        if (num == null) continue;
        const video = row.getCell(2).value;
        const pitchType = row.getCell(3).value;
        const velocity = row.getCell(4).value;
        const velRange = row.getCell(5).value;
        const ballStrike = row.getCell(6).value;
        const result = row.getCell(7).value || "";
        const batter = row.getCell(8).value || "";
        const count = row.getCell(9).value || "";
        const abResult = row.getCell(10).value || "";
        rows.push({ num, video, pitchType, velocity, velRange, ballStrike, result, batter, count, abResult });
    }

    console.log("Extracted " + rows.length + " rows\n");

    // Show all rows with B/S
    rows.forEach((r) => {
        console.log(r.num + " | " + r.video + " | " + r.pitchType + " | " + r.velocity + " mph | " + r.ballStrike);
    });

    // Summary
    const strikes = rows.filter((r) => r.ballStrike === "Strike").length;
    const balls = rows.filter((r) => r.ballStrike === "Ball").length;
    const other = rows.filter((r) => r.ballStrike !== "Strike" && r.ballStrike !== "Ball").length;
    console.log("\nStrikes: " + strikes);
    console.log("Balls: " + balls);
    if (other > 0) console.log("Other/blank: " + other);
    console.log("Strike %: " + ((strikes / rows.length) * 100).toFixed(1) + "%");

    // Update ground_truth_comparison.json with corrected B/S
    const comparison = JSON.parse(fs.readFileSync("./temp/ground_truth_comparison.json", "utf8"));
    const bsMap = {};
    rows.forEach((r) => bsMap[r.video] = r.ballStrike);

    let changed = 0;
    comparison.forEach((p) => {
        if (bsMap[p.video] && bsMap[p.video] !== p.ball_strike) {
            console.log("  Updated: " + p.video + " " + p.ball_strike + " -> " + bsMap[p.video]);
            p.ball_strike = bsMap[p.video];
            changed++;
        }
    });
    console.log("\n" + changed + " ball/strike values changed");

    fs.writeFileSync("./temp/ground_truth_comparison.json", JSON.stringify(comparison, null, 2));
    console.log("Saved updated ground_truth_comparison.json");
}

extract().catch((e) => console.error(e));
