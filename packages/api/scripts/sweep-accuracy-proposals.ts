// One-off sweep: score every curated game under the current `scoreAccuracy`
// rule AND under each tuning proposal from the 2026-05-12 command-grade
// audit. Prints a markdown comparison table.
//
// Reads ../src/schema/dump.sql (prod data dump) — no DB access required.
//
// Usage:
//   cd packages/api
//   npx ts-node scripts/sweep-accuracy-proposals.ts > /tmp/sweep.md

import * as fs from 'fs';
import * as path from 'path';
import { getNearestPitchCallZone } from '../src/utils/zoneAccuracy';
import type { PitchCallZone } from '../src/types';

const COL = [
    'id',
    'at_bat_id',
    'game_id',
    'pitcher_id',
    'batter_id',
    'pitch_number',
    'pitch_type',
    'velocity',
    'location_x',
    'location_y',
    'zone',
    'balls_before',
    'strikes_before',
    'pitch_result',
    'created_at',
    'opponent_batter_id',
    'target_location_x',
    'target_location_y',
    'target_zone',
    'team_side',
    'prev_state',
];

const PARSE_NULL = (v: string): string | null => (v === '\\N' ? null : v);

function parseCopyBlock(dump: string, tableName: string): Record<string, string | null>[] {
    const startMarker = `COPY public.${tableName} `;
    const startIdx = dump.indexOf(startMarker);
    if (startIdx < 0) throw new Error(`COPY block not found for ${tableName}`);
    const headerEnd = dump.indexOf('FROM stdin;\n', startIdx) + 'FROM stdin;\n'.length;
    const endIdx = dump.indexOf('\n\\.\n', headerEnd);
    const body = dump.slice(headerEnd, endIdx);
    return body
        .split('\n')
        .filter((l) => l.length > 0)
        .map((line) => {
            const fields = line.split('\t');
            const row: Record<string, string | null> = {};
            COL.forEach((col, i) => {
                row[col] = PARSE_NULL(fields[i]);
            });
            return row;
        });
}

// 5x5 grid identical to zoneAccuracy.ts ZONE_GRID.
const ZONE_GRID: Record<string, { row: number; col: number }> = {
    '0-0': { row: 0, col: 0 },
    '0-1': { row: 0, col: 1 },
    '0-2': { row: 0, col: 2 },
    '1-0': { row: 1, col: 0 },
    '1-1': { row: 1, col: 1 },
    '1-2': { row: 1, col: 2 },
    '2-0': { row: 2, col: 0 },
    '2-1': { row: 2, col: 1 },
    '2-2': { row: 2, col: 2 },
    'W-high': { row: -1, col: 1 },
    'W-low': { row: 3, col: 1 },
    'W-in': { row: 1, col: -1 },
    'W-out': { row: 1, col: 3 },
    'W-high-in': { row: -1, col: -1 },
    'W-high-out': { row: -1, col: 3 },
    'W-low-in': { row: 3, col: -1 },
    'W-low-out': { row: 3, col: 3 },
};

const isInZone = (c: { row: number; col: number }) => c.row >= 0 && c.row <= 2 && c.col >= 0 && c.col <= 2;
const projectToInZone = (c: { row: number; col: number }) => ({
    row: Math.max(0, Math.min(2, c.row)),
    col: Math.max(0, Math.min(2, c.col)),
});

type Scorer = (target: PitchCallZone, actual: PitchCallZone) => number;

