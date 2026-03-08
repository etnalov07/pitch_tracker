#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, basename, resolve } from 'path';
import {
    extractAudioToBuffer,
    extractAudioToFile,
    readPCM,
    detectGlovePop,
    detectUmpireCall,
    extractAudioFeatures,
    analyzePopSignature,
} from './audio';
import { extractVideoFeatures, classifyKNN } from './video';
import { kMeans3, normalize, computeFbScore, mapClustersToTypes } from './classifier';
import { generateSessionExcel, generateKhsExcel } from './excel';
import { loadCalibration, saveCalibration, addEntries, computeVelocity, getCalibrationSummary } from './calibration';
import type {
    PitchAnalysis,
    EnrichedPitch,
    GroundTruthPitch,
    VideoPitchResult,
    KhsResult,
    GroundTruthEntry,
    VideoFeatures,
    CalibrationDatabase,
} from './types';

const SAMPLE_RATE = 44100;
const VIDEO_EXTENSIONS = ['.MOV', '.mov', '.MP4', '.mp4'];
const isVideoFile = (f: string) => VIDEO_EXTENSIONS.some((ext) => f.endsWith(ext));
const stripVideoExt = (f: string) => {
    for (const ext of VIDEO_EXTENSIONS) {
        if (f.endsWith(ext)) return f.slice(0, -ext.length);
    }
    return f;
};

const program = new Command();

program.name('pitch-analyzer').description('Audio and video analysis for baseball pitch detection').version('1.0.0');

// ── analyze: Full audio analysis pipeline ───────────────────────────────────
program
    .command('analyze')
    .description('Run audio analysis on pitch videos (glove pop, velocity, ball/strike)')
    .requiredOption('--video-dir <path>', 'Directory containing .MOV pitch videos')
    .option('--temp-dir <path>', 'Temp directory for intermediate files', './temp')
    .option('--baseline-mph <n>', 'Baseline velocity in mph', '79')
    .action(async (opts: { videoDir: string; tempDir: string; baselineMph: string }) => {
        const videoDir = resolve(opts.videoDir);
        const tempDir = resolve(opts.tempDir);
        const baselineMph = parseFloat(opts.baselineMph);

        if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
        const videoFiles = readdirSync(videoDir).filter(isVideoFile).sort();
        console.log(`Analyzing ${videoFiles.length} pitches (velocity baseline: ${baselineMph} mph)\n`);

        const pitchData: Array<{
            pitchName: string;
            ext: string;
            durationS: number;
            glovePop: { sampleIndex: number; timeS: number; amplitude: number; riseRatio: number };
            umpire: ReturnType<typeof detectUmpireCall>;
            estimatedMph?: number;
            velocityLow?: number;
            velocityHigh?: number;
        }> = [];

        for (const file of videoFiles) {
            const videoPath = join(videoDir, file);
            const pitchName = stripVideoExt(file);
            process.stdout.write(`  ${pitchName}: `);
            try {
                const rawPath = extractAudioToFile(videoPath, tempDir);
                const samples = readPCM(rawPath);
                const durationS = samples.length / SAMPLE_RATE;
                const glovePop = detectGlovePop(samples);
                if (!glovePop) {
                    console.log('NO POP');
                    continue;
                }
                const umpire = detectUmpireCall(samples, glovePop.sampleIndex);
                const callStr = `${umpire.call} (${umpire.confidence})`;
                console.log(
                    `${callStr.padEnd(18)} score=${String(umpire.score).padEnd(3)} ` +
                        `peakR=${String(umpire.peakRatio).padEnd(5)} meanR=${String(umpire.meanRatio).padEnd(5)} ` +
                        `dur=${String(umpire.sustainedMs).padEnd(4)}ms  avail=${umpire.availableS}s`
                );
                const ext = file.slice(pitchName.length);
                pitchData.push({ pitchName, ext, durationS, glovePop, umpire });
            } catch (e: any) {
                console.log(`ERROR: ${e.message}`);
            }
        }

        const amplitudes = pitchData.map((p) => p.glovePop.amplitude);
        const ampMean = amplitudes.reduce((s, a) => s + a, 0) / amplitudes.length;
        const ampStd = Math.sqrt(amplitudes.reduce((s, a) => s + (a - ampMean) ** 2, 0) / amplitudes.length);

        for (const p of pitchData) {
            const ampZ = (p.glovePop.amplitude - ampMean) / (ampStd || 1);
            const adj = Math.max(-3, Math.min(3, ampZ * 1.5));
            p.estimatedMph = Math.round((baselineMph + adj) * 10) / 10;
            p.velocityLow = Math.round((p.estimatedMph - 4) * 10) / 10;
            p.velocityHigh = Math.round((p.estimatedMph + 4) * 10) / 10;
        }

        const jsonResults: PitchAnalysis[] = pitchData.map((p, i) => ({
            pitch_number: i + 1,
            video: p.pitchName + p.ext,
            estimated_velocity_mph: p.estimatedMph!,
            velocity_low_mph: p.velocityLow!,
            velocity_high_mph: p.velocityHigh!,
            ball_strike: p.umpire.call,
            confidence: p.umpire.confidence,
            umpire_score: p.umpire.score,
            peak_ratio: p.umpire.peakRatio,
            p75_ratio: p.umpire.p75Ratio,
            mean_ratio: p.umpire.meanRatio,
            sustained_ms: p.umpire.sustainedMs,
            audio_after_pop_s: p.umpire.availableS,
            baseline_rms: p.umpire.baseline,
            post_max_rms: p.umpire.postMax,
            glove_pop_time_s: Math.round(p.glovePop.timeS * 1000) / 1000,
            glove_pop_amplitude: Math.round(p.glovePop.amplitude),
            duration_s: Math.round(p.durationS * 10) / 10,
        }));

        const jsonPath = join(tempDir, 'pitch_analysis_final.json');
        writeFileSync(jsonPath, JSON.stringify(jsonResults, null, 2));
        console.log(`\nSaved: ${jsonPath}`);
    });

