const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function main() {
    // Read Excel ground truth
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/SVNViews/pitch_tracker/videos/Angelo_Analysis.xlsx');
    const ws = wb.worksheets[0];
    
    var gtMap = {};
    var radarMap = {};
    for (var i = 4; i <= ws.rowCount; i++) {
        var row = ws.getRow(i);
        var num = row.getCell(1).value;
        if (!num) break;
        var video = row.getCell(2).value;
        var actual = row.getCell(3).value;
        var radar = row.getCell(15).value;
        if (video && actual) gtMap[video] = actual;
        if (video && radar) radarMap[video] = radar;
    }
    
    // Update session_analysis.json
    var session = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'session_analysis.json'), 'utf8'));
    session.forEach(function(r) {
        if (gtMap[r.video]) r.actual_pitch_type = gtMap[r.video];
        if (radarMap[r.video]) r.radar_velocity = radarMap[r.video];
    });
    
    fs.writeFileSync(path.resolve(__dirname, 'session_analysis.json'), JSON.stringify(session, null, 2));
    
    // Output radar map as JSON for calibrate-add
    console.log('RADAR_MAP:');
    console.log(JSON.stringify(radarMap));
    console.log();
    
    // Summary
    var types = {};
    session.forEach(function(r) {
        var t = r.actual_pitch_type || 'unknown';
        types[t] = (types[t] || 0) + 1;
    });
    console.log('Pitch type breakdown:', JSON.stringify(types));
    console.log('Radar readings:', Object.keys(radarMap).length);
    
    // Accuracy check
    var correct = 0, total = 0;
    session.forEach(function(r) {
        if (r.actual_pitch_type && r.detected_pitch_type) {
            total++;
            if (r.actual_pitch_type === r.detected_pitch_type) correct++;
        }
    });
    console.log('Detection accuracy: ' + correct + '/' + total + ' (' + Math.round(correct/total*100) + '%)');
}
main().catch(console.error);
