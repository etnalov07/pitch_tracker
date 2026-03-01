export function kMeans3(values: number[], maxIter = 50): { assignments: number[]; centroids: number[] } {
    const s = [...values].sort((a, b) => a - b);
    let c = [s[Math.floor(s.length * 0.2)], s[Math.floor(s.length * 0.5)], s[Math.floor(s.length * 0.8)]];

    const assignments = new Array<number>(values.length);
    for (let iter = 0; iter < maxIter; iter++) {
        for (let i = 0; i < values.length; i++) {
            let best = 0,
                bestDist = Infinity;
            for (let k = 0; k < 3; k++) {
                const d = Math.abs(values[i] - c[k]);
                if (d < bestDist) {
                    bestDist = d;
                    best = k;
                }
            }
            assignments[i] = best;
        }

        const sums = [0, 0, 0],
            counts = [0, 0, 0];
        for (let i = 0; i < values.length; i++) {
            sums[assignments[i]] += values[i];
            counts[assignments[i]]++;
        }
        const newC = c.map((_, k) => (counts[k] > 0 ? sums[k] / counts[k] : c[k]));
        if (JSON.stringify(newC) === JSON.stringify(c)) break;
        c = newC;
    }

    return { assignments, centroids: c };
}

export function normalize(arr: number[]): number[] {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const range = max - min || 1;
    return arr.map((v) => (v - min) / range);
}

export function computeFbScore(normAmp: number, normDecay: number, normZcr: number): number {
    return normAmp * 0.6 + (1 - normDecay) * 0.2 + normZcr * 0.2;
}

export function mapClustersToTypes(centroids: number[]): Record<number, string> {
    const ordered = centroids.map((c, i) => ({ cluster: i, centroid: c })).sort((a, b) => b.centroid - a.centroid);

    const mapping: Record<number, string> = {};
    mapping[ordered[0].cluster] = 'Fastball';
    mapping[ordered[1].cluster] = 'Changeup';
    mapping[ordered[2].cluster] = 'Curveball';
    return mapping;
}
