import type { GroundTruthPitch, VideoPitchResult, KhsResult } from './types';

const ExcelJS = require('exceljs');

const TYPE_COLORS: Record<string, string> = {
    Fastball: 'FFE74C3C',
    Curveball: 'FF3498DB',
    Changeup: 'FF2ECC71',
};

const VELOCITY_BASELINES: Record<string, number> = {
    Fastball: 79,
    Changeup: 72,
    Curveball: 65,
};

const TYPES = ['Fastball', 'Curveball', 'Changeup'];

interface CorrectedPitch extends GroundTruthPitch {
    corrected_velocity: number;
    corrected_vel_low: number;
    corrected_vel_high: number;
}

function computeCorrectedVelocities(comparison: GroundTruthPitch[]): CorrectedPitch[] {
    const typeAmps: Record<string, number[]> = {};
    for (const p of comparison) {
        const type = p.actual_pitch_type;
        if (!typeAmps[type]) typeAmps[type] = [];
        typeAmps[type].push(p.glove_pop_amplitude);
    }

    const typeStats: Record<string, { avg: number; std: number }> = {};
    for (const [type, amps] of Object.entries(typeAmps)) {
        const avg = amps.reduce((s, v) => s + v, 0) / amps.length;
        const std = Math.sqrt(amps.reduce((s, v) => s + (v - avg) ** 2, 0) / amps.length);
        typeStats[type] = { avg, std };
    }

    return comparison.map((p) => {
        const type = p.actual_pitch_type;
        const baseline = VELOCITY_BASELINES[type] ?? 75;
        const stats = typeStats[type];
        const z = stats && stats.std > 0 ? (p.glove_pop_amplitude - stats.avg) / stats.std : 0;
        const scale = type === 'Fastball' ? 2.0 : 1.5;
        const velocity = baseline + Math.max(-4, Math.min(4, z * scale));
        return {
            ...p,
            corrected_velocity: Math.round(velocity * 10) / 10,
            corrected_vel_low: Math.round((velocity - 3) * 10) / 10,
            corrected_vel_high: Math.round((velocity + 3) * 10) / 10,
        };
    });
}

