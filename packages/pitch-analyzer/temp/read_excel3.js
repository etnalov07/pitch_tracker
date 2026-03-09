const ExcelJS = require('exceljs');
async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/SVNViews/pitch_tracker/videos/Angelo_Analysis.xlsx');
    const ws = wb.worksheets[0];
    for (var i = 4; i <= ws.rowCount; i++) {
        var row = ws.getRow(i);
        var num = row.getCell(1).value;
        if (!num) break;
        var video = row.getCell(2).value || '';
        var actual = row.getCell(3).value || '';
        var detected = row.getCell(4).value || '';
        var calVel = row.getCell(6).value || '';
        var radar = row.getCell(15).value || '';
        console.log(String(num).padStart(2) + '  ' + String(video).padEnd(38) + ' Actual: ' + String(actual).padEnd(12) + ' Det: ' + String(detected).padEnd(12) + ' CalVel: ' + String(calVel).padEnd(6) + ' Radar: ' + radar);
    }
}
main().catch(console.error);