// ── detect-types: Audio-only pitch type detection via k-means ───────────────
program
    .command('detect-types')
    .description('Detect pitch types using audio features and k-means clustering')
    .requiredOption('--input <path>', 'Path to pitch_analysis_final.json')
    .option('--temp-dir <path>', 'Temp directory', './temp')
    .option('--video-dir <path>', 'Video directory for audio extraction')
    .action(async (opts: { input: string; tempDir: string; videoDir?: string }) => {
        const tempDir = resolve(opts.tempDir);
        const pitches: PitchAnalysis[] = JSON.parse(readFileSync(resolve(opts.input), 'utf8'));

        if (!opts.videoDir) {
            console.error('--video-dir required for audio feature extraction');
            process.exit(1);
        }
        const videoDir = resolve(opts.videoDir);

        const audioFeats = pitches.map((p) => {
            const rawPath = join(tempDir, stripVideoExt(p.video) + '.raw');
            const samples = readPCM(rawPath);
            const popIdx = Math.round(p.glove_pop_time_s * SAMPLE_RATE);
            return analyzePopSignature(samples, popIdx);
        });

        const allAmps = audioFeats.map((f) => f.peakAbs);
        const allDecays = audioFeats.map((f) => f.decayRatio);
        const allZcrs = audioFeats.map((f) => f.zcRate);

        const normAmps = normalize(allAmps);
        const normDecays = normalize(allDecays);
        const normZcrs = normalize(allZcrs);

        const fbScores = pitches.map((_, i) => computeFbScore(normAmps[i], normDecays[i], normZcrs[i]));
        const { assignments, centroids } = kMeans3(fbScores);
        const mapping = mapClustersToTypes(centroids);

        const enriched: EnrichedPitch[] = pitches.map((p, i) => ({
            ...p,
            pitch_type: mapping[assignments[i]],
            fb_score: Math.round(fbScores[i] * 1000) / 1000,
            decay_ratio: Math.round(audioFeats[i].decayRatio * 1000) / 1000,
            pop_zcr: Math.round(audioFeats[i].zcRate),
        }));

        const outPath = join(tempDir, 'pitch_analysis_enriched.json');
        writeFileSync(outPath, JSON.stringify(enriched, null, 2));
        console.log(`Saved: ${outPath}`);
    });

