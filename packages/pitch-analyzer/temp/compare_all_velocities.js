const ExcelJS = require('exceljs');

async function readVelocities(path) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const ws = wb.worksheets[0];
    const rows = {};
    let headers = [];

    ws.eachRow((row) => {
        const vals = [];
        row.eachCell((cell, colNum) => { vals[colNum] = cell.value; });

        if (vals.some(v => String(v) === 'Video')) {
            headers = vals;
            return;
        }

        const videoIdx = headers.findIndex(h => String(h) === 'Video');
        const velIdx = headers.findIndex(h => String(h || '').includes('Velocity') || String(h || '').includes('Est. Vel'));
        if (videoIdx < 0) return;

        const video = String(vals[videoIdx] || '');
        if (!video.match(/^IMG_\d+\.MOV$/)) return;
        rows[video] = velIdx >= 0 ? parseFloat(vals[velIdx]) : NaN;
    });
    return rows;
}

async function main() {
    const full = await readVelocities('C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_120fps.xlsx');
    const session = await readVelocities('C:/SVNViews/pitch_tracker/videos/80plus_Analysis.xlsx');

    // Get calibrated velocities from calibrate-velocity output (we stored session_analysis.json)
    const calData = require('./session_analysis.json');
    const calibDb = require('../calibration.json');
    const { computeVelocity } = require('../dist/calibration');

    const videos = Object.keys(session).sort();

    console.log('Video            Full Game   Session-Only   Calibrated   Cal-Full Diff');
    console.log('-'.repeat(80));

    let sumFull = 0, sumSess = 0, sumCal = 0, count = 0;
    let totalDiffCal = 0, totalDiffSess = 0;

    for (const video of videos) {
        const r = calData.find(p => p.video === video);
        if (!r) continue;

        const pitchType = r.actual_pitch_type || r.detected_pitch_type || 'Fastball';
        const calVel = computeVelocity(pitchType, {
            glove_pop_amplitude: r.glove_pop_amplitude || 0,
            fb_score: r.fb_score || 0,
            decay_ratio: r.decay_ratio || 0,
            pop_zcr: r.pop_zcr || 0,
        }, calibDb);

        const fullVel = full[video];
        const sessVel = session[video];
        const diff = (calVel.velocity - fullVel).toFixed(1);

        sumFull += fullVel;
        sumSess += sessVel;
        sumCal += calVel.velocity;
        totalDiffCal += Math.abs(calVel.velocity - fullVel);
        totalDiffSess += Math.abs(sessVel - fullVel);
        count++;

        console.log(
            video.padEnd(17),
            (fullVel.toFixed(1) + ' mph').padStart(9),
            (sessVel.toFixed(1) + ' mph').padStart(12),
            (calVel.velocity.toFixed(1) + ' mph').padStart(10),
            (diff >= 0 ? '  +' : '  ') + diff
        );
    }

    console.log('-'.repeat(80));
    console.log(
        'Average'.padEnd(17),
        ((sumFull / count).toFixed(1) + ' mph').padStart(9),
        ((sumSess / count).toFixed(1) + ' mph').padStart(12),
        ((sumCal / count).toFixed(1) + ' mph').padStart(10)
    );
    console.log('\nMean Abs Error vs Full Game:');
    console.log('  Session-only:', (totalDiffSess / count).toFixed(2), 'mph');
    console.log('  Calibrated:  ', (totalDiffCal / count).toFixed(2), 'mph');
}

main().catch(console.error);
