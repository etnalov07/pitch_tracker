const ExcelJS = require("exceljs");
const fs = require("fs");

async function read() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile("C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_Final.xlsx");

    // Check all sheets
    wb.worksheets.forEach((ws) => {
        console.log("Sheet: " + ws.name + " (rows: " + ws.rowCount + ")");
    });

    const ws = wb.worksheets[0];

    // Get headers from row 3
    const headers = [];
    const headerRow = ws.getRow(3);
    for (let c = 1; c <= 20; c++) {
        const v = headerRow.getCell(c).value;
        if (v) headers.push({ col: c, name: String(v).replace(/\n/g, " ") });
    }
    console.log("\nHeaders:");
    headers.forEach((h) => console.log("  Col " + h.col + ": " + h.name));

    // Extract all data rows
    const rows = [];
    for (let r = 4; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const num = row.getCell(1).value;
        if (num == null) continue;

        const data = {};
        headers.forEach((h) => {
            data[h.name] = row.getCell(h.col).value;
        });
        rows.push(data);
    }

    console.log("\nTotal rows: " + rows.length);

    // Print all rows
    console.log("\n# | Video | Type | Velocity | B/S | Result | Batter | Count | AB Result");
    console.log("--|-------|------|----------|-----|--------|--------|-------|----------");
    rows.forEach((r) => {
        console.log(
            [
                r["#"],
                (r["Video"] || "").replace(".MOV", ""),
                r["Pitch Type"] || "",
                (r["Velocity (mph)"] || "") + " mph",
                r["Ball / Strike"] || "",
                r["Result"] || "",
                r["Batter"] || "",
                r["Count"] || "",
                r["AB Result"] || "",
            ].join(" | ")
        );
    });

    // Summaries
    const strikes = rows.filter((r) => r["Ball / Strike"] === "Strike").length;
    const balls = rows.filter((r) => r["Ball / Strike"] === "Ball").length;
    const hbp = rows.filter((r) => r["Ball / Strike"] === "HBP").length;
    const foul = rows.filter((r) => r["Result"] && String(r["Result"]).toLowerCase().includes("foul")).length;

    console.log("\n=== SUMMARY ===");
    console.log("Total: " + rows.length);
    console.log("Strikes: " + strikes + " | Balls: " + balls + (hbp ? " | HBP: " + hbp : ""));
    console.log("Strike %: " + ((strikes / rows.length) * 100).toFixed(1) + "%");

    // Pitch type breakdown
    const types = {};
    rows.forEach((r) => {
        const t = r["Pitch Type"] || "Unknown";
        types[t] = (types[t] || 0) + 1;
    });
    console.log("\nPitch types: " + JSON.stringify(types));

    // Velocity by type
    console.log("\nVelocity by type:");
    for (const [type, count] of Object.entries(types)) {
        const vels = rows.filter((r) => r["Pitch Type"] === type).map((r) => r["Velocity (mph)"]).filter((v) => v);
        if (vels.length > 0) {
            const avg = (vels.reduce((a, b) => a + b, 0) / vels.length).toFixed(1);
            console.log("  " + type + ": " + count + " pitches, avg " + avg + " mph (" + Math.min(...vels).toFixed(1) + "-" + Math.max(...vels).toFixed(1) + ")");
        }
    }

    // Check for new columns or data we haven't seen
    const resultValues = {};
    const abResultValues = {};
    rows.forEach((r) => {
        if (r["Result"]) resultValues[r["Result"]] = (resultValues[r["Result"]] || 0) + 1;
        if (r["AB Result"]) abResultValues[r["AB Result"]] = (abResultValues[r["AB Result"]] || 0) + 1;
    });
    if (Object.keys(resultValues).length > 0) console.log("\nResult values: " + JSON.stringify(resultValues));
    if (Object.keys(abResultValues).length > 0) console.log("AB Result values: " + JSON.stringify(abResultValues));

    // Save updated data as JSON
    fs.writeFileSync("./temp/final_review_data.json", JSON.stringify(rows, null, 2));
}

read().catch((e) => console.error(e));