export async function generateSessionExcel(
    comparison: GroundTruthPitch[],
    videoResults: VideoPitchResult[] | null,
    outPath: string,
    sessionName = 'Gino-Bryan'
): Promise<void> {
    const corrected = computeCorrectedVelocities(comparison);
    const wb = new ExcelJS.Workbook();

    // ── Sheet 1: Pitch Chart ──────────────────────────────────────────────────
    const ws = wb.addWorksheet('Pitch Chart (Corrected)');
    const COL_COUNT = 16;
    const lastCol = String.fromCharCode(64 + COL_COUNT);

    ws.mergeCells(`A1:${lastCol}1`);
    ws.getCell('A1').value = `Pitch-by-Pitch Analysis — ${sessionName} Session (Corrected with Ground Truth)`;
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    const fbCount = corrected.filter((p) => p.actual_pitch_type === 'Fastball').length;
    const cbCount = corrected.filter((p) => p.actual_pitch_type === 'Curveball').length;
    const chCount = corrected.filter((p) => p.actual_pitch_type === 'Changeup').length;
    const strikes = corrected.filter((p) => p.actual_ball_strike === 'Strike').length;
    const balls = corrected.filter((p) => p.actual_ball_strike === 'Ball').length;
    const total = corrected.length;

    ws.mergeCells(`A2:${lastCol}2`);
    ws.getCell('A2').value =
        `${total} Pitches | ${strikes} Strikes / ${balls} Balls (${Math.round((strikes / total) * 100)}%) | ${fbCount} FB / ${cbCount} CB / ${chCount} CH`;
    ws.getCell('A2').font = { size: 10, color: { argb: 'FFD4E6F1' } };
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    const headers = [
        { header: '#', width: 4 },
        { header: 'Video', width: 14 },
        { header: 'Pitch Type', width: 12 },
        { header: 'Velocity\n(mph)', width: 10 },
        { header: 'Vel Range\n(mph)', width: 12 },
        { header: 'Ball /\nStrike', width: 8 },
        { header: 'Result', width: 14 },
        { header: 'Batter', width: 12 },
        { header: 'Count', width: 7 },
        { header: 'AB Result', width: 16 },
        { header: 'Pop\nAmplitude', width: 10 },
        { header: 'Audio\nDetected', width: 12 },
        { header: 'Audio\nMatch', width: 8 },
        { header: 'Video+Audio\nDetected', width: 12 },
        { header: 'V+A\nMatch', width: 8 },
        { header: 'B/S\nMatch', width: 8 },
    ];

    const headerRow = ws.getRow(3);
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h.header;
        cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { bottom: { style: 'thin' } };
        ws.getColumn(i + 1).width = h.width;
    });
    headerRow.height = 30;

    corrected.forEach((p, idx) => {
        const row = ws.getRow(idx + 4);
        const type = p.actual_pitch_type;
        const vr = videoResults ? videoResults.find((v) => v.video === p.video) : null;
        const videoType = vr ? vr.video_pitch_type : '';
        const videoCorrect = vr ? vr.video_correct : false;

        row.getCell(1).value = idx + 1;
        row.getCell(2).value = p.video;
        row.getCell(3).value = type;
        row.getCell(4).value = p.corrected_velocity;
        row.getCell(5).value = `${p.corrected_vel_low} - ${p.corrected_vel_high}`;
        row.getCell(6).value = p.actual_ball_strike;
        row.getCell(7).value = p.actual_result;
        row.getCell(8).value = p.batter ?? '';
        row.getCell(9).value = p.count ?? '';
        row.getCell(10).value = p.ab_result ?? '';
        row.getCell(11).value = p.glove_pop_amplitude;
        row.getCell(12).value = p.detected_pitch_type;
        row.getCell(13).value = p.pitch_type_correct ? '\u2713' : '\u2717';
        row.getCell(14).value = videoType;
        row.getCell(15).value = videoCorrect ? '\u2713' : '\u2717';
        row.getCell(16).value = p.bs_correct ? '\u2713' : '\u2717';

        row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_COLORS[type] || 'FFCCCCCC' } };
        row.getCell(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        if (p.actual_ball_strike === 'Strike') {
            row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } };
        } else {
            row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
        }

        const velColor = type === 'Fastball' ? 'FFFDEBD0' : type === 'Curveball' ? 'FFD6EAF8' : 'FFD5F5E3';
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: velColor } };
        row.getCell(13).font = { color: { argb: p.pitch_type_correct ? 'FF27AE60' : 'FFE74C3C' }, bold: true };

        if (videoType) {
            row.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_COLORS[videoType] || 'FFCCCCCC' } };
            row.getCell(14).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
        }
        row.getCell(15).font = { color: { argb: videoCorrect ? 'FF27AE60' : 'FFE74C3C' }, bold: true };
        row.getCell(16).font = { color: { argb: p.bs_correct ? 'FF27AE60' : 'FFE74C3C' }, bold: true };

        if (idx % 2 === 1) {
            for (let c = 1; c <= COL_COUNT; c++) {
                const cell = row.getCell(c);
                if (!cell.fill || cell.fill.fgColor?.argb === undefined || c === 1 || c === 2 || c === 5 || c === 7 || c >= 8) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
                }
            }
        }
        row.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // ── Sheet 2: Pitch Type Analysis ──────────────────────────────────────────
    const ws2 = wb.addWorksheet('Pitch Type Analysis');
    ws2.mergeCells('A1:H1');
    ws2.getCell('A1').value = 'Pitch Type Analysis \u2014 Ground Truth vs Detection';
    ws2.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    ws2.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
    ws2.getCell('A1').alignment = { horizontal: 'center' };

    let rowNum = 3;
    for (const type of TYPES) {
        const pitches = corrected.filter((p) => p.actual_pitch_type === type);
        if (pitches.length === 0) continue;
        const vels = pitches.map((p) => p.corrected_velocity);
        const amps = pitches.map((p) => p.glove_pop_amplitude);
        const typeCorrect = pitches.filter((p) => p.pitch_type_correct).length;
        const bsCorrect = pitches.filter((p) => p.bs_correct).length;
        const pitchStrikes = pitches.filter((p) => p.actual_ball_strike === 'Strike').length;
        const pitchBalls = pitches.filter((p) => p.actual_ball_strike === 'Ball').length;
        const videoTypeCorrect = videoResults
            ? pitches.filter((p) => {
                  const vr = videoResults.find((v) => v.video === p.video);
                  return vr && vr.video_correct;
              }).length
            : 0;

        ws2.getRow(rowNum).getCell(1).value = type;
        ws2.getRow(rowNum).getCell(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        ws2.getRow(rowNum).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_COLORS[type] } };
        rowNum++;

        const data: [string, string][] = [
            ['Count', `${pitches.length} pitches (${Math.round((pitches.length / total) * 100)}%)`],
            ['Velocity Range', `${Math.min(...vels).toFixed(1)} - ${Math.max(...vels).toFixed(1)} mph`],
            ['Avg Velocity', `${(vels.reduce((s, v) => s + v, 0) / vels.length).toFixed(1)} mph`],
            ['Amplitude Range', `${Math.min(...amps)} - ${Math.max(...amps)}`],
            ['Avg Amplitude', `${Math.round(amps.reduce((s, v) => s + v, 0) / amps.length)}`],
            ['Strikes / Balls', `${pitchStrikes} / ${pitchBalls} (${Math.round((pitchStrikes / pitches.length) * 100)}% strike)`],
            ['Audio Detection', `${typeCorrect}/${pitches.length} correct (${Math.round((typeCorrect / pitches.length) * 100)}%)`],
            [
                'Video+Audio Det.',
                `${videoTypeCorrect}/${pitches.length} correct (${Math.round((videoTypeCorrect / pitches.length) * 100)}%)`,
            ],
            ['B/S Detection', `${bsCorrect}/${pitches.length} correct (${Math.round((bsCorrect / pitches.length) * 100)}%)`],
        ];
        for (const [label, value] of data) {
            ws2.getRow(rowNum).getCell(2).value = label;
            ws2.getRow(rowNum).getCell(2).font = { bold: true, size: 10 };
            ws2.getRow(rowNum).getCell(3).value = value;
            rowNum++;
        }
        rowNum++;
    }

    // Audio confusion matrix
    rowNum += 1;
    ws2.getRow(rowNum).getCell(1).value = 'Confusion Matrix (Actual \u2192 Detected)';
    ws2.getRow(rowNum).getCell(1).font = { bold: true, size: 12 };
    rowNum++;
    ws2.getRow(rowNum).getCell(2).value = '\u2192 Fastball';
    ws2.getRow(rowNum).getCell(3).value = '\u2192 Curveball';
    ws2.getRow(rowNum).getCell(4).value = '\u2192 Changeup';
    ws2.getRow(rowNum).getCell(2).font = { bold: true };
    ws2.getRow(rowNum).getCell(3).font = { bold: true };
    ws2.getRow(rowNum).getCell(4).font = { bold: true };
    rowNum++;
    for (const actual of TYPES) {
        ws2.getRow(rowNum).getCell(1).value = actual;
        ws2.getRow(rowNum).getCell(1).font = { bold: true };
        for (let j = 0; j < TYPES.length; j++) {
            const count = corrected.filter((p) => p.actual_pitch_type === actual && p.detected_pitch_type === TYPES[j]).length;
            ws2.getRow(rowNum).getCell(j + 2).value = count;
            if (actual === TYPES[j]) {
                ws2.getRow(rowNum).getCell(j + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } };
                ws2.getRow(rowNum).getCell(j + 2).font = { bold: true };
            } else if (count > 0) {
                ws2.getRow(rowNum).getCell(j + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
            }
        }
        rowNum++;
    }

    // Video+Audio confusion matrix
    if (videoResults) {
        rowNum += 2;
        ws2.getRow(rowNum).getCell(1).value = 'Confusion Matrix (Actual \u2192 Video+Audio Detected)';
        ws2.getRow(rowNum).getCell(1).font = { bold: true, size: 12 };
        rowNum++;
        ws2.getRow(rowNum).getCell(2).value = '\u2192 Fastball';
        ws2.getRow(rowNum).getCell(3).value = '\u2192 Curveball';
        ws2.getRow(rowNum).getCell(4).value = '\u2192 Changeup';
        ws2.getRow(rowNum).getCell(2).font = { bold: true };
        ws2.getRow(rowNum).getCell(3).font = { bold: true };
        ws2.getRow(rowNum).getCell(4).font = { bold: true };
        rowNum++;
        for (const actual of TYPES) {
            ws2.getRow(rowNum).getCell(1).value = actual;
            ws2.getRow(rowNum).getCell(1).font = { bold: true };
            for (let j = 0; j < TYPES.length; j++) {
                const count = videoResults.filter((v) => v.actual_pitch_type === actual && v.video_pitch_type === TYPES[j]).length;
                ws2.getRow(rowNum).getCell(j + 2).value = count;
                if (actual === TYPES[j]) {
                    ws2.getRow(rowNum).getCell(j + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } };
                    ws2.getRow(rowNum).getCell(j + 2).font = { bold: true };
                } else if (count > 0) {
                    ws2.getRow(rowNum).getCell(j + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
                }
            }
            rowNum++;
        }

        rowNum += 1;
        const videoCorrectTotal = videoResults.filter((v) => v.video_correct).length;
        ws2.getRow(rowNum).getCell(1).value = 'Video+Audio Accuracy';
        ws2.getRow(rowNum).getCell(1).font = { bold: true, size: 11 };
        ws2.getRow(rowNum).getCell(2).value = `${videoCorrectTotal}/${total} (${Math.round((videoCorrectTotal / total) * 100)}%)`;
        ws2.getRow(rowNum).getCell(2).font = { bold: true, size: 11, color: { argb: 'FF27AE60' } };
        rowNum++;
        const audioCorrectTotal = corrected.filter((p) => p.pitch_type_correct).length;
        ws2.getRow(rowNum).getCell(1).value = 'Audio-only Accuracy';
        ws2.getRow(rowNum).getCell(1).font = { bold: true, size: 11 };
        ws2.getRow(rowNum).getCell(2).value = `${audioCorrectTotal}/${total} (${Math.round((audioCorrectTotal / total) * 100)}%)`;
        rowNum++;
        ws2.getRow(rowNum).getCell(1).value = 'Improvement';
        ws2.getRow(rowNum).getCell(1).font = { bold: true, size: 11 };
        ws2.getRow(rowNum).getCell(2).value =
            `+${videoCorrectTotal - audioCorrectTotal} pitches (+${Math.round(((videoCorrectTotal - audioCorrectTotal) / total) * 100)} percentage points)`;
        ws2.getRow(rowNum).getCell(2).font = { bold: true, color: { argb: 'FF27AE60' } };
    }

    ws2.getColumn(1).width = 16;
    ws2.getColumn(2).width = 20;
    ws2.getColumn(3).width = 25;
    ws2.getColumn(4).width = 15;

    // ── Sheet 3: Detection Accuracy ───────────────────────────────────────────
    const ws3 = wb.addWorksheet('Detection Accuracy');
    ws3.mergeCells('A1:E1');
    ws3.getCell('A1').value = 'Detection Accuracy Analysis';
    ws3.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    ws3.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
    ws3.getCell('A1').alignment = { horizontal: 'center' };

    const audioTypeAcc = corrected.filter((p) => p.pitch_type_correct).length;
    const videoTypeAcc = videoResults ? videoResults.filter((v) => v.video_correct).length : 0;
    const bsAcc = corrected.filter((p) => p.bs_correct).length;

    const accuracyData: string[][] = [
        ['', '', '', '', ''],
        ['Overall Accuracy', '', '', '', ''],
        ['Audio-Only Pitch Type', `${audioTypeAcc}/${total}`, `${Math.round((audioTypeAcc / total) * 100)}%`, '', ''],
        ['Video+Audio Pitch Type', `${videoTypeAcc}/${total}`, `${Math.round((videoTypeAcc / total) * 100)}%`, '(k-NN, k=7)', ''],
        ['Ball/Strike Detection', `${bsAcc}/${total}`, `${Math.round((bsAcc / total) * 100)}%`, '', ''],
    ];

    accuracyData.forEach((rowData, i) => {
        const r = ws3.getRow(i + 3);
        rowData.forEach((val, j) => {
            r.getCell(j + 1).value = val;
        });
        if (rowData[0] && rowData[0].includes('Overall')) {
            r.getCell(1).font = { bold: true, size: 12 };
        }
    });

    ws3.getColumn(1).width = 22;
    ws3.getColumn(2).width = 55;
    ws3.getColumn(3).width = 10;

    await wb.xlsx.writeFile(outPath);
}

