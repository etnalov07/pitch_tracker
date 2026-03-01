import { execFileSync } from 'child_process';
import type { VideoFeatures, VideoPitchResult } from './types';

const ffmpegPath: string = require('ffmpeg-static');

const W = 640,
    H = 360,
    BPP = 3,
    FRAME_SIZE = W * H * BPP;

function extractFrameRange(videoPath: string, startTime: number, duration: number): Buffer[] {
    try {
        const result = execFileSync(
            ffmpegPath,
            [
                '-ss',
                String(startTime),
                '-t',
                String(duration),
                '-i',
                videoPath,
                '-vf',
                `scale=${W}:${H}`,
                '-f',
                'rawvideo',
                '-pix_fmt',
                'rgb24',
                '-v',
                'error',
                'pipe:1',
            ],
            { maxBuffer: 50 * 1024 * 1024 }
        );
        const frames: Buffer[] = [];
        for (let off = 0; off + FRAME_SIZE <= result.length; off += FRAME_SIZE) frames.push(result.subarray(off, off + FRAME_SIZE));
        return frames;
    } catch {
        return [];
    }
}

function toGray(frame: Buffer): Float32Array {
    const g = new Float32Array(W * H);
    for (let i = 0; i < g.length; i++) {
        const j = i * 3;
        g[i] = frame[j] * 0.299 + frame[j + 1] * 0.587 + frame[j + 2] * 0.114;
    }
    return g;
}

function avg(a: number[]): number {
    return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}
function stdev(a: number[]): number {
    const m = avg(a);
    return a.length ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) : 0;
}

export function extractVideoFeatures(videoPath: string, popTime: number): VideoFeatures {
    const start = Math.max(0, popTime - 1.0);
    const dur = popTime + 0.15 - start;
    const frames = extractFrameRange(videoPath, start, dur);
    if (frames.length < 10) return {};

    const grays = frames.map(toGray);
    const n = grays.length - 1;
    const popIdx = Math.round((popTime - start) * 30);
    const flightStart = Math.max(0, popIdx - 16);
    const flightEnd = Math.min(n, popIdx - 1);

    const zones: Record<string, { x1: number; x2: number; y1: number; y2: number }> = {
        center: { x1: Math.round(W * 0.3), x2: Math.round(W * 0.7), y1: Math.round(H * 0.2), y2: Math.round(H * 0.7) },
        pitchLane: { x1: Math.round(W * 0.35), x2: Math.round(W * 0.65), y1: Math.round(H * 0.1), y2: Math.round(H * 0.6) },
        catchZone: { x1: Math.round(W * 0.25), x2: Math.round(W * 0.75), y1: Math.round(H * 0.4), y2: Math.round(H * 0.85) },
    };

    function zoneMotion(g1: Float32Array, g2: Float32Array, z: { x1: number; x2: number; y1: number; y2: number }) {
        let total = 0;
        for (let y = z.y1; y < z.y2; y++)
            for (let x = z.x1; x < z.x2; x++) {
                const d = Math.abs(g2[y * W + x] - g1[y * W + x]);
                if (d > 12) total += d;
            }
        return total;
    }

    const features: VideoFeatures = {};
    for (const [name, zone] of Object.entries(zones)) {
        const timeline: number[] = [];
        for (let i = 1; i < grays.length; i++) timeline.push(zoneMotion(grays[i - 1], grays[i], zone));

        const peak = Math.max(...timeline);
        features[`${name}_peakPos`] = timeline.indexOf(peak) / n;

        if (flightEnd > flightStart) {
            const flight = timeline.slice(flightStart, flightEnd + 1);
            const mid = Math.floor(flight.length / 2);
            const early = flight.slice(0, mid);
            const late = flight.slice(-mid);
            if (early.length && late.length) {
                features[`${name}_lateFlight`] = avg(early) > 0 ? avg(late) / avg(early) : 1;
            }
            features[`${name}_flightAvg`] = avg(flight);
            features[`${name}_flightCV`] = avg(flight) > 0 ? stdev(flight) / avg(flight) : 0;
        }
    }

    function edgeDens(gray: Float32Array, z: { x1: number; x2: number; y1: number; y2: number }) {
        let sum = 0,
            cnt = 0;
        for (let y = z.y1 + 1; y < z.y2 - 1; y++)
            for (let x = z.x1 + 1; x < z.x2 - 1; x++) {
                const i = y * W + x;
                const gx = gray[i + 1] - gray[i - 1],
                    gy = gray[i + W] - gray[i - W];
                sum += Math.sqrt(gx * gx + gy * gy);
                cnt++;
            }
        return cnt > 0 ? sum / cnt : 0;
    }

    if (popIdx > 0 && popIdx < grays.length) {
        features.edgeDensityPrePop = edgeDens(grays[Math.max(0, popIdx - 5)], zones.center);
        features.edgeDensityAtPop = edgeDens(grays[Math.min(popIdx, grays.length - 1)], zones.center);
    }

    return features;
}

export interface ClassifyResult {
    predicted: string;
    votes: Record<string, number>;
}

export function classifyKNN(
    testFeatures: VideoFeatures,
    trainingData: VideoPitchResult[],
    featureNames: string[],
    k: number
): ClassifyResult {
    const trainFeats = trainingData.map((d) => d.video_features);

    const means: Record<string, number> = {};
    const stds: Record<string, number> = {};
    for (const name of featureNames) {
        const vals = trainFeats.map((f) => f[name]).filter((v) => v !== undefined && isFinite(v));
        means[name] = avg(vals);
        stds[name] = stdev(vals) || 1;
    }

    function normalize(features: VideoFeatures): number[] {
        return featureNames.map((n) => {
            const v = features[n];
            return v !== undefined && isFinite(v) ? (v - means[n]) / stds[n] : 0;
        });
    }

    const testNorm = normalize(testFeatures);
    const distances = trainingData.map((d) => {
        const trainNorm = normalize(d.video_features);
        let dist = 0;
        for (let i = 0; i < testNorm.length; i++) {
            dist += (testNorm[i] - trainNorm[i]) ** 2;
        }
        return { type: d.actual_pitch_type, dist };
    });

    distances.sort((a, b) => a.dist - b.dist);
    const neighbors = distances.slice(0, k);

    const votes: Record<string, number> = {};
    for (const n of neighbors) votes[n.type] = (votes[n.type] || 0) + 1;
    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);

    return { predicted: sorted[0][0], votes: Object.fromEntries(sorted) };
}
