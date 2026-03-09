const ExcelJS = require('exceljs');

async function readExcel(path) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const ws = wb.worksheets[0];
    const rows = {};
    let headers = [];

    ws.eachRow((row, rowNum) => {
        const vals = [];
        row.eachCell((cell, colNum) => { vals[colNum] = cell.value; });

        // Find header row (has "Video" in it)
        if (vals.some(v => String(v) === 'Video')) {
            headers = vals;
            return;
        }

        // Find video column and velocity column
        const videoIdx = headers.findIndex(h => String(h) === 'Video');
        const velIdx = headers.findIndex(h => String(h || '').includes('Velocity') || String(h || '').includes('Est. Vel'));

        if (videoIdx < 0) return;

        const video = String(vals[videoIdx] || '');
        if (!video.match(/^IMG_\d+\.MOV$/)) return;

        rows[video] = {
            velocity: velIdx >= 0 ? vals[velIdx] : null,
            allVals: vals,
            headers: headers,
        };
    });

    return { rows, headers };
}

async function main() {
    const full = await readExcel('C:/SVNViews/pitch_tracker/videos/Gino_vs_Clear_Falls_120fps.xlsx');
    const plus = await readExcel('C:/SVNViews/pitch_tracker/videos/80plus_Analysis.xlsx');

    console.log('Full game headers:', full.headers.filter(Boolean).join(' | '));
    console.log('80plus headers:', plus.headers.filter(Boolean).join(' | '));
    console.log('');

    // Show the 14 80plus videos
    const videos80 = Object.keys(plus.rows).sort();

    console.log('Video          Full Vel    80plus Vel    Diff');
    console.log('-'.repeat(60));

    let totalFull = 0, total80 = 0, count = 0;

    for (const video of videos80) {
        const fullVel = full.rows[video] ? full.rows[video].velocity : null;
        const plusVel = plus.rows[video] ? plus.rows[video].velocity : null;

        const fv = typeof fullVel === 'number' ? fullVel : parseFloat(fullVel);
        const pv = typeof plusVel === 'number' ? plusVel : parseFloat(plusVel);

        const diff = (!isNaN(fv) && !isNaN(pv)) ? (pv - fv).toFixed(1) : 'N/A';

        console.log(
            video.padEnd(15),
            (!isNaN(fv) ? fv.toFixed(1) + ' mph' : String(fullVel)).padStart(10),
            (!isNaN(pv) ? pv.toFixed(1) + ' mph' : String(plusVel)).padStart(12),
            String(diff).padStart(8)
        );

        if (!isNaN(fv)) { totalFull += fv; count++; }
        if (!isNaN(pv)) total80 += pv;
    }

    console.log('-'.repeat(60));
    if (count > 0) {
        console.log('Average'.padEnd(15), (totalFull / count).toFixed(1).padStart(6) + ' mph', (total80 / count).toFixed(1).padStart(8) + ' mph');
    }
}

main().catch(console.error);
