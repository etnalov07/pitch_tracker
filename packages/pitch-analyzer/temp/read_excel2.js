const ExcelJS = require('exceljs');
async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/SVNViews/pitch_tracker/videos/Angelo_Analysis.xlsx');
    const ws = wb.worksheets[0];
    // Print first 5 rows raw to understand structure
    for (var i = 1; i <= Math.min(5, ws.rowCount); i++) {
        var row = ws.getRow(i);
        var vals = [];
        row.eachCell({ includeEmpty: true }, function(cell, col) {
            vals.push('C' + col + '=' + JSON.stringify(cell.value));
        });
        console.log('Row ' + i + ': ' + vals.join(' | '));
    }
    console.log('---');
    // Find the actual header row (look for "Video")
    for (var i = 1; i <= Math.min(10, ws.rowCount); i++) {
        var row = ws.getRow(i);
        row.eachCell(function(cell) {
            if (String(cell.value).includes('Video') || String(cell.value).includes('Pitch')) {
                console.log('Found header-like value at row ' + i + ': ' + cell.value);
            }
        });
    }
    // Also check all sheet names
    wb.worksheets.forEach(function(s) { console.log('Sheet: ' + s.name); });
}
main().catch(console.error);
