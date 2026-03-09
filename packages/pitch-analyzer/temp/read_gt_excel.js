const ExcelJS = require('exceljs');

async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_Final_v2.xlsx');

    const ws = wb.worksheets[0];
    const gt = {};

    ws.eachRow((row, rowNum) => {
        const vals = [];
        row.eachCell((cell, colNum) => { vals[colNum] = cell.value; });
        const video = String(vals[2] || '');
        const pitchType = String(vals[3] || '');
        if (video.match(/^IMG_\d+\.MOV$/) && ['Fastball', 'Curveball', 'Changeup'].includes(pitchType)) {
            gt[video] = { pitch_type: pitchType };
        }
    });

    const types = {};
    Object.values(gt).forEach(v => { types[v.pitch_type] = (types[v.pitch_type] || 0) + 1; });
    console.log('Ground truth entries:', Object.keys(gt).length);
    console.log('Types:', JSON.stringify(types));
    console.log('---GT_JSON---');
    console.log(JSON.stringify(gt));
}

main().catch(console.error);
