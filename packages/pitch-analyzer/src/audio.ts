import { execFileSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import type { GlovePop, UmpireCall, AudioFeatures } from './types';

const ffmpegPath: string = require('ffmpeg-static');
const SAMPLE_RATE = 44100;

export function extractAudioToFile(videoPath: string, tempDir: string): string {
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
    const outPath = join(tempDir, basename(videoPath, '.MOV') + '.raw');
    if (existsSync(outPath)) return outPath;
    execFileSync(
        ffmpegPath,
        ['-y', '-i', videoPath, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 's16le', '-acodec', 'pcm_s16le', outPath],
        { stdio: 'pipe' }
    );
    return outPath;
}

export function extractAudioToBuffer(videoPath: string): Int16Array {
    const result = execFileSync(
        ffmpegPath,
        [
            '-i',
            videoPath,
            '-vn',
            '-acodec',
            'pcm_s16le',
            '-ar',
            String(SAMPLE_RATE),
            '-ac',
            '1',
            '-f',
            's16le',
            '-v',
            'error',
            'pipe:1',
        ],
        { maxBuffer: 100 * 1024 * 1024 }
    );
    return new Int16Array(result.buffer, result.byteOffset, result.byteLength / 2);
}

export function readPCM(rawPath: string): Int16Array {
    const buf = readFileSync(rawPath);
    return new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
}

export function computeEnvelope(samples: Int16Array, windowMs = 2): Float64Array {
    const windowSize = Math.floor((SAMPLE_RATE * windowMs) / 1000);
    const envelope = new Float64Array(samples.length);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        sum += Math.abs(samples[i]);
        if (i >= windowSize) sum -= Math.abs(samples[i - windowSize]);
        envelope[i] = sum / Math.min(i + 1, windowSize);
    }
    return envelope;
}

export function detectGlovePop(samples: Int16Array): GlovePop | null {
    const envelope = computeEnvelope(samples, 2);
    const start = Math.floor(samples.length * 0.1);
    const end = Math.floor(samples.length * 0.9);
    const sorted = Array.from(envelope.slice(start, end)).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const threshold = median * 4.0;
    const isoSamples = Math.floor((SAMPLE_RATE * 50) / 1000);

    const candidates: GlovePop[] = [];
    for (let i = isoSamples; i < envelope.length - isoSamples; i++) {
        if (envelope[i] >= threshold) {
            let isMax = true;
            for (let j = i - isoSamples; j <= i + isoSamples; j++) {
                if (j !== i && envelope[j] > envelope[i]) {
                    isMax = false;
                    break;
                }
            }
            if (isMax) {
                const riseSamples = Math.floor((SAMPLE_RATE * 5) / 1000);
                const prior = envelope[Math.max(0, i - riseSamples)];
                candidates.push({
                    sampleIndex: i,
                    timeS: i / SAMPLE_RATE,
                    amplitude: envelope[i],
                    riseRatio: envelope[i] / (prior + 1),
                });
            }
        }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.amplitude * b.riseRatio - a.amplitude * a.riseRatio);
    return candidates[0];
}

