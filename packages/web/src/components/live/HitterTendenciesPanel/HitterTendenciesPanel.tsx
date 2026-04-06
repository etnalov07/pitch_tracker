import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../../services/analyticsService';
import { theme } from '../../../styles/theme';
import { HitterTendenciesLive } from '../../../types';
import SuggestedSequence from '../SuggestedSequence';
import TendencyZoneGrid from '../TendencyZoneGrid';

interface HitterTendenciesPanelProps {
    batterId: string;
    batterName: string;
    batterType: 'team' | 'opponent';
    onClose: () => void;
}

const HitterTendenciesPanel: React.FC<HitterTendenciesPanelProps> = ({ batterId, batterName, batterType, onClose }) => {
    const [data, setData] = useState<HitterTendenciesLive | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!batterId) return;
        setLoading(true);
        setError(null);
        analyticsService
            .getHitterLiveTendencies(batterId, batterType)
            .then(setData)
            .catch(() => setError('Failed to load tendencies'))
            .finally(() => setLoading(false));
    }, [batterId, batterType]);

    // Weakness map: high swing_rate + low contact_rate = high "danger" to pitcher
    // We invert it for the hitter panel: color by swing rate (how vulnerable they are)
    const zoneGridCells =
        data?.zone_weakness_map
            .filter((z) => z.count >= 1)
            .map((z) => ({
                zone: z.zone,
                value: z.swing_rate,
                count: z.count,
                displayValue: `${Math.round(z.swing_rate * 100)}%`,
                label: `${Math.round(z.swing_rate * 100)}% swing`,
            })) || [];

    const formatRate = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

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
                            Hitter Tendencies
                        </div>
                        <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.gray[500] }}>{batterName}</div>
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
                        Insufficient data — no pitch history available for this batter.
                    </div>
                )}

                {!loading && data && data.has_data && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Quick stats row */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[
                                { label: 'First pitch take', value: formatRate(data.first_pitch_take_rate) },
                                { label: '2-strike chase', value: formatRate(data.two_strike_chase_rate) },
                                { label: 'Total pitches', value: String(data.total_pitches) },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    style={{
                                        flex: 1,
                                        padding: '8px 10px',
                                        background: theme.colors.gray[50],
                                        borderRadius: theme.borderRadius.md,
                                        textAlign: 'center' as const,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: theme.fontSize.base,
                                            fontWeight: theme.fontWeight.bold,
                                            color: theme.colors.primary[700],
                                        }}
                                    >
                                        {stat.value}
                                    </div>
                                    <div style={{ fontSize: '10px', color: theme.colors.gray[400] }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Zone weakness map */}
                        <div>
                            <SectionTitle>Zone Weakness Map (swing rate)</SectionTitle>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <TendencyZoneGrid
                                    cells={zoneGridCells}
                                    lowColor={theme.colors.green[100]}
                                    highColor={theme.colors.red[500]}
                                />
                                <div style={{ fontSize: '10px', color: theme.colors.gray[400], paddingTop: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                        <div
                                            style={{ width: 12, height: 12, background: theme.colors.red[500], borderRadius: 2 }}
                                        />
                                        High swing %
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div
                                            style={{
                                                width: 12,
                                                height: 12,
                                                background: theme.colors.green[100],
                                                borderRadius: 2,
                                                border: `1px solid ${theme.colors.gray[200]}`,
                                            }}
                                        />
                                        Low swing %
                                    </div>
                                    <div style={{ marginTop: 8, color: theme.colors.gray[300] }}>
                                        UI=Up-In MM=Middle MA=Middle-Away etc.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pitch type vulnerability */}
                        {data.pitch_type_vulnerability.length > 0 && (
                            <div>
                                <SectionTitle>Pitch Vulnerability (whiff %)</SectionTitle>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {data.pitch_type_vulnerability.slice(0, 5).map((p) => (
                                        <div key={p.pitch_type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div
                                                style={{
                                                    width: 70,
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
                                                    height: 12,
                                                    background: theme.colors.gray[100],
                                                    borderRadius: 6,
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: `${p.whiff_pct}%`,
                                                        height: '100%',
                                                        background: theme.colors.red[400],
                                                        borderRadius: 6,
                                                        transition: 'width 0.3s',
                                                    }}
                                                />
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '11px',
                                                    color: theme.colors.gray[500],
                                                    width: 40,
                                                    textAlign: 'right',
                                                }}
                                            >
                                                {p.whiff_pct}%
                                            </div>
                                            <div style={{ fontSize: '10px', color: theme.colors.gray[400], width: 40 }}>
                                                n={p.times_seen}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Suggested attack sequence */}
                        <div>
                            <SectionTitle>Suggested Attack Sequence</SectionTitle>
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

export default HitterTendenciesPanel;
