import { PitchLocationData, TendencyBucket } from '@pitch-tracker/shared';
import React from 'react';

const PITCH_TYPE_COLORS: Record<string, string> = {
    fastball: '#ef4444',
    '4-seam': '#ef4444',
    '2-seam': '#f97316',
    cutter: '#f59e0b',
    sinker: '#eab308',
    slider: '#3b82f6',
    curveball: '#8b5cf6',
    changeup: '#22c55e',
    splitter: '#14b8a6',
    knuckleball: '#6b7280',
    screwball: '#ec4899',
    other: '#9ca3af',
};

const PITCH_TYPE_ABBREV: Record<string, string> = {
    fastball: 'FB',
    '4-seam': 'FB',
    '2-seam': '2S',
    cutter: 'CT',
    sinker: 'SK',
    slider: 'SL',
    curveball: 'CB',
    changeup: 'CH',
    splitter: 'SP',
    knuckleball: 'KN',
    screwball: 'SC',
    other: 'OT',
};

const BUCKET_ORDER: TendencyBucket[] = ['first_pitch', 'hitter_count', 'pitcher_count', 'two_strike'];

const BUCKET_LABELS: Record<TendencyBucket, string> = {
    first_pitch: 'First Pitch',
    hitter_count: "Hitter's Count",
    pitcher_count: "Pitcher's Count",
    two_strike: '2-Strike',
};

// Mutually exclusive partition of all 12 ball-strike combinations.
// 2-strike takes precedence over hitter/pitcher counts because tactically
// the put-away pitch is what matters most in those situations.
function bucketFor(p: PitchLocationData): TendencyBucket | null {
    const b = p.balls_before;
    const s = p.strikes_before;
    if (b == null || s == null) return null;
    if (b === 0 && s === 0) return 'first_pitch';
    if (s === 2) return 'two_strike';
    if (b > s) return 'hitter_count';
    return 'pitcher_count';
}

const toX = (lx: number) => 113 + lx * 75;
const toY = (ly: number) => 120 + ly * 110;

interface Props {
    pitches: PitchLocationData[];
}

export default function BatterTendenciesView({ pitches }: Props) {
    const bucketed: Record<TendencyBucket, PitchLocationData[]> = {
        first_pitch: [],
        hitter_count: [],
        pitcher_count: [],
        two_strike: [],
    };
    let unbucketed = 0;
    for (const p of pitches) {
        const b = bucketFor(p);
        if (b) bucketed[b].push(p);
        else unbucketed++;
    }

    const typesPresent = Array.from(new Set(pitches.map((p) => p.pitch_type)));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {BUCKET_ORDER.map((bucket) => (
                    <BucketCell key={bucket} label={BUCKET_LABELS[bucket]} pitches={bucketed[bucket]} />
                ))}
            </div>
            {typesPresent.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', justifyContent: 'center', maxWidth: 480 }}>
                    {typesPresent.map((type) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: PITCH_TYPE_COLORS[type] ?? '#9ca3af',
                                }}
                            />
                            <span style={{ fontSize: 10, color: '#6b7280' }}>{PITCH_TYPE_ABBREV[type] ?? type}</span>
                        </div>
                    ))}
                </div>
            )}
            <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                ○ target &middot; ● actual (color = pitch type)
            </span>
            {unbucketed > 0 && (
                <span style={{ fontSize: 9, color: '#9ca3af', fontStyle: 'italic' }}>
                    {unbucketed} pitch{unbucketed === 1 ? '' : 'es'} without count data omitted
                </span>
            )}
            {pitches.length === 0 && <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No pitch data.</span>}
        </div>
    );
}

interface BucketCellProps {
    label: string;
    pitches: PitchLocationData[];
}

function BucketCell({ label, pitches }: BucketCellProps) {
    const located = pitches.filter((p) => p.location_x != null && p.location_y != null);
    const targeted = pitches.filter((p) => p.target_location_x != null && p.target_location_y != null);

    const typeCounts = new Map<string, number>();
    for (const p of pitches) typeCounts.set(p.pitch_type, (typeCounts.get(p.pitch_type) ?? 0) + 1);
    const topTypes = Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const total = pitches.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 120 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>{label}</span>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>
                {total} pitch{total === 1 ? '' : 'es'}
            </span>
            <svg viewBox="0 0 300 300" width={120} height={120} style={{ display: 'block' }}>
                <rect x={0} y={0} width={300} height={300} fill="#f5f5f0" />
                {/* Waste area */}
                <rect x={81} y={85} width={139} height={185} fill="rgba(200,200,195,0.25)" stroke="#b0b0a8" strokeWidth={1} />
                {/* Strike zone */}
                <rect x={113} y={120} width={75} height={110} fill="rgba(255,255,255,0.9)" stroke="#374151" strokeWidth={1.5} />
                {/* 3×3 grid lines */}
                <line x1={113} y1={156.7} x2={188} y2={156.7} stroke="#d1d5db" strokeWidth={0.5} />
                <line x1={113} y1={193.4} x2={188} y2={193.4} stroke="#d1d5db" strokeWidth={0.5} />
                <line x1={138} y1={120} x2={138} y2={230} stroke="#d1d5db" strokeWidth={0.5} />
                <line x1={163} y1={120} x2={163} y2={230} stroke="#d1d5db" strokeWidth={0.5} />
                {/* Target rings (drawn first so dots overlay) */}
                {targeted.map((p, i) => (
                    <circle
                        key={`t-${i}`}
                        cx={toX(p.target_location_x!)}
                        cy={toY(p.target_location_y!)}
                        r={6}
                        fill="none"
                        stroke={PITCH_TYPE_COLORS[p.pitch_type] ?? '#9ca3af'}
                        strokeWidth={1.5}
                        opacity={0.6}
                    />
                ))}
                {/* Actual dots */}
                {located.map((p, i) => (
                    <circle
                        key={`a-${i}`}
                        cx={toX(p.location_x)}
                        cy={toY(p.location_y)}
                        r={5}
                        fill={PITCH_TYPE_COLORS[p.pitch_type] ?? '#9ca3af'}
                        opacity={0.85}
                        stroke="white"
                        strokeWidth={0.8}
                    />
                ))}
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minHeight: 36, marginTop: 2 }}>
                {topTypes.length === 0 ? (
                    <span style={{ fontSize: 9, color: '#9ca3af', fontStyle: 'italic' }}>—</span>
                ) : (
                    topTypes.map(([type, count]) => (
                        <span key={type} style={{ fontSize: 9, color: '#374151' }}>
                            <span style={{ color: PITCH_TYPE_COLORS[type] ?? '#9ca3af' }}>●</span> {PITCH_TYPE_ABBREV[type] ?? type}{' '}
                            {Math.round((count / total) * 100)}%
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}