// Baseline = current shipped algorithm (post 2026-05-12 softening).
const baseline: Scorer = (target, actual) => {
    const targetRaw = ZONE_GRID[target];
    const t = isInZone(targetRaw) ? targetRaw : projectToInZone(targetRaw);
    const a = ZONE_GRID[actual];
    if (t.col === 0 || t.col === 2) {
        const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
        if (isInZone(a)) {
            const colDiff = Math.abs(t.col - a.col);
            if (colDiff === 0) return 1;
            if (colDiff === 1) return 0.25;
            if (a.row === t.row) return 0.25;
            return 0;
        }
        const matchingWasteCol = t.col === 0 ? -1 : 3;
        if (a.col === matchingWasteCol) return 1;
        if (a.row === matchingWasteRow) return 0.25;
        return 0;
    }
    if (isInZone(a)) {
        const rowDiff = Math.abs(t.row - a.row);
        const colDiff = Math.abs(1 - a.col);
        if (rowDiff === 0) {
            if (colDiff === 0) return 1;
            return 0.75;
        }
        if (rowDiff === 1) return 0.25;
        return 0;
    }
    const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
    return a.row === matchingWasteRow ? 0.75 : 0;
};

// Proposal A1: col-anchored, adjacent col + row match -> 0.5 (was 0.25).
const proposalA1: Scorer = (target, actual) => {
    const targetRaw = ZONE_GRID[target];
    const t = isInZone(targetRaw) ? targetRaw : projectToInZone(targetRaw);
    const a = ZONE_GRID[actual];
    if (t.col === 0 || t.col === 2) {
        const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
        if (isInZone(a)) {
            const colDiff = Math.abs(t.col - a.col);
            if (colDiff === 0) return 1;
            if (colDiff === 1) return a.row === t.row ? 0.5 : 0.25;
            if (a.row === t.row) return 0.25;
            return 0;
        }
        const matchingWasteCol = t.col === 0 ? -1 : 3;
        if (a.col === matchingWasteCol) return 1;
        if (a.row === matchingWasteRow) return 0.25;
        return 0;
    }
    // mid-col unchanged
    if (isInZone(a)) {
        const rowDiff = Math.abs(t.row - a.row);
        const colDiff = Math.abs(1 - a.col);
        if (rowDiff === 0) {
            if (colDiff === 0) return 1;
            return 0.75;
        }
        if (rowDiff === 1) return 0.25;
        return 0;
    }
    const mwr = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
    return a.row === mwr ? 0.75 : 0;
};

// Proposal C1: mid-col, row-match across columns — penalize 2-col-off.
const proposalC1: Scorer = (target, actual) => {
    const targetRaw = ZONE_GRID[target];
    const t = isInZone(targetRaw) ? targetRaw : projectToInZone(targetRaw);
    const a = ZONE_GRID[actual];
    if (t.col === 0 || t.col === 2) {
        // col-anchored unchanged
        const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
        if (isInZone(a)) {
            const colDiff = Math.abs(t.col - a.col);
            if (colDiff === 0) return 1;
            if (colDiff === 1) return 0.25;
            if (a.row === t.row) return 0.25;
            return 0;
        }
        const matchingWasteCol = t.col === 0 ? -1 : 3;
        if (a.col === matchingWasteCol) return 1;
        if (a.row === matchingWasteRow) return 0.25;
        return 0;
    }
    if (isInZone(a)) {
        const rowDiff = Math.abs(t.row - a.row);
        const colDiff = Math.abs(1 - a.col);
        if (rowDiff === 0) {
            if (colDiff === 0) return 1;
            if (colDiff === 1) return 0.75;
            return 0.5; // 2 cols off but row matches
        }
        if (rowDiff === 1) return 0.25;
        return 0;
    }
    const mwr = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
    return a.row === mwr ? 0.75 : 0;
};

// Proposal D1: mid-col, 1 row off + same col -> 0.5 (was 0.25).
const proposalD1: Scorer = (target, actual) => {
    const targetRaw = ZONE_GRID[target];
    const t = isInZone(targetRaw) ? targetRaw : projectToInZone(targetRaw);
    const a = ZONE_GRID[actual];
    if (t.col === 0 || t.col === 2) {
        // col-anchored unchanged
        const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
        if (isInZone(a)) {
            const colDiff = Math.abs(t.col - a.col);
            if (colDiff === 0) return 1;
            if (colDiff === 1) return 0.25;
            if (a.row === t.row) return 0.25;
            return 0;
        }
        const matchingWasteCol = t.col === 0 ? -1 : 3;
        if (a.col === matchingWasteCol) return 1;
        if (a.row === matchingWasteRow) return 0.25;
        return 0;
    }
    if (isInZone(a)) {
        const rowDiff = Math.abs(t.row - a.row);
        const colDiff = Math.abs(1 - a.col);
        if (rowDiff === 0) {
            if (colDiff === 0) return 1;
            return 0.75;
        }
        if (rowDiff === 1) return colDiff === 0 ? 0.5 : 0.25;
        return 0;
    }
    const mwr = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
    return a.row === mwr ? 0.75 : 0;
};

