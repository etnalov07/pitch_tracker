// One-off analyzer: parse dump.sql, extract every charted pitch for a given
// game, score each one with the new zone-based command-grade rule, and print
// a per-pitch table.
//
// Usage:
//   cd packages/api
//   npx ts-node scripts/analyze-game-accuracy.ts <gameId>
//
// Reads ../src/schema/dump.sql (prod data dump) so we don't need DB access.

import * as fs from 'fs';
import * as path from 'path';
import { getNearestPitchCallZone, scoreAccuracy } from '../src/utils/zoneAccuracy';

const COL = [
    'id', 'at_bat_id', 'game_id', 'pitcher_id', 'batter_id', 'pitch_number',
    'pitch_type', 'velocity', 'location_x', 'location_y', 'zone', 'balls_before',
    'strikes_before', 'pitch_result', 'created_at', 'opponent_batter_id',
    'target_location_x', 'target_location_y', 'target_zone', 'team_side', 'prev_state',
];

const PARSE_NULL = (v: string): string | null => (v === '\\N' ? null : v);

function parseCopyBlock(dump: string, tableName: string): Record<string, string | null>[] {
    const startMarker = `COPY public.${tableName} `;
    const startIdx = dump.indexOf(startMarker);
    if (startIdx < 0) throw new Error(`COPY block not found for ${tableName}`);
    const headerEnd = dump.indexOf('FROM stdin;\n', startIdx) + 'FROM stdin;\n'.length;
    const endIdx = dump.indexOf('\n\\.\n', headerEnd);
    const body = dump.slice(headerEnd, endIdx);
    return body.split('\n').filter((l) => l.length > 0).map((line) => {
        const fields = line.split('\t');
        const row: Record<string, string | null> = {};
        COL.forEach((col, i) => {
            row[col] = PARSE_NULL(fields[i]);
        });
        return row;
    });
}

function main() {
    const gameId = process.argv[2];
    // Optional 2nd arg: 'our' (our team's pitcher — opponent_batter_id IS NOT NULL),
    // 'opp' (opposing pitcher — opponent_batter_id IS NULL), or 'all' (default).
    const sideFilter = (process.argv[3] || 'all').toLowerCase();
    // Optional 3rd arg: 'md <path>' to write a markdown report to <path>.
    const wantMd = process.argv[4] === 'md';
    const mdOutPath = wantMd ? process.argv[5] : null;
    if (!gameId || (wantMd && !mdOutPath)) {
        console.error('usage: analyze-game-accuracy <gameId> [our|opp|all] [md <outputPath>]');
        process.exit(1);
    }
    const dumpPath = path.join(__dirname, '..', 'src', 'schema', 'dump.sql');
    const dump = fs.readFileSync(dumpPath, 'utf8');
    let pitches = parseCopyBlock(dump, 'pitches').filter((p) => p.game_id === gameId);

    if (sideFilter === 'our') {
        pitches = pitches.filter((p) => p.opponent_batter_id !== null);
    } else if (sideFilter === 'opp') {
        pitches = pitches.filter((p) => p.opponent_batter_id === null);
    }

    if (pitches.length === 0) {
        console.error(`No pitches found for game ${gameId} (filter: ${sideFilter})`);
        process.exit(1);
    }
    if (!wantMd) console.log(`Filter: ${sideFilter}`);

    pitches.sort((a, b) => {
        const ax = a.created_at ?? '';
        const bx = b.created_at ?? '';
        if (ax < bx) return -1;
        if (ax > bx) return 1;
        return parseInt(a.pitch_number ?? '0') - parseInt(b.pitch_number ?? '0');
    });

    type Row = {
        n: number;
        pt: string;
        result: string;
        target: string;
        tCoord: string;
        actual: string;
        aCoord: string;
        score: number | null;
        scoreLabel: string;
    };
    const rows: Row[] = [];
    let sum = 0;
    let count = 0;
    let i = 0;
    for (const p of pitches) {
        i++;
        const tz = p.target_zone;
        const tx = p.target_location_x ? parseFloat(p.target_location_x) : null;
        const ty = p.target_location_y ? parseFloat(p.target_location_y) : null;
        const lx = p.location_x ? parseFloat(p.location_x) : null;
        const ly = p.location_y ? parseFloat(p.location_y) : null;

        let targetZone = tz;
        if (!targetZone && tx != null && ty != null) {
            targetZone = getNearestPitchCallZone(tx, ty);
        }
        const actualZone = lx != null && ly != null ? getNearestPitchCallZone(lx, ly) : null;

        let score: number | null = null;
        let scoreLabel: string;
        if (targetZone && actualZone) {
            score = scoreAccuracy(targetZone as any, actualZone);
            sum += score;
            count++;
            scoreLabel = score.toFixed(2);
        } else if (!targetZone) {
            scoreLabel = 'no target';
        } else {
            scoreLabel = 'no location';
        }

        const tCoord = tx != null && ty != null ? `${tx.toFixed(2)}, ${ty.toFixed(2)}` : '—';
        const aCoord = lx != null && ly != null ? `${lx.toFixed(2)}, ${ly.toFixed(2)}` : '—';
        rows.push({
            n: i,
            pt: p.pitch_type ?? '',
            result: p.pitch_result ?? '',
            target: targetZone ?? '—',
            tCoord,
            actual: actualZone ?? '—',
            aCoord,
            score,
            scoreLabel,
        });
    }

    if (wantMd && mdOutPath) {
        writeMarkdown(mdOutPath, gameId, sideFilter, rows, sum, count, pitches.length);
        console.log(`Wrote markdown report to ${mdOutPath}`);
    } else {
        printText(gameId, rows, sum, count, pitches.length);
    }
}

