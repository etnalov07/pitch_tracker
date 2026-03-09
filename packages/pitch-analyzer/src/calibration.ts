import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { CalibrationDatabase, CalibrationEntry, KhsResult } from './types';

const VELOCITY_BASELINES: Record<string, number> = {
    Fastball: 79,
    Changeup: 72,
    Curveball: 65,
};

const VELOCITY_SCALES: Record<string, number> = {
    Fastball: 2.5,
    Changeup: 2.0,
    Curveball: 2.0,
};

// Feature weights for multi-feature velocity composite
const FEATURE_WEIGHTS: Record<string, number> = {
    glove_pop_amplitude: 0.5,
    fb_score: 0.25,
    pop_zcr: 0.05,
    decay_ratio: -0.05,
};

const FEATURE_NAMES = Object.keys(FEATURE_WEIGHTS);

export function loadCalibration(path: string): CalibrationDatabase {
    if (!existsSync(path)) {
        return { version: 1, updated: new Date().toISOString(), baselines: { ...VELOCITY_BASELINES }, entries: [] };
    }
    return JSON.parse(readFileSync(path, 'utf8'));
}

export function saveCalibration(db: CalibrationDatabase, path: string): void {
    db.updated = new Date().toISOString();
    writeFileSync(path, JSON.stringify(db, null, 2));
}

export function addEntries(
    db: CalibrationDatabase,
    results: KhsResult[],
    game: string,
    date: string,
    radarReadings?: Record<string, number>
): { added: number; updated: number; skipped: number } {
    let added = 0,
        updated = 0,
        skipped = 0;

    for (const r of results) {
        if (r.error || !r.glove_pop_amplitude) {
            skipped++;
            continue;
        }

        const pitchType = r.actual_pitch_type || r.detected_pitch_type;
        if (!pitchType) {
            skipped++;
            continue;
        }

        const entry: CalibrationEntry = {
            video: r.video,
            game,
            date,
            pitch_type: pitchType,
            glove_pop_amplitude: r.glove_pop_amplitude,
            audio_amplitude: r.audio_amplitude ?? 0,
            fb_score: r.fb_score ?? 0,
            decay_ratio: r.decay_ratio ?? 0,
            pop_zcr: r.pop_zcr ?? 0,
        };

        if (radarReadings && radarReadings[r.video] !== undefined) {
            entry.radar_velocity = radarReadings[r.video];
        }

        // Check for existing entry (same video + game)
        const existingIdx = db.entries.findIndex((e) => e.video === r.video && e.game === game);
        if (existingIdx >= 0) {
            db.entries[existingIdx] = entry;
            updated++;
        } else {
            db.entries.push(entry);
            added++;
        }
    }

    // Recalculate baselines from radar data if available
    for (const type of Object.keys(VELOCITY_BASELINES)) {
        const radarEntries = db.entries.filter((e) => e.pitch_type === type && e.radar_velocity !== undefined);
        if (radarEntries.length >= 2) {
            db.baselines[type] = radarEntries.reduce((s, e) => s + e.radar_velocity!, 0) / radarEntries.length;
        }
    }

    return { added, updated, skipped };
}

export interface VelocityEstimate {
    velocity: number;
    vel_low: number;
    vel_high: number;
    confidence: 'calibrated' | 'radar-calibrated' | 'estimated';
    sample_size: number;
}