// ── video-analyze: Video+audio pitch type detection via k-NN ────────────────
program
    .command('video-analyze')
    .description('Classify pitch types using video + audio features with k-NN')
    .requiredOption('--comparison <path>', 'Path to ground_truth_comparison.json')
    .requiredOption('--video-dir <path>', 'Directory containing .MOV pitch videos')
    .option('--temp-dir <path>', 'Temp directory', './temp')
    .option('-k <n>', 'k for k-NN', '7')
    .action(async (opts: { comparison: string; videoDir: string; tempDir: string; k: string }) => {
        const comparison: GroundTruthPitch[] = JSON.parse(readFileSync(resolve(opts.comparison), 'utf8'));
        const videoDir = resolve(opts.videoDir);
        const tempDir = resolve(opts.tempDir);
        const k = parseInt(opts.k, 10);

        console.log('Video+Audio Pitch Type Detection');
        console.log('================================\n');

        const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
        const stdev = (a: number[]) => {
            const m = avg(a);
            return a.length ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) : 0;
        };

        console.log('Extracting video features...');
        const allData: Array<{ pitch: GroundTruthPitch; features: VideoFeatures }> = [];
        for (const pitch of comparison) {
            process.stdout.write(`  #${pitch.pitch_number}...`);
            const vf = extractVideoFeatures(join(videoDir, pitch.video), pitch.glove_pop_time_s);
            allData.push({
                pitch,
                features: {
                    ...vf,
                    audio_amplitude: pitch.glove_pop_amplitude,
                    audio_fbScore: pitch.fb_score,
                    audio_decayRatio: pitch.decay_ratio,
                    audio_popZcr: pitch.pop_zcr,
                },
            });
            console.log(' done');
        }

        // LOO k-NN classifier
        function looClassify(data: typeof allData, featureNames: string[], kVal: number) {
            const means: Record<string, number> = {};
            const stds: Record<string, number> = {};
            for (const name of featureNames) {
                const vals = data.map((d) => d.features[name]).filter(isFinite);
                means[name] = avg(vals);
                stds[name] = stdev(vals) || 1;
            }
            function norm(features: VideoFeatures) {
                return featureNames.map((n) => (isFinite(features[n]) ? (features[n] - means[n]) / stds[n] : 0));
            }
            let correct = 0;
            const predictions: Array<{ predicted: string; actual: string }> = [];
            for (let i = 0; i < data.length; i++) {
                const testNorm = norm(data[i].features);
                const actual = data[i].pitch.actual_pitch_type;
                const neighbors = data
                    .map((d, j) =>
                        j === i
                            ? null
                            : {
                                  type: d.pitch.actual_pitch_type,
                                  d: testNorm.reduce((s, v, idx) => s + (v - norm(d.features)[idx]) ** 2, 0),
                              }
                    )
                    .filter(Boolean) as Array<{ type: string; d: number }>;
                neighbors.sort((a, b) => a.d - b.d);
                const topK = neighbors.slice(0, kVal);
                const votes: Record<string, number> = {};
                for (const n of topK) votes[n.type] = (votes[n.type] || 0) + 1;
                const predicted = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
                if (predicted === actual) correct++;
                predictions.push({ predicted, actual });
            }
            return { accuracy: correct / data.length, correct, total: data.length, predictions };
        }

        // Find best config
        const audioOnly = ['audio_amplitude', 'audio_fbScore', 'audio_decayRatio', 'audio_popZcr'];
        const videoOnly = Object.keys(allData[0].features).filter((n) => !n.startsWith('audio_'));

        const fbData = allData.filter((d) => d.pitch.actual_pitch_type === 'Fastball');
        const cbData = allData.filter((d) => d.pitch.actual_pitch_type === 'Curveball');
        const videoFeatureRanked = videoOnly
            .map((name) => {
                const fbVals = fbData.map((d) => d.features[name]).filter(isFinite);
                const cbVals = cbData.map((d) => d.features[name]).filter(isFinite);
                if (fbVals.length < 3 || cbVals.length < 3) return { name, t: 0 };
                const se = Math.sqrt(stdev(fbVals) ** 2 / fbVals.length + stdev(cbVals) ** 2 / cbVals.length);
                return { name, t: se > 0 ? Math.abs(avg(fbVals) - avg(cbVals)) / se : 0 };
            })
            .sort((a, b) => b.t - a.t);
        const topVideo = videoFeatureRanked.slice(0, 4).map((f) => f.name);

        const configs = [
            { name: 'Audio only (4 features)', features: audioOnly },
            { name: 'Audio amp + fbScore + top2 video', features: ['audio_amplitude', 'audio_fbScore', ...topVideo.slice(0, 2)] },
            { name: 'Audio + top video (8 features)', features: [...audioOnly, ...topVideo] },
        ];
        const kValues = [1, 3, 5, 7];

        let bestAcc = 0,
            bestPredictions: Array<{ predicted: string; actual: string }> = [];

        console.log('\n--- Classifier Comparison (Leave-One-Out) ---\n');
        for (const config of configs) {
            for (const kv of kValues) {
                const result = looClassify(allData, config.features, kv);
                const marker = result.accuracy > bestAcc ? ' *** BEST' : '';
                if (result.accuracy > bestAcc) {
                    bestAcc = result.accuracy;
                    bestPredictions = result.predictions;
                }
                console.log(
                    `  ${config.name.padEnd(42)} k=${kv}  ${result.correct}/${result.total} (${Math.round(result.accuracy * 100)}%)${marker}`
                );
            }
            console.log();
        }

        console.log(`\nBest accuracy: ${Math.round(bestAcc * 100)}%`);

        const results: VideoPitchResult[] = allData.map((d, i) => ({
            ...d.pitch,
            video_pitch_type: bestPredictions[i].predicted,
            video_correct: bestPredictions[i].predicted === bestPredictions[i].actual,
            video_features: d.features,
        }));

        const outPath = join(tempDir, 'video_pitch_analysis.json');
        writeFileSync(outPath, JSON.stringify(results, null, 2));
        console.log(`Saved: ${outPath}`);
    });

