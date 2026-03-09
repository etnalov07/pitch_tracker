const ExcelJS = require('exceljs');
const { computeVelocity } = require('../dist/calibration');
const calibDb = require('../calibration.json');
const sessionData = require('./session_analysis.json');

async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/Users/volantbr/Downloads/Gino-Bryan_Pitch_Analysis_v4.xlsx');
    const ws = wb.worksheets[0];

    const v4Data = {};
    ws.eachRow((row, rowNum) => {
        if (rowNum <= 3) return;
        const vals = [];
        row.eachCell((cell, colNum) => { vals[colNum] = cell.value; });
        const video = String(vals[2] || '');
        const pitchType = String(vals[3] || '');
        if (video.match(/^IMG_\d+\.MOV$/) && ['Fastball', 'Curveball', 'Changeup'].includes(pitchType)) {
            v4Data[video] = { pitchType, velocity: parseFloat(vals[4]) || 0 };
        }
    });

    const videos = Object.keys(v4Data).sort();
    let sumDiff = 0, sumAbsDiff = 0, count = 0;
    const byType = {};

    for (const video of videos) {
        const v4 = v4Data[video];
        const sess = sessionData.find(p => p.video === video);
        if (!sess) continue;

        const calVel = computeVelocity(v4.pitchType, {
            glove_pop_amplitude: sess.glove_pop_amplitude || 0,
            fb_score: sess.fb_score || 0,
            decay_ratio: sess.decay_ratio || 0,
            pop_zcr: sess.pop_zcr || 0,
        }, calibDb);

        const diff = calVel.velocity - v4.velocity;
        sumDiff += diff;
        sumAbsDiff += Math.abs(diff);
        count++;

        if (!byType[v4.pitchType]) byType[v4.pitchType] = { diffs: [], absDiffs: [] };
        byType[v4.pitchType].diffs.push(diff);
        byType[v4.pitchType].absDiffs.push(Math.abs(diff));
    }

    console.log('=== Velocity: Calibrated (122 entries) vs v4 ===\n');
    console.log('Overall:');
    console.log('  Mean diff:', (sumDiff / count).toFixed(2), 'mph');
    console.log('  Mean abs diff:', (sumAbsDiff / count).toFixed(2), 'mph\n');

    for (const type of ['Fastball', 'Curveball', 'Changeup']) {
        if (!byType[type]) continue;
        const d = byType[type];
        const mean = d.diffs.reduce((s, v) => s + v, 0) / d.diffs.length;
        const meanAbs = d.absDiffs.reduce((s, v) => s + v, 0) / d.absDiffs.length;
        const max = Math.max(...d.absDiffs);
        console.log(`${type} (n=${d.diffs.length}):`);
        console.log(`  Mean diff: ${mean >= 0 ? '+' : ''}${mean.toFixed(2)} mph`);
        console.log(`  Mean abs diff: ${meanAbs.toFixed(2)} mph`);
        console.log(`  Max abs diff: ${max.toFixed(1)} mph`);
    }
}

main().catch(console.error);
