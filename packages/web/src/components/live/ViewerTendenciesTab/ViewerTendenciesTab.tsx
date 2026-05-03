import React, { useCallback, useEffect, useState } from 'react';
import { analyticsService } from '../../../services/analyticsService';
import { opponentLineupService } from '../../../services/opponentLineupService';
import { theme } from '../../../styles/theme';
import {
    CountBucketBreakdown,
    Game,
    GamePitcherWithPlayer,
    HitterTendenciesLive,
    OpponentLineupPlayer,
    OpposingPitcher,
    PitcherTendenciesLive,
} from '../../../types';
import TendencyZoneGrid from '../TendencyZoneGrid';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    game: Game;
    allPitchers?: GamePitcherWithPlayer[];
    activePitcher: GamePitcherWithPlayer | null;
    allOpposingPitchers?: OpposingPitcher[];
    refreshTrigger: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SectionHeading: React.FC<{ children: React.ReactNode; subtitle?: string }> = ({ children, subtitle }) => (
    <div style={{ marginBottom: 14 }}>
        <div
            style={{
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.gray[800],
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}
        >
            {children}
        </div>
        {subtitle && <div style={{ fontSize: theme.fontSize.xs, color: theme.colors.gray[400], marginTop: 2 }}>{subtitle}</div>}
    </div>
);

const SubLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
        style={{
            fontSize: '10px',
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.gray[400],
            textTransform: 'uppercase' as const,
            letterSpacing: '0.07em',
            marginBottom: 8,
        }}
    >
        {children}
    </div>
);

const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
        style={{
            padding: '14px 16px',
            background: theme.colors.gray[50],
            borderRadius: theme.borderRadius.md,
            fontSize: theme.fontSize.sm,
            color: theme.colors.gray[400],
            textAlign: 'center' as const,
            fontStyle: 'italic',
        }}
    >
        {children}
    </div>
);

const HandToggle: React.FC<{ value: 'L' | 'R'; onChange: (v: 'L' | 'R') => void }> = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
        {(['L', 'R'] as const).map((hand) => (
            <button
                key={hand}
                onClick={() => onChange(hand)}
                style={{
                    padding: '4px 14px',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.semibold,
                    border: `1px solid ${value === hand ? theme.colors.primary[500] : theme.colors.gray[300]}`,
                    background: value === hand ? theme.colors.primary[600] : 'white',
                    color: value === hand ? 'white' : theme.colors.gray[600],
                    cursor: 'pointer',
                    borderRadius:
                        hand === 'L'
                            ? `${theme.borderRadius.md} 0 0 ${theme.borderRadius.md}`
                            : `0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0`,
                    transition: 'all 0.12s',
                }}
            >
                vs. {hand}HH
            </button>
        ))}
    </div>
);

// ─── Section 1: Our Pitcher Tendencies ────────────────────────────────────────

