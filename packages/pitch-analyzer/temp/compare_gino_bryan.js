const ExcelJS = require('exceljs');
const { computeVelocity } = require('../dist/calibration');
const calibDb = require('../calibration.json');
const sessionData = require('./session_analysis.json');

async function main() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('C:/Users/volantbr/Downloads/Gino-Bryan_Pitch_Analysis_v4.xlsx');
    const ws = wb.worksheets[0];

    // Parse v4 data (cols: 1=#, 2=Video, 3=PitchType, 4=Velocity, 5=VelRange, 6=B/S, 7=Result)
    const v4Data = {};
    ws.eachRow((row, rowNum) => {
        if (rowNum <= 3) return; // skip header rows
        const vals = [];
        row.eachCell((cell, colNum) => { vals[colNum] = cell.value; });
        const video = String(vals[2] || '');
        if (!video.match(/^IMG_\d+\.MOV$/)) return;
        v4Data[video] = {
            pitchType: String(vals[3] || ''),
            velocity: parseFloat(vals[4]) || 0,
            ballStrike: String(vals[6] || ''),
            result: String(vals[7] || ''),
            batter: String(vals[8] || ''),
            count: String(vals[9] || ''),
            abResult: String(vals[10] || ''),
        };
    });

    const videos = Object.keys(v4Data).sort();
    console.log('=== Gino-Bryan: v4 (Previous) vs New Calibrated Analysis ===\n');

    // Header
    console.log(
        '#'.padStart(2),
        'Video'.padEnd(15),
        'Actual Type'.padEnd(12),
        'New Detect'.padEnd(11),
        'Match'.padEnd(6),
        'v4 Vel'.padStart(7),
        'New Vel'.padStart(8),
        'Diff'.padStart(6),
        'v4 B/S'.padEnd(7),
        'New B/S'.padEnd(8),
        'BS Match'
    );
    console.log('-'.repeat(105));

    let typeCorrect = 0, typeTotal = 0;
    let bsCorrect = 0, bsTotal = 0;
    let velDiffSum = 0, velDiffAbsSum = 0, velCount = 0;
    const typeCounts = { correct: {}, total: {} };
    const bsCompare = { correct: 0, total: 0 };

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const v4 = v4Data[video];
        const sess = sessionData.find(p => p.video === video);
        if (!sess) continue;

        const newType = sess.detected_pitch_type || 'Fastball';
        const actualType = v4.pitchType;
        const typeMatch = newType === actualType;

        // Calibrated velocity using actual pitch type from v4
        const calVel = computeVelocity(actualType, {
            glove_pop_amplitude: sess.glove_pop_amplitude || 0,
            fb_score: sess.fb_score || 0,
            decay_ratio: sess.decay_ratio || 0,
            pop_zcr: sess.pop_zcr || 0,
        }, calibDb);

        const velDiff = calVel.velocity - v4.velocity;
        const newBS = sess.ball_strike_detected || '';
        const actualBS = v4.ballStrike;
        const bsMatch = newBS === actualBS;

        typeTotal++;
        if (typeMatch) typeCorrect++;
        if (!typeCounts.total[actualType]) typeCounts.total[actualType] = 0;
        if (!typeCounts.correct[actualType]) typeCounts.correct[actualType] = 0;
        typeCounts.total[actualType]++;
        if (typeMatch) typeCounts.correct[actualType]++;

        if (actualBS) {
            bsTotal++;
            if (bsMatch) bsCorrect++;
        }

        if (v4.velocity > 0) {
            velDiffSum += velDiff;
            velDiffAbsSum += Math.abs(velDiff);
            velCount++;
        }

        console.log(
            String(i + 1).padStart(2),
            video.padEnd(15),
            actualType.padEnd(12),
            newType.padEnd(11),
            (typeMatch ? '✓' : '✗').padEnd(6),
            (v4.velocity.toFixed(1)).padStart(7),
            (calVel.velocity.toFixed(1)).padStart(8),
            ((velDiff >= 0 ? '+' : '') + velDiff.toFixed(1)).padStart(6),
            actualBS.padEnd(7),
            newBS.padEnd(8),
            bsMatch ? '✓' : '✗'
        );
    }

    console.log('-'.repeat(105));
    console.log('\n=== SUMMARY ===\n');

    console.log('Pitch Type Detection:');
    console.log(`  Overall: ${typeCorrect}/${typeTotal} (${Math.round(100 * typeCorrect / typeTotal)}%)`);
    for (const type of ['Fastball', 'Curveball', 'Changeup']) {
        if (typeCounts.total[type]) {
            console.log(`  ${type}: ${typeCounts.correct[type]}/${typeCounts.total[type]} (${Math.round(100 * typeCounts.correct[type] / typeCounts.total[type])}%)`);
        }
    }

    console.log(`\nBall/Strike Detection:`);
    console.log(`  ${bsCorrect}/${bsTotal} (${Math.round(100 * bsCorrect / bsTotal)}%)`);

    console.log(`\nVelocity Comparison (calibrated vs v4):`);
    console.log(`  Mean diff: ${(velDiffSum / velCount).toFixed(2)} mph`);
    console.log(`  Mean abs diff: ${(velDiffAbsSum / velCount).toFixed(2)} mph`);
    console.log(`  Max abs diff: ${Math.max(...videos.map(v => {
        const s = sessionData.find(p => p.video === v);
        if (!s) return 0;
        const cv = computeVelocity(v4Data[v].pitchType, {
            glove_pop_amplitude: s.glove_pop_amplitude || 0,
            fb_score: s.fb_score || 0,
            decay_ratio: s.decay_ratio || 0,
            pop_zcr: s.pop_zcr || 0,
        }, calibDb);
        return Math.abs(cv.velocity - v4Data[v].velocity);
    })).toFixed(1)} mph`);
}

main().catch(console.error);
