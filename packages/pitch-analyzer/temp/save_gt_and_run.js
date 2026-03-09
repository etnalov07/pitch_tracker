const ExcelJS = require('exceljs');
const fs = require('fs');

async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_Final_v2.xlsx');

    const ws = wb.worksheets[0];
    const gt = {};

    ws.eachRow((row) => {
        const vals = [];
        row.eachCell((cell, colNum) => { vals[colNum] = cell.value; });
        const video = String(vals[2] || '');
        const pitchType = String(vals[3] || '');
        if (video.match(/^IMG_\d+\.MOV$/) && ['Fastball', 'Curveball', 'Changeup'].includes(pitchType)) {
            gt[video] = { pitch_type: pitchType };
        }
    });

    fs.writeFileSync('./temp/ground_truth_v2.json', JSON.stringify(gt, null, 2));
    console.log('Saved ground_truth_v2.json with', Object.keys(gt).length, 'entries');
}

main().catch(console.error);