// ── analyze-session: Full pipeline for a new session ────────────────────────
program
    .command('analyze-session')
    .description('Run full analysis on a new session using a trained model')
    .requiredOption('--video-dir <path>', 'Directory with .MOV files')
    .requiredOption('--training-data <path>', 'Path to video_pitch_analysis.json from training session')
    .option('--ground-truth <json>', 'JSON map of "video.MOV": { "pitch_type": "...", "result": "..." }')
    .option('--temp-dir <path>', 'Temp directory', './temp')
    .action(async (opts: { videoDir: string; trainingData: string; groundTruth?: string; tempDir: string }) => {
        const videoDir = resolve(opts.videoDir);
        const tempDir = resolve(opts.tempDir);
        const trainingData: VideoPitchResult[] = JSON.parse(readFileSync(resolve(opts.trainingData), 'utf8'));
        const groundTruth: Record<string, GroundTruthEntry> = opts.groundTruth ? JSON.parse(opts.groundTruth) : {};

        if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
        const videoFiles = readdirSync(videoDir).filter(isVideoFile).sort();

        const FEATURE_NAMES = ['audio_amplitude', 'audio_fbScore', 'center_lateFlight', 'pitchLane_lateFlight'];
        const K = 7;

        // Compute training normalizations for fbScore
        const trainAmps = trainingData.map((d) => d.glove_pop_amplitude);
        const trainDecays = trainingData.map((d) => d.decay_ratio);
        const trainZcrs = trainingData.map((d) => d.pop_zcr);
        const ampMin = Math.min(...trainAmps),
            ampMax = Math.max(...trainAmps);
        const decayMin = Math.min(...trainDecays),
            decayMax = Math.max(...trainDecays);
        const zcrMin = Math.min(...trainZcrs),
            zcrMax = Math.max(...trainZcrs);

        console.log(`Analyzing ${videoFiles.length} pitches...\n`);
        const results: KhsResult[] = [];

        for (const file of videoFiles) {
            const videoPath = join(videoDir, file);
            const gt = groundTruth[file];
            console.log(`--- ${file} ${gt ? `(GT: ${gt.pitch_type}, ${gt.result})` : '(no GT)'} ---`);

            try {
                const samples = extractAudioToBuffer(videoPath);
                const durationS = samples.length / SAMPLE_RATE;
                const pop = detectGlovePop(samples);
                if (!pop) {
                    console.log('  No glove pop detected');
                    results.push({ video: file, error: 'No glove pop detected' });
                    continue;
                }

                const popIndex = pop.sampleIndex;
                const audioFeat = extractAudioFeatures(samples, popIndex);
                const umpire = detectUmpireCall(samples, popIndex);

                // Compute fbScore normalized to training data
                const normAmp = (audioFeat.peakAmp - ampMin) / (ampMax - ampMin || 1);
                const normDecay = (audioFeat.decayRatio - decayMin) / (decayMax - decayMin || 1);
                const normZcr = (audioFeat.zcr - zcrMin) / (zcrMax - zcrMin || 1);
                const fbScore =
                    0.6 * Math.max(0, Math.min(1, normAmp)) +
                    0.2 * (1 - Math.max(0, Math.min(1, normDecay))) +
                    0.2 * Math.max(0, Math.min(1, normZcr));

                const videoFeat = extractVideoFeatures(videoPath, pop.timeS);
                const combinedFeatures = {
                    ...videoFeat,
                    audio_amplitude: audioFeat.peakAmp,
                    audio_fbScore: fbScore,
                    audio_decayRatio: audioFeat.decayRatio,
                    audio_popZcr: audioFeat.zcr,
                };

                const classification = classifyKNN(combinedFeatures, trainingData, FEATURE_NAMES, K);
                console.log(
                    `  ${classification.predicted} (${JSON.stringify(classification.votes)}) | ${umpire.call} (${umpire.confidence})`
                );

                results.push({
                    video: file,
                    duration_s: durationS,
                    glove_pop_time_s: pop.timeS,
                    glove_pop_amplitude: pop.amplitude,
                    audio_amplitude: audioFeat.peakAmp,
                    decay_ratio: audioFeat.decayRatio,
                    pop_zcr: audioFeat.zcr,
                    fb_score: fbScore,
                    ball_strike_detected: umpire.call,
                    bs_confidence: umpire.confidence,
                    bs_score: umpire.score,
                    detected_pitch_type: classification.predicted,
                    classification_votes: classification.votes,
                    actual_pitch_type: gt?.pitch_type ?? null,
                    actual_result: gt?.result ?? null,
                    pitch_type_correct: gt ? classification.predicted === gt.pitch_type : null,
                    video_features: videoFeat,
                });
            } catch (e: any) {
                console.log(`  ERROR: ${e.message}`);
                results.push({ video: file, error: e.message });
            }
        }

        const outPath = join(tempDir, 'session_analysis.json');
        writeFileSync(outPath, JSON.stringify(results, null, 2));
        console.log(`\nSaved: ${outPath}`);

        const labeled = results.filter((r) => r.actual_pitch_type);
        if (labeled.length > 0) {
            const correct = labeled.filter((r) => r.pitch_type_correct).length;
            console.log(`\nPitch Type Accuracy: ${correct}/${labeled.length} (${Math.round((correct / labeled.length) * 100)}%)`);
        }
    });