export async function generateKhsExcel(results: KhsResult[], outPath: string): Promise<void> {
    const valid = results.filter((r) => !r.error);
    const labeled = valid.filter((r) => r.actual_pitch_type);

    const enriched = valid.map((r) => {
        const type = r.actual_pitch_type || r.detected_pitch_type || 'Fastball';
        const baseline = VELOCITY_BASELINES[type] ?? 75;
        const allAmps = valid.map((v) => v.glove_pop_amplitude ?? 0);
        const avgAmp = allAmps.reduce((s, v) => s + v, 0) / allAmps.length;
        const stdAmp = Math.sqrt(allAmps.reduce((s, v) => s + (v - avgAmp) ** 2, 0) / allAmps.length);
        const z = stdAmp > 0 ? ((r.glove_pop_amplitude ?? 0) - avgAmp) / stdAmp : 0;
        const scale = type === 'Fastball' ? 2.0 : 1.5;
        const velocity = baseline + Math.max(-4, Math.min(4, z * scale));
        return {
            ...r,
            pitch_type: type,
            velocity: Math.round(velocity * 10) / 10,
            vel_low: Math.round((velocity - 3) * 10) / 10,
            vel_high: Math.round((velocity + 3) * 10) / 10,
        };
    });

    const wb = new ExcelJS.Workbook();

    // ── Sheet 1: Pitch Chart ──────────────────────────────────────────────────
    const ws = wb.addWorksheet('KHS Pitch Chart');
    ws.mergeCells('A1:N1');
    ws.getCell('A1').value = 'KHS Session \u2014 Pitch-by-Pitch Analysis';
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    const fbCount = enriched.filter((p) => p.pitch_type === 'Fastball').length;
    const cbCount = enriched.filter((p) => p.pitch_type === 'Curveball').length;
    const chCount = enriched.filter((p) => p.pitch_type === 'Changeup').length;

    ws.mergeCells('A2:N2');
    ws.getCell('A2').value =
        `${enriched.length} Pitches Analyzed | ${fbCount} FB / ${cbCount} CB / ${chCount} CH | ${labeled.length} with ground truth labels`;
    ws.getCell('A2').font = { size: 10, color: { argb: 'FFD4E6F1' } };
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    const headers = [
        { header: '#', width: 4 },
        { header: 'Video', width: 15 },
        { header: 'Actual\nPitch Type', width: 12 },
        { header: 'Detected\nPitch Type', width: 12 },
        { header: 'Type\nMatch', width: 7 },
        { header: 'Velocity\n(mph)', width: 9 },
        { header: 'Vel Range\n(mph)', width: 12 },
        { header: 'B/S\nDetected', width: 9 },
        { header: 'Actual\nResult', width: 11 },
        { header: 'B/S\nMatch', width: 7 },
        { header: 'Pop\nAmplitude', width: 10 },
        { header: 'Pop\nTime (s)', width: 9 },
        { header: 'Decay\nRatio', width: 8 },
        { header: 'fbScore', width: 8 },
    ];

    const headerRow = ws.getRow(3);
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h.header;
        cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { bottom: { style: 'thin' } };
        ws.getColumn(i + 1).width = h.width;
    });
    headerRow.height = 30;

    enriched.forEach((p, idx) => {
        const row = ws.getRow(idx + 4);
        const actualType = p.actual_pitch_type || '';
        const detectedType = p.detected_pitch_type || '';
        const typeMatch = p.pitch_type_correct;

        let actualBS = '';
        if (p.actual_result) {
            actualBS = p.actual_result.toLowerCase().includes('ball') ? 'Ball' : 'Strike';
        }
        const bsMatch = actualBS ? p.ball_strike_detected === actualBS : null;

        row.getCell(1).value = idx + 1;
        row.getCell(2).value = p.video;
        row.getCell(3).value = actualType || '\u2014';
        row.getCell(4).value = detectedType;
        row.getCell(5).value = typeMatch === true ? '\u2713' : typeMatch === false ? '\u2717' : '\u2014';
        row.getCell(6).value = p.velocity;
        row.getCell(7).value = `${p.vel_low} - ${p.vel_high}`;
        row.getCell(8).value = p.ball_strike_detected ?? '';
        row.getCell(9).value = p.actual_result || '\u2014';
        row.getCell(10).value = bsMatch === true ? '\u2713' : bsMatch === false ? '\u2717' : '\u2014';
        row.getCell(11).value = p.glove_pop_amplitude ?? 0;
        row.getCell(12).value = p.glove_pop_time_s?.toFixed(3) ?? '';
        row.getCell(13).value = p.decay_ratio?.toFixed(3) ?? '';
        row.getCell(14).value = p.fb_score?.toFixed(3) ?? '';

        if (actualType && TYPE_COLORS[actualType]) {
            row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_COLORS[actualType] } };
            row.getCell(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
        if (detectedType && TYPE_COLORS[detectedType]) {
            row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_COLORS[detectedType] } };
            row.getCell(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
        if (typeMatch !== null && typeMatch !== undefined) {
            row.getCell(5).font = { color: { argb: typeMatch ? 'FF27AE60' : 'FFE74C3C' }, bold: true };
        }
        if (bsMatch !== null) {
            row.getCell(10).font = { color: { argb: bsMatch ? 'FF27AE60' : 'FFE74C3C' }, bold: true };
        }
        if (p.ball_strike_detected === 'Strike') {
            row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } };
        } else if (p.ball_strike_detected === 'Ball') {
            row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
        }

        const velColor = p.pitch_type === 'Fastball' ? 'FFFDEBD0' : p.pitch_type === 'Curveball' ? 'FFD6EAF8' : 'FFD5F5E3';
        row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: velColor } };

        if (idx % 2 === 1) {
            for (let c = 1; c <= 14; c++) {
                const cell = row.getCell(c);
                if (!cell.fill || !cell.fill.fgColor) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
                }
            }
        }
        row.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // ── Sheet 2: Analysis Summary ─────────────────────────────────────────────
    const ws2 = wb.addWorksheet('Analysis Summary');
    ws2.mergeCells('A1:E1');
    ws2.getCell('A1').value = 'KHS Session \u2014 Detection Analysis';
    ws2.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    ws2.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
    ws2.getCell('A1').alignment = { horizontal: 'center' };

    const labeledCorrect = labeled.filter((r) => r.pitch_type_correct).length;
    const bsCorrect = labeled.filter((r) => {
        if (!r.actual_result) return false;
        const bs = r.actual_result.toLowerCase().includes('ball') ? 'Ball' : 'Strike';
        return r.ball_strike_detected === bs;
    }).length;

    const summaryData: [string, string][] = [
        ['', ''],
        ['Detection Accuracy', ''],
        [
            'Pitch Type',
            `${labeledCorrect}/${labeled.length} (${labeled.length ? Math.round((labeledCorrect / labeled.length) * 100) : 0}%)`,
        ],
        ['Ball/Strike', `${bsCorrect}/${labeled.length} (${labeled.length ? Math.round((bsCorrect / labeled.length) * 100) : 0}%)`],
    ];

    summaryData.forEach((rowData, i) => {
        const r = ws2.getRow(i + 3);
        r.getCell(1).value = rowData[0];
        r.getCell(2).value = rowData[1];
        if (rowData[0].includes('Accuracy')) {
            r.getCell(1).font = { bold: true, size: 12 };
        } else if (['Pitch Type', 'Ball/Strike'].includes(rowData[0])) {
            r.getCell(1).font = { bold: true };
        }
    });

    ws2.getColumn(1).width = 25;
    ws2.getColumn(2).width = 65;

    await wb.xlsx.writeFile(outPath);
}