export function detectUmpireCall(samples: Int16Array, glovePopIdx: number): UmpireCall {
    const popTimeS = glovePopIdx / SAMPLE_RATE;
    const totalDurationS = samples.length / SAMPLE_RATE;
    const availableS = totalDurationS - popTimeS;

    const frameSize = Math.floor(SAMPLE_RATE * 0.02);
    const hopSize = Math.floor(frameSize / 2);

    const preStart = Math.max(0, glovePopIdx - Math.floor(SAMPLE_RATE * 1.0));
    const preEnd = Math.max(0, glovePopIdx - Math.floor(SAMPLE_RATE * 0.3));
    const preRms: number[] = [];
    for (let s = preStart; s + frameSize <= preEnd; s += hopSize) {
        let e = 0;
        for (let i = s; i < s + frameSize; i++) e += samples[i] * samples[i];
        preRms.push(Math.sqrt(e / frameSize));
    }
    preRms.sort((a, b) => a - b);
    const baseline = preRms.length > 0 ? preRms[Math.floor(preRms.length * 0.5)] : 200;

    const postStart = glovePopIdx + Math.floor(SAMPLE_RATE * 0.15);
    const postEnd = Math.min(samples.length - frameSize, glovePopIdx + Math.floor(SAMPLE_RATE * 3.0));

    if (postStart >= postEnd) {
        return {
            call: 'Ball',
            confidence: 'none',
            score: 0,
            peakRatio: 0,
            p75Ratio: 0,
            meanRatio: 0,
            sustainedMs: 0,
            availableS: Math.round(availableS * 100) / 100,
            baseline: Math.round(baseline),
            postMax: 0,
        };
    }

    const postRms: number[] = [];
    for (let s = postStart; s + frameSize <= postEnd; s += hopSize) {
        let e = 0;
        for (let i = s; i < s + frameSize; i++) e += samples[i] * samples[i];
        postRms.push(Math.sqrt(e / frameSize));
    }

    const postMax = Math.max(...postRms);
    const postSorted = [...postRms].sort((a, b) => a - b);
    const postP75 = postSorted[Math.floor(postSorted.length * 0.75)];
    const postMean = postRms.reduce((s, v) => s + v, 0) / postRms.length;

    const peakRatio = postMax / (baseline + 1);
    const p75Ratio = postP75 / (baseline + 1);
    const meanRatio = postMean / (baseline + 1);

    let maxRun = 0,
        run = 0;
    for (const r of postRms) {
        if (r > baseline * 1.3) {
            run++;
            if (run > maxRun) maxRun = run;
        } else run = 0;
    }
    const sustainedMs = Math.round(maxRun * ((hopSize / SAMPLE_RATE) * 1000));

    let score = 0;
    if (peakRatio > 8) score += 3;
    else if (peakRatio > 4) score += 2;
    else if (peakRatio > 2.5) score += 1;
    if (p75Ratio > 2.5) score += 2;
    else if (p75Ratio > 1.8) score += 1;
    if (meanRatio > 2.0) score += 2;
    else if (meanRatio > 1.4) score += 1;
    if (sustainedMs > 150) score += 2;
    else if (sustainedMs > 80) score += 1;

    let call: 'Strike' | 'Ball', confidence: 'high' | 'medium' | 'low' | 'none';
    if (score >= 4) {
        call = 'Strike';
        confidence = 'high';
    } else if (score >= 2) {
        call = 'Strike';
        confidence = 'medium';
    } else if (availableS < 0.5) {
        if (peakRatio > 1.8 || sustainedMs > 40) {
            call = 'Strike';
            confidence = 'low';
        } else {
            call = 'Ball';
            confidence = 'low';
        }
    } else {
        call = 'Ball';
        confidence = availableS >= 0.8 ? 'high' : 'medium';
    }

    return {
        call,
        confidence,
        score,
        peakRatio: Math.round(peakRatio * 10) / 10,
        p75Ratio: Math.round(p75Ratio * 10) / 10,
        meanRatio: Math.round(meanRatio * 10) / 10,
        sustainedMs,
        availableS: Math.round(availableS * 100) / 100,
        baseline: Math.round(baseline),
        postMax: Math.round(postMax),
    };
}

export function extractAudioFeatures(samples: Int16Array, popIndex: number): AudioFeatures {
    const windowSize = Math.round(SAMPLE_RATE * 0.005);

    let peakAmp = 0;
    for (let i = Math.max(0, popIndex - windowSize); i < Math.min(samples.length, popIndex + windowSize); i++) {
        peakAmp = Math.max(peakAmp, Math.abs(samples[i]));
    }

    let popEnergy = 0;
    for (let i = Math.max(0, popIndex - windowSize); i < Math.min(samples.length, popIndex + windowSize); i++) {
        popEnergy += samples[i] * samples[i];
    }

    const decayEnd = Math.min(samples.length, popIndex + Math.round(SAMPLE_RATE * 0.01));
    let decayEnergy = 0;
    for (let i = decayEnd; i < Math.min(samples.length, decayEnd + windowSize * 2); i++) {
        decayEnergy += samples[i] * samples[i];
    }
    const decayRatio = popEnergy > 0 ? decayEnergy / popEnergy : 0;

    const zcrWindow = Math.round(SAMPLE_RATE * 0.01);
    let zcr = 0;
    for (let i = Math.max(1, popIndex - zcrWindow); i < Math.min(samples.length, popIndex + zcrWindow); i++) {
        if (samples[i] >= 0 !== samples[i - 1] >= 0) zcr++;
    }

    return { peakAmp, decayRatio, zcr };
}

export function analyzePopSignature(samples: Int16Array, popSampleIdx: number) {
    const halfWin = Math.floor(SAMPLE_RATE * 0.005);
    const popStart = Math.max(0, popSampleIdx - halfWin);
    const popEnd = Math.min(samples.length, popSampleIdx + halfWin);

    let peakAbs = 0;
    let totalEnergy = 0;
    for (let i = popStart; i < popEnd; i++) {
        peakAbs = Math.max(peakAbs, Math.abs(samples[i]));
        totalEnergy += samples[i] * samples[i];
    }
    const rms = Math.sqrt(totalEnergy / (popEnd - popStart));

    const decayStart = popSampleIdx + halfWin;
    const decayEnd = Math.min(samples.length, popSampleIdx + Math.floor(SAMPLE_RATE * 0.05));
    let decayEnergy = 0;
    for (let i = decayStart; i < decayEnd; i++) {
        decayEnergy += samples[i] * samples[i];
    }
    const decayRms = decayEnd > decayStart ? Math.sqrt(decayEnergy / (decayEnd - decayStart)) : 0;
    const decayRatio = rms > 0 ? decayRms / rms : 0;

    let zc = 0;
    for (let i = popStart + 1; i < popEnd; i++) {
        if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) zc++;
    }
    const zcRate = zc / ((popEnd - popStart) / SAMPLE_RATE);

    return { peakAbs, rms, decayRatio, zcRate };
}
