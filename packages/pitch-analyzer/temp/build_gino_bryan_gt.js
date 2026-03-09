const ExcelJS = require('exceljs');
const fs = require('fs');

async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/Users/volantbr/Downloads/Gino-Bryan_Pitch_Analysis_v4.xlsx');
    const ws = wb.worksheets[0];

    // Build ground truth from v4: col2=Video, col3=PitchType, col6=B/S
    const gt = {};
    ws.eachRow((row, rowNum) => {
        if (rowNum <= 3) return;
        const vals = [];
        row.eachCell((cell, colNum) => { vals[colNum] = cell.value; });
        const video = String(vals[2] || '');
        const pitchType = String(vals[3] || '');
        if (video.match(/^IMG_\d+\.MOV$/) && ['Fastball', 'Curveball', 'Changeup'].includes(pitchType)) {
            gt[video] = { pitch_type: pitchType };
        }
    });

    fs.writeFileSync('./temp/gino_bryan_gt.json', JSON.stringify(gt, null, 2));

    const types = {};
    Object.values(gt).forEach(v => { types[v.pitch_type] = (types[v.pitch_type] || 0) + 1; });
    console.log('Ground truth:', Object.keys(gt).length, 'pitches');
    console.log('Types:', JSON.stringify(types));
}

main().catch(console.error);