function printText(gameId: string, rows: any[], sum: number, count: number, total: number) {
    console.log(`Game ${gameId} — ${total} pitches\n`);
    console.log(
        '#'.padStart(4) +
            '  ' +
            'PT'.padEnd(4) +
            ' ' +
            'Result'.padEnd(16) +
            ' ' +
            'Target'.padEnd(11) +
            ' ' +
            'Tx,Ty'.padEnd(14) +
            ' ' +
            'Actual'.padEnd(11) +
            ' ' +
            'Lx,Ly'.padEnd(14) +
            ' ' +
            'Score'
    );
    console.log('-'.repeat(90));
    for (const r of rows) {
        console.log(
            String(r.n).padStart(4) +
                '  ' +
                r.pt.padEnd(4).slice(0, 4) +
                ' ' +
                r.result.padEnd(16).slice(0, 16) +
                ' ' +
                r.target.padEnd(11) +
                ' ' +
                r.tCoord.replace(', ', ',').padEnd(14) +
                ' ' +
                r.actual.padEnd(11) +
                ' ' +
                r.aCoord.replace(', ', ',').padEnd(14) +
                ' ' +
                r.scoreLabel
        );
    }
    console.log('-'.repeat(90));
    if (count > 0) {
        const pct = Math.round((sum / count) * 100);
        console.log(`\nSum: ${sum.toFixed(2)} / ${count} qualifying pitches → Command Grade: ${pct}%`);
        const skipped = total - count;
        if (skipped > 0) console.log(`(${skipped} pitch${skipped === 1 ? '' : 'es'} excluded: no target or no location)`);
    } else {
        console.log('\nNo qualifying pitches (none had both target and location).');
    }
}

function writeMarkdown(
    outPath: string,
    gameId: string,
    sideFilter: string,
    rows: any[],
    sum: number,
    count: number,
    total: number
) {
    const sideLabel =
        sideFilter === 'our' ? "our team's pitcher" : sideFilter === 'opp' ? 'opposing pitcher' : 'all pitchers';
    const pct = count > 0 ? Math.round((sum / count) * 100) : null;

    // Distribution
    const dist = new Map<string, number>();
    for (const r of rows) {
        if (r.score === null) continue;
        const key = r.score.toFixed(2);
        dist.set(key, (dist.get(key) ?? 0) + 1);
    }
    const distRows = Array.from(dist.entries())
        .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
        .map(([k, v]) => `| ${k} | ${v} | ${Math.round((v / count) * 100)}% |`)
        .join('\n');

    // Target distribution
    const targets = new Map<string, number>();
    for (const r of rows) {
        targets.set(r.target, (targets.get(r.target) ?? 0) + 1);
    }
    const targetRows = Array.from(targets.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `| ${k} | ${v} | ${Math.round((v / total) * 100)}% |`)
        .join('\n');

    const headerLines = [
        `# Pitch-by-pitch command grade — game ${gameId}`,
        '',
        `**Filter:** ${sideLabel}`,
        `**Total pitches:** ${total}`,
        `**Command Grade:** ${count > 0 ? `${sum.toFixed(2)} / ${count} = **${pct}%**` : 'no qualifying pitches'}`,
        '',
        '## Score distribution',
        '',
        '| Score | Count | % |',
        '| ----: | ----: | --: |',
        distRows,
        '',
        '## Target distribution',
        '',
        '| Target zone | Count | % |',
        '| ----------- | ----: | --: |',
        targetRows,
        '',
        '## Pitch by pitch',
        '',
        '| # | Pitch type | Result | Target zone | Target (x, y) | Actual zone | Actual (x, y) | Score |',
        '| -: | --- | --- | --- | --- | --- | --- | ---: |',
    ];

    const tableLines = rows.map(
        (r) =>
            `| ${r.n} | ${r.pt} | ${r.result} | ${r.target} | ${r.tCoord} | ${r.actual} | ${r.aCoord} | ${r.scoreLabel} |`
    );

    fs.writeFileSync(outPath, [...headerLines, ...tableLines, ''].join('\n'), 'utf8');
}

main();
