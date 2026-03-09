const ExcelJS = require('exceljs');
async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/SVNViews/pitch_tracker/videos/Angelo_Analysis.xlsx');
    const ws = wb.worksheets[0];
    const headers = [];
    ws.getRow(1).eachCell(function(cell, col) { headers[col] = cell.value; });
    console.log('Columns:', headers.filter(Boolean).join(', '));
    console.log('Rows:', ws.rowCount - 1);
    console.log();
    for (var i = 2; i <= ws.rowCount; i++) {
        var row = ws.getRow(i);
        var obj = {};
        headers.forEach(function(h, col) { if (h) obj[h] = row.getCell(col).value; });
        var video = obj['Video'] || '';
        var detected = obj['Pitch Type'] || '';
        var actual = obj['Actual Pitch Type'] || '';
        var radar = obj['Pocket Radar Velocity'] || '';
        var calVel = obj['Calibrated Velocity'] || obj['Est. Velocity'] || '';
        var bs = obj['Ball/Strike'] || '';
        var num = String(i - 1).padStart(2);
        console.log(num + '  ' + String(video).padEnd(38) + ' Det: ' + String(detected).padEnd(12) + ' Actual: ' + String(actual).padEnd(12) + ' Radar: ' + String(radar).padEnd(6) + ' B/S: ' + String(bs).padEnd(8) + ' CalVel: ' + calVel);
    }
}
main().catch(console.error);
