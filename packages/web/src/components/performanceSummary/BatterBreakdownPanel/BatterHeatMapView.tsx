import { PitchLocationData } from '@pitch-tracker/shared';
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

// Matches the coordinate mapping used by the live StrikeZone (viewBox 0 0 300 300)
const toX = (lx: number) => 113 + lx * 75;
const toY = (ly: number) => 120 + ly * 110;

interface Props {
    pitches: PitchLocationData[];
    bats?: string;
}

export default function BatterHeatMapView({ pitches, bats }: Props) {
    const located = pitches.filter((p) => p.location_x != null && p.location_y != null);
    const typesPresent = Array.from(new Set(located.map((p) => p.pitch_type)));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                {bats === 'L' ? 'LHH' : 'RHH'} · Pitch Locations by Type
            </span>
            <svg viewBox="0 0 300 300" width={200} height={200} style={{ display: 'block' }}>
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
                {/* Pitch dots */}
                {located.map((p, i) => (
                    <circle
                        key={i}
                        cx={toX(p.location_x)}
                        cy={toY(p.location_y)}
                        r={5}
                        fill={PITCH_TYPE_COLORS[p.pitch_type] ?? '#9ca3af'}
                        opacity={0.8}
                        stroke="white"
                        strokeWidth={0.8}
                    />
                ))}
            </svg>
            {typesPresent.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', justifyContent: 'center', maxWidth: 210 }}>
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
            {located.length === 0 && (
                <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No pitch location data.</span>
            )}
        </div>
    );
}