const OurPitcherSection: React.FC<{
    pitcherId: string;
    pitcherName: string;
    refreshTrigger: number;
}> = ({ pitcherId, pitcherName, refreshTrigger }) => {
    const [batterHand, setBatterHand] = useState<'L' | 'R'>('R');
    const [data, setData] = useState<PitcherTendenciesLive | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        analyticsService
            .getPitcherLiveTendencies(pitcherId, batterHand)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [pitcherId, batterHand, refreshTrigger]);

    const zoneGridCells =
        data?.zone_grid.map((z) => ({
            zone: z.zone,
            value: z.usage_pct / 100,
            displayValue: `${z.usage_pct}%`,
            count: z.count,
        })) ?? [];

    return (
        <div>
            <SectionHeading subtitle={pitcherName}>⚾ Our Pitcher</SectionHeading>
            <HandToggle value={batterHand} onChange={setBatterHand} />

            {loading && <div style={{ color: theme.colors.gray[400], fontSize: theme.fontSize.sm }}>Loading…</div>}

            {!loading && !data && <EmptyNote>No tendency data yet for {pitcherName}.</EmptyNote>}

            {!loading && data && !data.has_data && (
                <EmptyNote>Fewer than 10 pitches recorded vs. {batterHand}HH — insufficient data.</EmptyNote>
            )}

            {!loading && data && data.has_data && (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const, alignItems: 'flex-start' }}>
                    {/* Pitch mix */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <SubLabel>
                            Pitch Mix — {data.total_pitches} pitches vs. {batterHand}HH
                        </SubLabel>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                            {data.pitch_mix.map((p) => (
                                <div key={p.pitch_type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div
                                        style={{
                                            width: 62,
                                            fontSize: '11px',
                                            color: theme.colors.gray[600],
                                            textTransform: 'capitalize' as const,
                                            flexShrink: 0,
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
                                            width: 30,
                                            fontSize: '11px',
                                            color: theme.colors.gray[600],
                                            textAlign: 'right' as const,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {p.usage_pct}%
                                    </div>
                                    <div
                                        style={{
                                            width: 80,
                                            fontSize: '10px',
                                            color: theme.colors.gray[400],
                                            flexShrink: 0,
                                        }}
                                    >
                                        {p.strike_pct}% K · {p.whiff_pct}% W
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Zone grid */}
                    <div>
                        <SubLabel>Zone Usage %</SubLabel>
                        <TendencyZoneGrid cells={zoneGridCells} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Section 2: Opposing Pitcher In-Game ─────────────────────────────────────

const BUCKET_LABELS: Record<string, string> = {
    '1st_pitch': '1st Pitch (0-0)',
    ahead: 'Ahead',
    even: 'Even',
    behind: 'Behind',
};

const OppPitcherSection: React.FC<{
    gameId: string;
    pitcherName: string;
    opposingPitcherId?: string;
    refreshTrigger: number;
}> = ({ gameId, pitcherName, opposingPitcherId, refreshTrigger }) => {
    const [data, setData] = useState<CountBucketBreakdown | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        const call = opposingPitcherId
            ? analyticsService.getCountBreakdown(gameId, undefined, undefined, opposingPitcherId)
            : analyticsService.getCountBreakdown(gameId, undefined, 'opponent');
        call.then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [gameId, opposingPitcherId, refreshTrigger]);

    const buckets = ['1st_pitch', 'ahead', 'even', 'behind'] as const;
    const hasData = data && buckets.some((k) => data[k].total > 0);

    return (
        <div>
            <SectionHeading subtitle={pitcherName}>🎯 Opposing Pitcher — This Game</SectionHeading>

            {loading && <div style={{ color: theme.colors.gray[400], fontSize: theme.fontSize.sm }}>Loading…</div>}

            {!loading && !hasData && <EmptyNote>No pitches recorded for the opposing pitcher yet.</EmptyNote>}

            {!loading && data && hasData && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {buckets.map((key) => {
                        const bucket = data[key];
                        if (bucket.total === 0) return null;
                        const strikeColor =
                            bucket.strike_percentage >= 60
                                ? theme.colors.green[600]
                                : bucket.strike_percentage >= 45
                                  ? '#ca8a04'
                                  : theme.colors.red[500];
                        return (
                            <div
                                key={key}
                                style={{
                                    background: theme.colors.gray[50],
                                    border: `1px solid ${theme.colors.gray[200]}`,
                                    borderRadius: theme.borderRadius.md,
                                    padding: '10px 12px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: bucket.pitch_type_breakdown.length > 0 ? 6 : 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: 1,
                                            fontSize: theme.fontSize.sm,
                                            fontWeight: theme.fontWeight.semibold,
                                            color: theme.colors.gray[700],
                                        }}
                                    >
                                        {BUCKET_LABELS[key]}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: theme.fontSize.xs,
                                            color: theme.colors.gray[500],
                                        }}
                                    >
                                        {bucket.total} pitches
                                    </span>
                                    <span
                                        style={{
                                            fontSize: theme.fontSize.sm,
                                            fontWeight: theme.fontWeight.bold,
                                            color: strikeColor,
                                        }}
                                    >
                                        {bucket.strike_percentage}% K
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                                    {bucket.pitch_type_breakdown
                                        .sort((a, b) => b.count - a.count)
                                        .slice(0, 5)
                                        .map((t) => (
                                            <span
                                                key={t.pitch_type}
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '2px 7px',
                                                    background: theme.colors.gray[200],
                                                    borderRadius: theme.borderRadius.full,
                                                    color: theme.colors.gray[700],
                                                }}
                                            >
                                                {t.pitch_type} {t.count} ({t.strike_percentage}% K)
                                            </span>
                                        ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Section 3: Opponent Lineup + Hitter Tendencies ───────────────────────────

const HitterTendenciesExpanded: React.FC<{
    batterId: string;
    data: HitterTendenciesLive;
}> = ({ data }) => {
    const zoneGridCells = data.zone_weakness_map
        .filter((z) => z.count >= 1)
        .map((z) => ({
            zone: z.zone,
            value: z.swing_rate,
            count: z.count,
            displayValue: `${Math.round(z.swing_rate * 100)}%`,
            label: `${Math.round(z.swing_rate * 100)}% swing`,
        }));

    const formatRate = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

    return (
        <div
            style={{
                padding: '12px 14px',
                background: theme.colors.primary[50],
                borderTop: `1px solid ${theme.colors.primary[100]}`,
            }}
        >
            {!data.has_data ? (
                <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.gray[400], fontStyle: 'italic' }}>
                    No pitch history available for this batter.
                </span>
            ) : (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' as const, alignItems: 'flex-start' }}>
                    {/* Quick stats */}
                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                        {[
                            { label: '1st pitch take', value: formatRate(data.first_pitch_take_rate) },
                            { label: '2-strike chase', value: formatRate(data.two_strike_chase_rate) },
                            { label: 'Pitches seen', value: String(data.total_pitches) },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                style={{
                                    padding: '6px 10px',
                                    background: 'white',
                                    borderRadius: theme.borderRadius.md,
                                    textAlign: 'center' as const,
                                    minWidth: 64,
                                    border: `1px solid ${theme.colors.primary[100]}`,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: theme.fontSize.sm,
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
                        <SubLabel>Swing rate by zone</SubLabel>
                        <TendencyZoneGrid
                            cells={zoneGridCells}
                            lowColor={theme.colors.green[100]}
                            highColor={theme.colors.red[500]}
                        />
                    </div>

                    {/* Pitch vulnerability */}
                    {data.pitch_type_vulnerability.length > 0 && (
                        <div style={{ flex: 1, minWidth: 160 }}>
                            <SubLabel>Whiff % by pitch type</SubLabel>
                            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                                {data.pitch_type_vulnerability.slice(0, 5).map((p) => (
                                    <div key={p.pitch_type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div
                                            style={{
                                                width: 66,
                                                fontSize: '11px',
                                                color: theme.colors.gray[600],
                                                textTransform: 'capitalize' as const,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {p.pitch_type}
                                        </div>
                                        <div
                                            style={{
                                                flex: 1,
                                                height: 10,
                                                background: theme.colors.gray[100],
                                                borderRadius: 5,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${p.whiff_pct}%`,
                                                    height: '100%',
                                                    background: theme.colors.red[400],
                                                    borderRadius: 5,
                                                    transition: 'width 0.3s',
                                                }}
                                            />
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: theme.colors.gray[500],
                                                width: 32,
                                                textAlign: 'right' as const,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {p.whiff_pct}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const OpponentLineupSection: React.FC<{
    gameId: string;
}> = ({ gameId }) => {
    const [lineup, setLineup] = useState<OpponentLineupPlayer[]>([]);
    const [loadingLineup, setLoadingLineup] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loadingHitter, setLoadingHitter] = useState<string | null>(null);
    const [hitterCache, setHitterCache] = useState<Record<string, HitterTendenciesLive>>({});

    useEffect(() => {
        setLoadingLineup(true);
        opponentLineupService
            .getByGame(gameId)
            .then((l) => setLineup(l.filter((p) => p.is_starter)))
            .catch(() => setLineup([]))
            .finally(() => setLoadingLineup(false));
    }, [gameId]);

    const handleToggle = useCallback(
        async (batter: OpponentLineupPlayer) => {
            if (expandedId === batter.id) {
                setExpandedId(null);
                return;
            }
            setExpandedId(batter.id);
            if (!hitterCache[batter.id]) {
                setLoadingHitter(batter.id);
                try {
                    const data = await analyticsService.getHitterLiveTendencies(batter.id, 'opponent');
                    setHitterCache((prev) => ({ ...prev, [batter.id]: data }));
                } catch {
                    // leave cache empty — the expand will show no data
                } finally {
                    setLoadingHitter(null);
                }
            }
        },
        [expandedId, hitterCache]
    );

    const sorted = [...lineup].sort((a, b) => a.batting_order - b.batting_order);

    return (
        <div>
            <SectionHeading subtitle="Tap a batter to see their tendencies">🧢 Opponent Lineup</SectionHeading>

            {loadingLineup && <div style={{ color: theme.colors.gray[400], fontSize: theme.fontSize.sm }}>Loading lineup…</div>}

            {!loadingLineup && sorted.length === 0 && <EmptyNote>No opponent lineup entered for this game.</EmptyNote>}

            {!loadingLineup && sorted.length > 0 && (
                <div
                    style={{
                        border: `1px solid ${theme.colors.gray[200]}`,
                        borderRadius: theme.borderRadius.lg,
                        overflow: 'hidden',
                    }}
                >
                    {sorted.map((batter, idx) => {
                        const isExpanded = expandedId === batter.id;
                        const isLoading = loadingHitter === batter.id;
                        const tendencyData = hitterCache[batter.id];

                        return (
                            <div
                                key={batter.id}
                                style={{
                                    borderTop: idx > 0 ? `1px solid ${theme.colors.gray[100]}` : undefined,
                                }}
                            >
                                {/* Batter row */}
                                <button
                                    onClick={() => handleToggle(batter)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '10px 14px',
                                        background: isExpanded ? theme.colors.primary[50] : 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left' as const,
                                        transition: 'background 0.12s',
                                    }}
                                >
                                    {/* Batting order */}
                                    <span
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            background: isExpanded ? theme.colors.primary[600] : theme.colors.gray[200],
                                            color: isExpanded ? 'white' : theme.colors.gray[600],
                                            fontSize: '11px',
                                            fontWeight: theme.fontWeight.bold,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {batter.batting_order}
                                    </span>

                                    {/* Name + position */}
                                    <div style={{ flex: 1 }}>
                                        <span
                                            style={{
                                                fontSize: theme.fontSize.sm,
                                                fontWeight: theme.fontWeight.semibold,
                                                color: isExpanded ? theme.colors.primary[800] : theme.colors.gray[800],
                                            }}
                                        >
                                            {batter.player_name}
                                        </span>
                                        {batter.position && (
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    color: theme.colors.gray[400],
                                                    marginLeft: 6,
                                                }}
                                            >
                                                {batter.position}
                                            </span>
                                        )}
                                    </div>

                                    {/* Bats badge */}
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            padding: '1px 7px',
                                            background: theme.colors.gray[100],
                                            color: theme.colors.gray[600],
                                            borderRadius: theme.borderRadius.full,
                                            fontWeight: theme.fontWeight.semibold,
                                        }}
                                    >
                                        {batter.bats}HH
                                    </span>

                                    {/* Chevron */}
                                    <span
                                        style={{
                                            fontSize: 12,
                                            color: theme.colors.gray[400],
                                            transition: 'transform 0.15s',
                                            transform: isExpanded ? 'rotate(180deg)' : 'none',
                                        }}
                                    >
                                        ▼
                                    </span>
                                </button>

                                {/* Expanded tendencies */}
                                {isExpanded && (
                                    <div>
                                        {isLoading ? (
                                            <div
                                                style={{
                                                    padding: '12px 14px',
                                                    background: theme.colors.primary[50],
                                                    borderTop: `1px solid ${theme.colors.primary[100]}`,
                                                    fontSize: theme.fontSize.sm,
                                                    color: theme.colors.gray[400],
                                                }}
                                            >
                                                Loading tendencies…
                                            </div>
                                        ) : tendencyData ? (
                                            <HitterTendenciesExpanded batterId={batter.id} data={tendencyData} />
                                        ) : (
                                            <div
                                                style={{
                                                    padding: '12px 14px',
                                                    background: theme.colors.primary[50],
                                                    borderTop: `1px solid ${theme.colors.primary[100]}`,
                                                    fontSize: theme.fontSize.sm,
                                                    color: theme.colors.gray[400],
                                                    fontStyle: 'italic',
                                                }}
                                            >
                                                No tendency data available for this batter.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ViewerTendenciesTab: React.FC<Props> = ({
    game,
    allPitchers = [],
    activePitcher,
    allOpposingPitchers = [],
    refreshTrigger,
}) => {
    const [selectedPitcherIdx, setSelectedPitcherIdx] = React.useState(() => {
        if (!activePitcher || allPitchers.length === 0) return 0;
        const idx = allPitchers.findIndex((p) => p.player_id === activePitcher.player_id);
        return Math.max(0, idx);
    });
    const [selectedOppPitcherIdx, setSelectedOppPitcherIdx] = React.useState(() => Math.max(0, allOpposingPitchers.length - 1));

    const showOurPitcher = game.charting_mode !== 'opp_pitcher';
    const showOppPitcher = game.charting_mode !== 'our_pitcher';

    const displayedPitcher = allPitchers[selectedPitcherIdx] ?? activePitcher;
    const pitcherId = displayedPitcher?.player_id;
    const pitcherName = displayedPitcher?.player
        ? `${displayedPitcher.player.first_name} ${displayedPitcher.player.last_name}`
        : 'Our Pitcher';

    const selectedOppPitcher = allOpposingPitchers[selectedOppPitcherIdx] ?? null;
    const oppPitcherName = selectedOppPitcher?.pitcher_name ?? 'Opposing Pitcher';

    return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 32, maxWidth: 860, margin: '0 auto' }}>
            {/* Section 1: Our pitcher */}
            {showOurPitcher && (
                <section>
                    {allPitchers.length > 1 && (
                        <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
                            {allPitchers.map((p, i) => {
                                const name = p.player ? `${p.player.first_name} ${p.player.last_name}` : `Pitcher ${i + 1}`;
                                return (
                                    <button
                                        key={p.player_id}
                                        onClick={() => setSelectedPitcherIdx(i)}
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: theme.fontSize.sm,
                                            fontWeight: theme.fontWeight.semibold,
                                            border: `1px solid ${i === selectedPitcherIdx ? theme.colors.primary[500] : theme.colors.gray[300]}`,
                                            background: i === selectedPitcherIdx ? theme.colors.primary[600] : 'white',
                                            color: i === selectedPitcherIdx ? 'white' : theme.colors.gray[600],
                                            cursor: 'pointer',
                                            borderRadius:
                                                i === 0
                                                    ? `${theme.borderRadius.md} 0 0 ${theme.borderRadius.md}`
                                                    : i === allPitchers.length - 1
                                                      ? `0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0`
                                                      : '0',
                                            transition: 'all 0.12s',
                                        }}
                                    >
                                        {name}
                                        {!p.inning_exited && (
                                            <span
                                                style={{
                                                    marginLeft: 4,
                                                    fontSize: 10,
                                                    color: i === selectedPitcherIdx ? '#86efac' : theme.colors.green[600],
                                                }}
                                            >
                                                ●
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {pitcherId ? (
                        <OurPitcherSection pitcherId={pitcherId} pitcherName={pitcherName} refreshTrigger={refreshTrigger} />
                    ) : (
                        <>
                            <SectionHeading>⚾ Our Pitcher</SectionHeading>
                            <EmptyNote>No pitcher assigned to this game yet.</EmptyNote>
                        </>
                    )}
                </section>
            )}

            {/* Section 2: Opposing pitcher */}
            {showOppPitcher && (
                <>
                    {showOurPitcher && (
                        <hr style={{ border: 'none', borderTop: `1px solid ${theme.colors.gray[200]}`, margin: 0 }} />
                    )}
                    <section>
                        {allOpposingPitchers.length > 1 && (
                            <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
                                {allOpposingPitchers.map((p, i) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedOppPitcherIdx(i)}
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: theme.fontSize.sm,
                                            fontWeight: theme.fontWeight.semibold,
                                            border: `1px solid ${i === selectedOppPitcherIdx ? theme.colors.primary[500] : theme.colors.gray[300]}`,
                                            background: i === selectedOppPitcherIdx ? theme.colors.primary[600] : 'white',
                                            color: i === selectedOppPitcherIdx ? 'white' : theme.colors.gray[600],
                                            cursor: 'pointer',
                                            borderRadius:
                                                i === 0
                                                    ? `${theme.borderRadius.md} 0 0 ${theme.borderRadius.md}`
                                                    : i === allOpposingPitchers.length - 1
                                                      ? `0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0`
                                                      : '0',
                                            transition: 'all 0.12s',
                                        }}
                                    >
                                        {p.pitcher_name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <OppPitcherSection
                            gameId={game.id}
                            pitcherName={oppPitcherName}
                            opposingPitcherId={selectedOppPitcher?.id}
                            refreshTrigger={refreshTrigger}
                        />
                    </section>
                </>
            )}

            {/* Section 3: Opponent lineup */}
            <hr style={{ border: 'none', borderTop: `1px solid ${theme.colors.gray[200]}`, margin: 0 }} />
            <section>
                <OpponentLineupSection gameId={game.id} />
            </section>
        </div>
    );
};

export default ViewerTendenciesTab;