// Combined: A1 + C1 + D1 stacked.
const combined: Scorer = (target, actual) => {
    const targetRaw = ZONE_GRID[target];
    const t = isInZone(targetRaw) ? targetRaw : projectToInZone(targetRaw);
    const a = ZONE_GRID[actual];
    if (t.col === 0 || t.col === 2) {
        const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
        if (isInZone(a)) {
            const colDiff = Math.abs(t.col - a.col);
            if (colDiff === 0) return 1;
            if (colDiff === 1) return a.row === t.row ? 0.5 : 0.25; // A1
            if (a.row === t.row) return 0.25;
            return 0;
        }
        const matchingWasteCol = t.col === 0 ? -1 : 3;
        if (a.col === matchingWasteCol) return 1;
        if (a.row === matchingWasteRow) return 0.25;
        return 0;
    }
    if (isInZone(a)) {
        const rowDiff = Math.abs(t.row - a.row);
        const colDiff = Math.abs(1 - a.col);
        if (rowDiff === 0) {
            if (colDiff === 0) return 1;
            if (colDiff === 1) return 0.75; // C1
            return 0.5; // C1: 2 cols off but row matches
        }
        if (rowDiff === 1) return colDiff === 0 ? 0.5 : 0.25; // D1
        return 0;
    }
    const mwr = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
    return a.row === mwr ? 0.75 : 0;
};

const PROPOSALS: { name: string; scorer: Scorer }[] = [
    { name: 'Baseline', scorer: baseline },
    { name: 'A1', scorer: proposalA1 },
    { name: 'C1', scorer: proposalC1 },
    { name: 'D1', scorer: proposalD1 },
    { name: 'A1+C1+D1', scorer: combined },
];

const CURATED_GAMES = [
    'c646824a-e9b6-4560-81fa-e6e2ba526a91',
    '9bd6d5e9-a9d4-4c62-8db5-4f1c79d31f88',
    'b3224c08-d134-4e2b-a4aa-c95f45495df0',
    'e2b3d7d4-76f2-4881-9fd7-9eba2de5b4aa',
    'b78db9ff-fc4e-4f2b-9d94-a8de11bba84c',
    '7937c2ca-f234-41de-b723-c616911bb04d',
];

interface ScoredPitch {
    targetZone: string;
    actualZone: string;
    scores: Map<string, number>;
}

function scorePitches(pitches: Record<string, string | null>[]): {
    results: Map<string, number>;
    counts: number;
    distributions: Map<string, Map<number, number>>;
    scored: ScoredPitch[];
} {
    let count = 0;
    const sums = new Map<string, number>();
    const dist = new Map<string, Map<number, number>>();
    const scored: ScoredPitch[] = [];
    for (const p of PROPOSALS) {
        sums.set(p.name, 0);
        dist.set(p.name, new Map());
    }
    for (const p of pitches) {
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
        if (!targetZone || !actualZone) continue;
        count++;
        const pitchScores = new Map<string, number>();
        for (const proposal of PROPOSALS) {
            const s = proposal.scorer(targetZone as any, actualZone);
            sums.set(proposal.name, (sums.get(proposal.name) ?? 0) + s);
            const d = dist.get(proposal.name)!;
            d.set(s, (d.get(s) ?? 0) + 1);
            pitchScores.set(proposal.name, s);
        }
        scored.push({ targetZone, actualZone, scores: pitchScores });
    }
    return { results: sums, counts: count, distributions: dist, scored };
}

