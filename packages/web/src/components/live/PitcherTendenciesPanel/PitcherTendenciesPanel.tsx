import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../../services/analyticsService';
import { theme } from '../../../styles/theme';
import { PitcherTendenciesLive } from '../../../types';
import SuggestedSequence from '../SuggestedSequence';
import TendencyZoneGrid from '../TendencyZoneGrid';

interface PitcherTendenciesPanelProps {
    pitcherId: string;
    pitcherName: string;
    initialBatterHand: 'L' | 'R';
    onClose: () => void;
}

const PitcherTendenciesPanel: React.FC<PitcherTendenciesPanelProps> = ({ pitcherId, pitcherName, initialBatterHand, onClose }) => {
    const [batterHand, setBatterHand] = useState<'L' | 'R'>(initialBatterHand);
    const [data, setData] = useState<PitcherTendenciesLive | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pitcherId) return;
        setLoading(true);
        setError(null);
        analyticsService
            .getPitcherLiveTendencies(pitcherId, batterHand)
            .then(setData)
            .catch(() => setError('Failed to load tendencies'))
            .finally(() => setLoading(false));
    }, [pitcherId, batterHand]);

    const zoneGridCells =
        data?.zone_grid.map((z) => ({
            zone: z.zone,
            value: z.usage_pct / 100,
            displayValue: `${z.usage_pct}%`,
            count: z.count,
        })) || [];

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: theme.borderRadius.lg,
                    padding: 20,
                    maxWidth: 480,
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: theme.shadows.xl,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div
                            style={{
                                fontSize: theme.fontSize.lg,
                                fontWeight: theme.fontWeight.bold,
                                color: theme.colors.primary[800],
                            }}
                        >
                            Pitcher Tendencies
                        </div>
                        <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.gray[500] }}>{pitcherName}</div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: theme.colors.gray[100],
                            borderRadius: theme.borderRadius.full,
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            fontSize: 16,
                            color: theme.colors.gray[600],
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Handedness toggle */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    {(['L', 'R'] as const).map((hand) => (
                        <button
                            key={hand}
                            onClick={() => setBatterHand(hand)}
                            style={{
                                padding: '5px 14px',
                                borderRadius: theme.borderRadius.md,
                                border: `1px solid ${batterHand === hand ? theme.colors.primary[600] : theme.colors.gray[300]}`,
                                background: batterHand === hand ? theme.colors.primary[600] : 'white',
                                color: batterHand === hand ? 'white' : theme.colors.gray[600],
                                fontWeight: theme.fontWeight.semibold,
                                fontSize: theme.fontSize.sm,
                                cursor: 'pointer',
                            }}
                        >
                            vs. {hand}HH
                        </button>
                    ))}
                </div>

                {loading && <div style={{ color: theme.colors.gray[400], padding: '24px 0', textAlign: 'center' }}>Loading…</div>}
                {error && <div style={{ color: theme.colors.red?.[600] || 'red', fontSize: theme.fontSize.sm }}>{error}</div>}

                {!loading && data && !data.has_data && (
                    <div
                        style={{
                            padding: '20px',
                            background: theme.colors.yellow[50],
                            borderRadius: theme.borderRadius.md,
                            color: theme.colors.yellow[800],
                            fontSize: theme.fontSize.sm,
                            textAlign: 'center' as const,
                        }}
                    >
                        Insufficient data — fewer than 10 pitches recorded vs. {batterHand}HH batters.
                    </div>
                )}

                {!loading && data && data.has_data && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Pitch mix */}
                        <div>
                            <SectionTitle>
                                Pitch Mix vs. {batterHand}HH ({data.total_pitches} pitches)
                            </SectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {data.pitch_mix.map((p) => (
                                    <div key={p.pitch_type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div
                                            style={{
                                                width: 60,
                                                fontSize: '11px',
                                                color: theme.colors.gray[600],
                                                textTransform: 'capitalize' as const,
                                            }}
                                        >
                                            {p.pitch_type}
                                        </div>
                                        <div
                                            style={{
                                                flex: 1,
                                                height: 14,
                                                background: theme.colors.gray[100],
                                                borderRadius: 7,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${p.usage_pct}%`,
                                                    height: '100%',
                                                    background: theme.colors.primary[500],
                                                    borderRadius: 7,
                                                    transition: 'width 0.3s',
                                                }}
                                            />
                                        </div>
                                        <div
                                            style={{
                                                width: 32,
                                                fontSize: '11px',
                                                color: theme.colors.gray[600],
                                                textAlign: 'right',
                                            }}
                                        >
                                            {p.usage_pct}%
                                        </div>
                                        <div style={{ width: 70, fontSize: '11px', color: theme.colors.gray[400] }}>
                                            {p.strike_pct}% K | {p.whiff_pct}% W
                                        </div>
                                        {p.avg_velocity && (
                                            <div style={{ fontSize: '11px', color: theme.colors.gray[400], width: 40 }}>
                                                {p.avg_velocity}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Zone grid */}
                        <div>
                            <SectionTitle>Zone Tendencies (usage %)</SectionTitle>
                            <TendencyZoneGrid cells={zoneGridCells} />
                        </div>

                        {/* Suggested sequence */}
                        <div>
                            <SectionTitle>Suggested Sequence</SectionTitle>
                            <SuggestedSequence sequence={data.suggested_sequence} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
        style={{
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.gray[500],
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            marginBottom: 8,
        }}
    >
        {children}
    </div>
);

export default PitcherTendenciesPanel;
