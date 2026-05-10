import { TeamOffenseSummary, OutcomePitchGroup, CountSituationStat, ZoneHistogram } from '@pitch-tracker/shared';
import React, { useEffect, useRef, useState } from 'react';
import { performanceSummaryService } from '../../../services/performanceSummaryService';
import {
    Card,
    HeaderRow,
    Title,
    RegenerateButton,
    Narrative,
    NarrativePlaceholder,
    SectionTitle,
    PitchMixRow,
    PitchMixChip,
    HeatmapWrap,
    HeatmapColLabel,
    HeatmapRowLabel,
    HeatmapCaption,
    ZoneCell,
    SituationTable,
    OutcomeColumns,
    OutcomeCard,
    OutcomeChipRow,
    OutcomeChip,
    HitterAccordion,
    HitterBody,
    OutcomeStats,
    Empty,
} from './styles';

const NARRATIVE_POLL_INTERVAL_MS = 3000;
const NARRATIVE_POLL_MAX_ATTEMPTS = 10;

const SITUATION_LABEL: Record<string, string> = {
    first_pitch: 'First pitch',
    hitter_count: "Hitter's count",
    pitcher_count: "Pitcher's count",
    two_strike: 'Two strikes',
};

// 3x3 strike-zone cells in display order (top-left → bottom-right). The
// underlying zone IDs are batter-relative (mirrored for LHH on the API side),
// so the right column always corresponds to "inside" and the left to "away."
const ZONE_GRID: string[] = ['TL', 'TM', 'TR', 'ML', 'MM', 'MR', 'BL', 'BM', 'BR'];
const COL_LABELS = ['Away', 'Mid', 'In'];
const ROW_LABELS = ['High', 'Mid', 'Low'];

interface Props {
    gameId: string;
}