// ── generate-excel: Generate Excel report ───────────────────────────────────
program
    .command('generate-excel')
    .description('Generate Excel report from analysis results')
    .requiredOption('--comparison <path>', 'Path to ground_truth_comparison.json')
    .option('--video-results <path>', 'Path to video_pitch_analysis.json')
    .option('--output <path>', 'Output Excel path', './Pitch_Analysis.xlsx')
    .option('--session-name <name>', 'Session name for the report title', 'Session')
    .action(async (opts: { comparison: string; videoResults?: string; output: string; sessionName: string }) => {
        const comparison: GroundTruthPitch[] = JSON.parse(readFileSync(resolve(opts.comparison), 'utf8'));
        let videoResults: VideoPitchResult[] | null = null;
        if (opts.videoResults) {
            try {
                videoResults = JSON.parse(readFileSync(resolve(opts.videoResults), 'utf8'));
            } catch {
                /* no video results */
            }
        }
        await generateSessionExcel(comparison, videoResults, resolve(opts.output), opts.sessionName);
        console.log(`Saved: ${opts.output}`);
    });

// ── generate-khs-excel: Generate KHS-style Excel report ────────────────────
program
    .command('generate-khs-excel')
    .description('Generate Excel report for a KHS-style session analysis')
    .requiredOption('--input <path>', 'Path to session_analysis.json or khs_analysis.json')
    .option('--output <path>', 'Output Excel path', './Session_Analysis.xlsx')
    .option('--calibration <path>', 'Path to calibration.json for stable velocity estimates')
    .action(async (opts: { input: string; output: string; calibration?: string }) => {
        const results: KhsResult[] = JSON.parse(readFileSync(resolve(opts.input), 'utf8'));
        let calibDb: CalibrationDatabase | undefined;
        if (opts.calibration) {
            calibDb = loadCalibration(resolve(opts.calibration));
            console.log(`Using calibration: ${calibDb.entries.length} entries`);
        }
        await generateKhsExcel(results, resolve(opts.output), calibDb);
        console.log(`Saved: ${opts.output}`);
    });

