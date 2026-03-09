const ExcelJS = require("exceljs");
const fs = require("fs");

async function read() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile("C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_Final.xlsx");

    // List all sheet names to find the right one
    wb.worksheets.forEach((ws) => {
        console.log("Sheet: " + ws.name + " (rows: " + ws.rowCount + ")");
    });

    // Try the first sheet
    const ws = wb.worksheets[0];
    console.log("\nHeaders from row 1:");
    const headerRow = ws.getRow(1);
    for (let c = 1; c <= 15; c++) {
        const val = headerRow.getCell(c).value;
        if (val) console.log("  Col " + c + ": " + val);
    }

    // Check row 2 and 3 for headers too
    for (let r = 2; r <= 4; r++) {
        const row = ws.getRow(r);
        const vals = [];
        for (let c = 1; c <= 15; c++) {
            const v = row.getCell(c).value;
            if (v) vals.push("C" + c + "=" + v);
        }
        if (vals.length > 0) console.log("Row " + r + ": " + vals.join(" | "));
    }

    // Print first 5 data rows to understand structure
    console.log("\nSample data rows:");
    for (let r = 5; r <= 9; r++) {
        const row = ws.getRow(r);
        const vals = [];
        for (let c = 1; c <= 12; c++) {
            vals.push(row.getCell(c).value);
        }
        console.log("  Row " + r + ": " + JSON.stringify(vals));
    }
}

read().catch((e) => console.error(e));