function main() {
    const dumpPath = path.join(__dirname, '..', 'src', 'schema', 'dump.sql');
    const dump = fs.readFileSync(dumpPath, 'utf8');
    const allPitches = parseCopyBlock(dump, 'pitches');

    const lines: string[] = [];
    lines.push('# Command-grade tuning sweep — 2026-05-12');
    lines.push('');
    lines.push(`Six curated games, "our pitcher" only (opponent_batter_id NOT NULL).`);
    lines.push('');
    lines.push('## Per-game Command Grade by proposal');
    lines.push('');
    lines.push('| Game | Pitches | Baseline | A1 | C1 | D1 | A1+C1+D1 |');
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');

    const totals = new Map<string, { sum: number; count: number }>();
    for (const p of PROPOSALS) totals.set(p.name, { sum: 0, count: 0 });

    const gameDetails: { gameId: string; scored: ScoredPitch[] }[] = [];

    for (const gameId of CURATED_GAMES) {
        const pitches = allPitches.filter((p) => p.game_id === gameId && p.opponent_batter_id !== null);
        if (pitches.length === 0) {
            lines.push(`| ${gameId.slice(0, 8)} | (no "our" pitches) | – | – | – | – | – |`);
            continue;
        }
        const { results, counts, scored } = scorePitches(pitches);
        gameDetails.push({ gameId, scored });
        const cells: string[] = [];
        cells.push(gameId.slice(0, 8));
        cells.push(String(counts));
        for (const p of PROPOSALS) {
            const sum = results.get(p.name) ?? 0;
            const pct = counts > 0 ? Math.round((sum / counts) * 100) : 0;
            cells.push(`${pct}%`);
            const t = totals.get(p.name)!;
            t.sum += sum;
            t.count += counts;
        }
        lines.push(`| ${cells.join(' | ')} |`);
    }
    // Aggregate
    const aggCells: string[] = ['**Total**', String(totals.get('Baseline')!.count)];
    for (const p of PROPOSALS) {
        const t = totals.get(p.name)!;
        aggCells.push(`**${Math.round((t.sum / t.count) * 100)}%**`);
    }
    lines.push(`| ${aggCells.join(' | ')} |`);

    lines.push('');
    lines.push('## Score-bucket distribution across all curated games');
    lines.push('');
    lines.push('| Bucket | Baseline | A1 | C1 | D1 | A1+C1+D1 |');
    lines.push('| ---: | ---: | ---: | ---: | ---: | ---: |');
    const buckets = [1, 0.75, 0.5, 0.25, 0];
    // Re-scan all curated pitches.
    const allCuratedPitches = allPitches.filter((p) => CURATED_GAMES.includes(p.game_id ?? '') && p.opponent_batter_id !== null);
    const { distributions, counts: totalCount } = scorePitches(allCuratedPitches);
    for (const b of buckets) {
        const row: string[] = [b.toFixed(2)];
        for (const p of PROPOSALS) {
            const d = distributions.get(p.name)!;
            const n = d.get(b) ?? 0;
            row.push(`${n} (${Math.round((n / totalCount) * 100)}%)`);
        }
        lines.push(`| ${row.join(' | ')} |`);
    }
    lines.push(`| **Total qualifying pitches** | ${totalCount} | | | | |`);
    lines.push('');

    // Bucket-change accounting: how many pitches changed score under each proposal vs baseline?
    lines.push('## Pitches that move bucket vs baseline (curated set)');
    lines.push('');
    lines.push('| Proposal | Moved up | Moved down | Net pitches changed |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const p of PROPOSALS) {
        if (p.name === 'Baseline') continue;
        let up = 0;
        let down = 0;
        for (const sp of gameDetails.flatMap((g) => g.scored)) {
            const base = sp.scores.get('Baseline')!;
            const prop = sp.scores.get(p.name)!;
            if (prop > base) up++;
            else if (prop < base) down++;
        }
        lines.push(`| ${p.name} | ${up} | ${down} | ${up + down} |`);
    }

    process.stdout.write(lines.join('\n') + '\n');
}

main();
