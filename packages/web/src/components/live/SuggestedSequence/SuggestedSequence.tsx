import React from 'react';
import { theme } from '../../../styles/theme';
import { SuggestedPitch } from '../../../types';

interface SuggestedSequenceProps {
    sequence: SuggestedPitch[];
}

const PITCH_COLORS: Record<string, string> = {
    fastball: theme.colors.primary[600],
    '4-seam': theme.colors.primary[600],
    '2-seam': theme.colors.primary[500],
    sinker: theme.colors.primary[500],
    cutter: theme.colors.primary[400],
    slider: theme.colors.green[600],
    curveball: theme.colors.green[700],
    changeup: '#d97706',
    splitter: '#b45309',
    knuckleball: theme.colors.gray[600],
    screwball: theme.colors.gray[600],
    other: theme.colors.gray[500],
};

const SuggestedSequence: React.FC<SuggestedSequenceProps> = ({ sequence }) => {
    if (sequence.length === 0) {
        return (
            <div style={{ color: theme.colors.gray[400], fontSize: theme.fontSize.sm, padding: '8px 0' }}>Insufficient data</div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sequence.map((pitch, i) => {
                const color = PITCH_COLORS[pitch.pitch_type] || theme.colors.gray[600];
                return (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            padding: '6px 8px',
                            background: theme.colors.gray[50],
                            borderRadius: theme.borderRadius.sm,
                            borderLeft: `3px solid ${color}`,
                        }}
                    >
                        <div
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: color,
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: theme.fontWeight.bold,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            {i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                                <span
                                    style={{
                                        fontSize: theme.fontSize.sm,
                                        fontWeight: theme.fontWeight.semibold,
                                        color,
                                        textTransform: 'capitalize' as const,
                                    }}
                                >
                                    {pitch.pitch_type}
                                </span>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: theme.colors.gray[500],
                                        background: theme.colors.gray[100],
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                    }}
                                >
                                    {pitch.zone_label}
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: theme.colors.gray[500],
                                    marginTop: 2,
                                }}
                            >
                                {pitch.rationale}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SuggestedSequence;
