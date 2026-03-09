const ExcelJS = require("exceljs");
const fs = require("fs");

async function merge() {
    // Read Excel updates
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile("C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_Final.xlsx");
    const ws = wb.worksheets[0];

    const excelData = {};
    for (let r = 4; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const num = row.getCell(1).value;
        if (num == null) continue;
        const video = row.getCell(2).value;
        excelData[video] = {
            ballStrike: row.getCell(6).value || "",
            result: row.getCell(7).value || "",
            batter: row.getCell(8).value || "",
            count: row.getCell(9).value || "",
            abResult: row.getCell(10).value || "",
        };
    }

    // Update ground truth comparison
    const comparison = JSON.parse(fs.readFileSync("./temp/ground_truth_comparison.json", "utf8"));

    comparison.forEach((p) => {
        const excel = excelData[p.video];
        if (excel) {
            p.actual_ball_strike = excel.ballStrike;
            p.actual_result = excel.result;
            p.batter = excel.batter;
            p.count = excel.count;
            p.ab_result = excel.abResult;
            // Compute bs_correct: compare detected B/S vs actual
            p.bs_correct = p.ball_strike === excel.ballStrike;
        }
    });

    fs.writeFileSync("./temp/ground_truth_comparison.json", JSON.stringify(comparison, null, 2));

    // Summary
    const strikes = comparison.filter((p) => p.actual_ball_strike === "Strike").length;
    const balls = comparison.filter((p) => p.actual_ball_strike === "Ball").length;
    const bsCorrect = comparison.filter((p) => p.bs_correct).length;
    const withBatter = comparison.filter((p) => p.batter).length;
    const withResult = comparison.filter((p) => p.actual_result).length;
    const withCount = comparison.filter((p) => p.count).length;
    const withAbResult = comparison.filter((p) => p.ab_result && String(p.ab_result).trim()).length;

    console.log("Updated ground_truth_comparison.json");
    console.log("Strikes: " + strikes + " | Balls: " + balls);
    console.log("B/S detection accuracy: " + bsCorrect + "/" + comparison.length + " (" + ((bsCorrect / comparison.length) * 100).toFixed(1) + "%)");
    console.log("Rows with batter: " + withBatter);
    console.log("Rows with result: " + withResult);
    console.log("Rows with count: " + withCount);
    console.log("Rows with AB result: " + withAbResult);
}

merge().catch((e) => console.error(e));