// ── calibrate add: Add reviewed pitches to calibration database ──────────
program
    .command('calibrate-add')
    .description('Add reviewed session data to the calibration database')
    .requiredOption('--input <path>', 'Path to session_analysis.json or ground_truth_comparison.json')
    .requiredOption('--game <name>', 'Game identifier (e.g., "Gino_vs_Clear_Falls")')
    .option('--date <date>', 'Game date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
    .option('--calibration <path>', 'Path to calibration.json', './calibration.json')
    .option('--radar <json>', 'JSON map of "video.MOV": velocity for radar gun readings')
    .action(async (opts: { input: string; game: string; date: string; calibration: string; radar?: string }) => {
        const results: KhsResult[] = JSON.parse(readFileSync(resolve(opts.input), 'utf8'));
        const calibPath = resolve(opts.calibration);
        const db = loadCalibration(calibPath);
        const radar: Record<string, number> | undefined = opts.radar ? JSON.parse(opts.radar) : undefined;

        const { added, updated, skipped } = addEntries(db, results, opts.game, opts.date, radar);
        saveCalibration(db, calibPath);

        console.log(`Calibration database: ${calibPath}`);
        console.log(`  Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);
        console.log(`  Total entries: ${db.entries.length}`);

        if (radar) {
            const radarCount = Object.keys(radar).length;
            console.log(`  Radar readings added: ${radarCount}`);
        }

        // Show per-type counts
        const types: Record<string, number> = {};
        db.entries.forEach((e) => {
            types[e.pitch_type] = (types[e.pitch_type] || 0) + 1;
        });
        console.log(
            `  By type: ${Object.entries(types)
                .map(([t, n]) => `${t}=${n}`)
                .join(', ')}`
        );
    });

// ── calibrate status: Show calibration database summary ─────────────────
program
    .command('calibrate-status')
    .description('Show calibration database summary')
    .option('--calibration <path>', 'Path to calibration.json', './calibration.json')
    .action(async (opts: { calibration: string }) => {
        const calibPath = resolve(opts.calibration);
        if (!existsSync(calibPath)) {
            console.log(`No calibration database found at ${calibPath}`);
            console.log('Use "calibrate-add" to create one from reviewed session data.');
            return;
        }
        const db = loadCalibration(calibPath);
        console.log(getCalibrationSummary(db));
    });

// ── calibrate velocity: Re-estimate velocities using calibration data ───
program
    .command('calibrate-velocity')
    .description('Re-estimate velocities for a session using the calibration database')
    .requiredOption('--input <path>', 'Path to session_analysis.json')
    .requiredOption('--calibration <path>', 'Path to calibration.json')
    .option('--output <path>', 'Output Excel path')
    .action(async (opts: { input: string; calibration: string; output?: string }) => {
        const results: KhsResult[] = JSON.parse(readFileSync(resolve(opts.input), 'utf8'));
        const db = loadCalibration(resolve(opts.calibration));

        console.log(
            `Calibration: ${db.entries.length} entries across ${[...new Set(db.entries.map((e) => e.game))].length} game(s)\n`
        );

        const valid = results.filter((r) => !r.error);
        console.log('Video           Type        Calibrated   Session-Only   Diff    Sample  Confidence');
        console.log('-'.repeat(90));

        for (const r of valid) {
            const pitchType = r.actual_pitch_type || r.detected_pitch_type || 'Fastball';
            const features = {
                glove_pop_amplitude: r.glove_pop_amplitude ?? 0,
                fb_score: r.fb_score ?? 0,
                decay_ratio: r.decay_ratio ?? 0,
                pop_zcr: r.pop_zcr ?? 0,
            };

            const calVel = computeVelocity(pitchType, features, db);

            // Session-only velocity (for comparison)
            const sessionAmps = valid.map((v) => v.glove_pop_amplitude ?? 0);
            const avgAmp = sessionAmps.reduce((s, v) => s + v, 0) / sessionAmps.length;
            const stdAmp = Math.sqrt(sessionAmps.reduce((s, v) => s + (v - avgAmp) ** 2, 0) / sessionAmps.length) || 1;
            const baselineMap: Record<string, number> = { Fastball: 79, Curveball: 65, Changeup: 72 };
            const sessBaseline = baselineMap[pitchType] ?? 75;
            const sessZ = ((r.glove_pop_amplitude ?? 0) - avgAmp) / stdAmp;
            const sessVel = Math.round((sessBaseline + Math.max(-4, Math.min(4, sessZ * 2.0))) * 10) / 10;
            const diff = Math.round((calVel.velocity - sessVel) * 10) / 10;

            console.log(
                `${r.video.padEnd(16)}${pitchType.padEnd(12)}${(calVel.velocity + ' mph').padStart(10)}   ${(sessVel + ' mph').padStart(10)}    ${(diff >= 0 ? '+' : '') + diff}      ${String(calVel.sample_size).padStart(3)}     ${calVel.confidence}`
            );
        }
    });

program.parse();