export function computeVelocity(
    pitchType: string,
    features: { glove_pop_amplitude: number; fb_score: number; decay_ratio: number; pop_zcr: number },
    db: CalibrationDatabase
): VelocityEstimate {
    const typeEntries = db.entries.filter((e) => e.pitch_type === pitchType);
    const baseline = db.baselines[pitchType] ?? VELOCITY_BASELINES[pitchType] ?? 75;
    const scale = VELOCITY_SCALES[pitchType] ?? 2.0;
    const hasRadar = typeEntries.some((e) => e.radar_velocity !== undefined);

    if (typeEntries.length < 3) {
        // Not enough data — fall back to baseline
        return {
            velocity: baseline,
            vel_low: baseline - 4,
            vel_high: baseline + 4,
            confidence: 'estimated',
            sample_size: typeEntries.length,
        };
    }

    // Compute z-score for each feature relative to the calibration population
    let compositeZ = 0;
    let totalWeight = 0;

    for (const feat of FEATURE_NAMES) {
        const weight = FEATURE_WEIGHTS[feat];
        const vals = typeEntries.map((e) => (e as any)[feat] as number).filter((v) => v !== undefined && isFinite(v));
        if (vals.length < 3) continue;

        const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
        const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) || 1;
        const featureVal = (features as any)[feat] as number;

        if (featureVal !== undefined && isFinite(featureVal)) {
            const z = (featureVal - mean) / std;
            compositeZ += weight * z;
            totalWeight += Math.abs(weight);
        }
    }

    if (totalWeight > 0) {
        compositeZ /= totalWeight;
    }

    const velocity = baseline + Math.max(-4, Math.min(4, compositeZ * scale));
    const uncertainty = typeEntries.length >= 20 ? 2 : typeEntries.length >= 10 ? 3 : 4;

    return {
        velocity: Math.round(velocity * 10) / 10,
        vel_low: Math.round((velocity - uncertainty) * 10) / 10,
        vel_high: Math.round((velocity + uncertainty) * 10) / 10,
        confidence: hasRadar ? 'radar-calibrated' : 'calibrated',
        sample_size: typeEntries.length,
    };
}

export function getCalibrationSummary(db: CalibrationDatabase): string {
    const lines: string[] = [];
    lines.push(`Calibration Database v${db.version}`);
    lines.push(`Last updated: ${db.updated}`);
    lines.push(`Total entries: ${db.entries.length}`);
    lines.push('');

    // Per-type breakdown
    const types = ['Fastball', 'Curveball', 'Changeup'];
    for (const type of types) {
        const entries = db.entries.filter((e) => e.pitch_type === type);
        if (entries.length === 0) continue;

        const radarCount = entries.filter((e) => e.radar_velocity !== undefined).length;
        const amps = entries.map((e) => e.glove_pop_amplitude);
        const ampAvg = amps.reduce((s, v) => s + v, 0) / amps.length;
        const ampStd = Math.sqrt(amps.reduce((s, v) => s + (v - ampAvg) ** 2, 0) / amps.length);

        lines.push(`${type}: ${entries.length} pitches`);
        lines.push(`  Baseline: ${db.baselines[type] ?? VELOCITY_BASELINES[type]} mph${radarCount > 0 ? ' (radar-calibrated)' : ' (assumed)'}`);
        lines.push(`  Radar readings: ${radarCount}`);
        lines.push(`  Amplitude: avg=${Math.round(ampAvg)}, std=${Math.round(ampStd)}`);

        // Games
        const games = [...new Set(entries.map((e) => e.game))];
        lines.push(`  Games: ${games.join(', ')}`);

        // Uncertainty estimate
        const uncertainty = entries.length >= 20 ? '±2 mph' : entries.length >= 10 ? '±3 mph' : '±4 mph';
        lines.push(`  Velocity uncertainty: ${uncertainty}`);
        lines.push('');
    }

    // Per-game summary
    const games = [...new Set(db.entries.map((e) => e.game))];
    lines.push('Games in database:');
    for (const game of games) {
        const gameEntries = db.entries.filter((e) => e.game === game);
        const date = gameEntries[0]?.date ?? 'unknown';
        const radarCount = gameEntries.filter((e) => e.radar_velocity !== undefined).length;
        lines.push(`  ${game} (${date}): ${gameEntries.length} pitches${radarCount > 0 ? `, ${radarCount} radar` : ''}`);
    }

    return lines.join('\n');
}