const OpponentAttackSummary: React.FC<Props> = ({ gameId }) => {
    const [summary, setSummary] = useState<TeamOffenseSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollAttemptsRef = useRef(0);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        pollAttemptsRef.current = 0;
        performanceSummaryService
            .getOpponentAttackSummary(gameId)
            .then((s) => {
                if (!cancelled) setSummary(s);
            })
            .catch((e) => {
                if (!cancelled) setError(e?.response?.data?.error || 'Failed to load opponent attack summary');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [gameId]);

    // Poll until the AI narrative arrives. The first GET fires generation in
    // the background server-side; subsequent fetches see the cached row.
    useEffect(() => {
        if (!summary || summary.narrative) {
            pollAttemptsRef.current = 0;
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
                pollTimerRef.current = null;
            }
            return;
        }
        if (pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS) return;
        pollTimerRef.current = setTimeout(() => {
            pollAttemptsRef.current += 1;
            performanceSummaryService
                .getOpponentAttackSummary(gameId)
                .then((s) => setSummary(s))
                .catch(() => {});
        }, NARRATIVE_POLL_INTERVAL_MS);
        return () => {
            if (pollTimerRef.current) {
                clearTimeout(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
    }, [summary, gameId]);

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            const refreshed = await performanceSummaryService.regenerateTeamOffenseNarrative(gameId);
            setSummary(refreshed);
            pollAttemptsRef.current = 0;
        } catch {
            // surface in UI via narrative placeholder
        } finally {
            setRegenerating(false);
        }
    };

    if (loading)
        return (
            <Card>
                <Empty>Loading opponent attack summary…</Empty>
            </Card>
        );
    if (error)
        return (
            <Card>
                <Empty>{error}</Empty>
            </Card>
        );
    if (!summary) return null;

    const totalPitches = summary.pitch_type_mix.reduce((sum, m) => sum + m.count, 0);
    if (totalPitches === 0) {
        return (
            <Card>
                <Title>How they attacked us</Title>
                <Empty>No pitch data charted for our hitters this game.</Empty>
            </Card>
        );
    }

    return (
        <Card>
            <HeaderRow>
                <Title>How the opponent attacked us</Title>
                <RegenerateButton onClick={handleRegenerate} disabled={regenerating}>
                    {regenerating ? 'Generating…' : summary.narrative ? 'Regenerate narrative' : 'Generate narrative'}
                </RegenerateButton>
            </HeaderRow>

            {summary.narrative ? (
                <Narrative>{summary.narrative}</Narrative>
            ) : (
                <NarrativePlaceholder>
                    Narrative still generating. Click "Generate narrative" if it doesn't appear shortly.
                </NarrativePlaceholder>
            )}

            <SectionTitle>Pitch mix ({totalPitches} pitches)</SectionTitle>
            <PitchMixRow>
                {summary.pitch_type_mix.map((m) => (
                    <PitchMixChip key={m.pitch_type}>
                        <span>{m.pitch_type}</span>
                        <span className="pct">{m.pct}%</span>
                        <span className="count">({m.count})</span>
                    </PitchMixChip>
                ))}
            </PitchMixRow>

            <SectionTitle>Attack zones</SectionTitle>
            <ZoneHeatmap histogram={summary.zone_histogram} />

            <SectionTitle>By count situation</SectionTitle>
            <SituationTableView situations={summary.count_situations} />

            <SectionTitle>What got us out / what worked</SectionTitle>
            <OutcomeColumnsView outcomes={summary.team_outcomes} />

            <SectionTitle>Per-hitter attack plan</SectionTitle>
            {summary.per_hitter.length === 0 && <Empty>No hitters with charted at-bats.</Empty>}
            {summary.per_hitter.map((h) => (
                <HitterAccordion key={h.batter_id}>
                    <summary>
                        <strong>#{h.batting_order}</strong>
                        <span>{h.batter_name}</span>
                        <span style={{ color: '#9ca3af' }}>
                            {h.bats}HH · {h.at_bats_count} AB
                        </span>
                        <OutcomeStats>
                            <span>
                                <strong>{h.outcomes.hits}</strong>H
                            </span>
                            <span>
                                <strong>{h.outcomes.walks}</strong>BB
                            </span>
                            <span>
                                <strong>{h.outcomes.strikeouts}</strong>K
                            </span>
                            <span>
                                <strong>{h.outcomes.outs_in_play}</strong>IP-out
                            </span>
                        </OutcomeStats>
                    </summary>
                    <HitterBody>
                        <SectionTitle style={{ marginTop: 0 }}>Pitch mix</SectionTitle>
                        <PitchMixRow>
                            {h.pitch_type_mix.map((m) => (
                                <PitchMixChip key={m.pitch_type}>
                                    <span>{m.pitch_type}</span>
                                    <span className="pct">{m.pct}%</span>
                                    <span className="count">({m.count})</span>
                                </PitchMixChip>
                            ))}
                        </PitchMixRow>

                        <SectionTitle>Attack zones</SectionTitle>
                        <ZoneHeatmap histogram={h.zone_histogram} />

                        <SectionTitle>What worked / what got out</SectionTitle>
                        <OutcomeColumnsView outcomes={[...h.what_worked, ...h.what_got_out]} />
                    </HitterBody>
                </HitterAccordion>
            ))}
        </Card>
    );
};

const ZoneHeatmap: React.FC<{ histogram: ZoneHistogram }> = ({ histogram }) => {
    const max = Math.max(0, ...ZONE_GRID.map((z) => histogram[z] || 0));
    return (
        <div>
            <HeatmapWrap>
                {/* Column headers row */}
                <span />
                {COL_LABELS.map((label) => (
                    <HeatmapColLabel key={`col-${label}`}>{label}</HeatmapColLabel>
                ))}
                {/* Three data rows, each prefixed with a row label */}
                {[0, 1, 2].map((row) => (
                    <React.Fragment key={`row-${row}`}>
                        <HeatmapRowLabel>{ROW_LABELS[row]}</HeatmapRowLabel>
                        {[0, 1, 2].map((col) => {
                            const z = ZONE_GRID[row * 3 + col];
                            const count = histogram[z] || 0;
                            const intensity = max > 0 ? count / max : 0;
                            return (
                                <ZoneCell key={z} $intensity={intensity} title={`${count} pitches`}>
                                    {count}
                                </ZoneCell>
                            );
                        })}
                    </React.Fragment>
                ))}
            </HeatmapWrap>
            <HeatmapCaption>Right column = inside to the hitter (LHH at-bats are mirrored).</HeatmapCaption>
        </div>
    );
};

const SituationTableView: React.FC<{ situations: CountSituationStat[] }> = ({ situations }) => {
    return (
        <SituationTable>
            <thead>
                <tr>
                    <th>Situation</th>
                    <th>Total</th>
                    <th>Top pitch types</th>
                </tr>
            </thead>
            <tbody>
                {situations.map((s) => (
                    <tr key={s.situation}>
                        <td>{SITUATION_LABEL[s.situation]}</td>
                        <td>{s.total}</td>
                        <td>
                            {s.pitch_type_mix.length === 0
                                ? '—'
                                : s.pitch_type_mix
                                      .slice(0, 4)
                                      .map((m) => `${m.pitch_type} ${m.pct}%`)
                                      .join(' · ')}
                        </td>
                    </tr>
                ))}
            </tbody>
        </SituationTable>
    );
};

const BUCKET_LABEL: Record<string, string> = {
    hit: 'Hits',
    walk: 'Walks',
    strikeout: 'Strikeouts',
    weak_contact_out: 'Weak-contact outs',
    hard_contact_out: 'Hard-contact outs',
};

const GOOD_BUCKETS = new Set(['hit', 'walk']);

const OutcomeColumnsView: React.FC<{ outcomes: OutcomePitchGroup[] }> = ({ outcomes }) => {
    const good = outcomes.filter((g) => GOOD_BUCKETS.has(g.bucket));
    const bad = outcomes.filter((g) => !GOOD_BUCKETS.has(g.bucket));

    return (
        <OutcomeColumns>
            <OutcomeCard $variant="good">
                <h4>What worked for us</h4>
                {good.length === 0 && <Empty>No hits or walks charted.</Empty>}
                {good.map((g) => (
                    <div key={g.bucket} style={{ marginBottom: 8 }}>
                        <strong style={{ fontSize: 13 }}>
                            {BUCKET_LABEL[g.bucket]} ({g.total})
                        </strong>
                        <OutcomeChipRow>
                            {g.pitches.slice(0, 8).map((p, i) => (
                                <OutcomeChip key={`${g.bucket}-${i}`}>
                                    {p.pitch_type} @ {p.zone}
                                    <span className="count">×{p.count}</span>
                                </OutcomeChip>
                            ))}
                        </OutcomeChipRow>
                    </div>
                ))}
            </OutcomeCard>

            <OutcomeCard $variant="bad">
                <h4>What got us out</h4>
                {bad.length === 0 && <Empty>No outs charted.</Empty>}
                {bad.map((g) => (
                    <div key={g.bucket} style={{ marginBottom: 8 }}>
                        <strong style={{ fontSize: 13 }}>
                            {BUCKET_LABEL[g.bucket]} ({g.total})
                        </strong>
                        <OutcomeChipRow>
                            {g.pitches.slice(0, 8).map((p, i) => (
                                <OutcomeChip key={`${g.bucket}-${i}`}>
                                    {p.pitch_type} @ {p.zone}
                                    <span className="count">×{p.count}</span>
                                </OutcomeChip>
                            ))}
                        </OutcomeChipRow>
                    </div>
                ))}
            </OutcomeCard>
        </OutcomeColumns>
    );
};

export default OpponentAttackSummary;
