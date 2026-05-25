import styled from '@emotion/styled';
import type {
    PitcherReportPayload,
    PitcherReportPitchTypeRow,
    PitcherReportWindow,
    PitcherReportZoneRow,
    PitcherTrendCallout,
    VelocityTrendPoint,
} from '@pitch-tracker/shared';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { pitcherReportService } from '../../services/pitcherReportService';
import { theme } from '../../styles/theme';

const WINDOWS: { value: PitcherReportWindow; label: string }[] = [
    { value: 'last5', label: 'Last 5' },
    { value: 'last10', label: 'Last 10' },
    { value: 'last20', label: 'Last 20' },
    { value: 'season', label: 'Season' },
    { value: 'all', label: 'All time' },
];

const NARRATIVE_POLL_INTERVAL_MS = 3000;
const NARRATIVE_POLL_MAX_ATTEMPTS = 10;

const PitcherReport: React.FC = () => {
    const navigate = useNavigate();
    const { team_id, pitcher_id } = useParams<{ team_id: string; pitcher_id: string }>();
    const [window, setWindow] = useState<PitcherReportWindow>('last10');
    const [payload, setPayload] = useState<PitcherReportPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState(false);
    const pollAttemptsRef = useRef(0);

    const loadReport = useCallback(
        async (w: PitcherReportWindow) => {
            if (!pitcher_id) return;
            try {
                setLoading(true);
                setError(null);
                const data = await pitcherReportService.getReport(pitcher_id, w);
                setPayload(data);
                pollAttemptsRef.current = 0;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load report');
            } finally {
                setLoading(false);
            }
        },
        [pitcher_id]
    );

    useEffect(() => {
        loadReport(window);
    }, [loadReport, window]);

    // Poll for the narrative when it's missing (mirrors OpponentAttackSummary pattern).
    useEffect(() => {
        if (!payload || payload.narrative || !pitcher_id) return;
        if (pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS) return;
        const id = setTimeout(async () => {
            pollAttemptsRef.current += 1;
            try {
                const fresh = await pitcherReportService.getReport(pitcher_id, window);
                setPayload(fresh);
            } catch {
                /* swallow; next poll retries */
            }
        }, NARRATIVE_POLL_INTERVAL_MS);
        return () => clearTimeout(id);
    }, [payload, pitcher_id, window]);

    const handleRegenerate = async () => {
        if (!pitcher_id) return;
        try {
            setRegenerating(true);
            const fresh = await pitcherReportService.regenerateNarrative(pitcher_id, window);
            setPayload(fresh);
            pollAttemptsRef.current = 0;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to regenerate');
        } finally {
            setRegenerating(false);
        }
    };

    if (loading && !payload) {
        return (
            <Container>
                <LoadingText>Loading report…</LoadingText>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <ErrorText>{error}</ErrorText>
            </Container>
        );
    }

    if (!payload) return null;

    const hasGames = payload.stats.games_included > 0;

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(team_id ? `/teams/${team_id}/pitcher/${pitcher_id}` : '/')}>
                        ← Back
                    </BackButton>
                    <div>
                        <PitcherName>{payload.pitcher_name}</PitcherName>
                        <PitcherMeta>Performance Report · {payload.window_label}</PitcherMeta>
                    </div>
                </HeaderLeft>
                <WindowChips>
                    {WINDOWS.map((w) => (
                        <WindowChip key={w.value} active={w.value === window} onClick={() => setWindow(w.value)}>
                            {w.label}
                        </WindowChip>
                    ))}
                </WindowChips>
            </Header>

            {!hasGames ? (
                <EmptyState>No game data yet in this window.</EmptyState>
            ) : (
                <Content>
                    <NarrativeCard>
                        <NarrativeHeader>
                            <NarrativeTitle>Coach&apos;s Summary</NarrativeTitle>
                            <RegenerateButton onClick={handleRegenerate} disabled={regenerating}>
                                {regenerating ? 'Regenerating…' : 'Regenerate'}
                            </RegenerateButton>
                        </NarrativeHeader>
                        {payload.narrative ? (
                            <NarrativeBody>{payload.narrative}</NarrativeBody>
                        ) : pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS ? (
                            <NarrativeBody style={{ opacity: 0.6 }}>
                                Narrative still generating — tap Regenerate or check back in a moment.
                            </NarrativeBody>
                        ) : (
                            <NarrativeBody style={{ opacity: 0.6 }}>Generating summary…</NarrativeBody>
                        )}
                    </NarrativeCard>

                    <StatTilesGrid>
                        <StatTile label="Games" value={String(payload.stats.games_included)} />
                        <StatTile label="Pitches" value={String(payload.stats.total_pitches)} />
                        <StatTile label="Strike %" value={`${payload.stats.strike_pct}%`} />
                        <StatTile
                            label="Command"
                            value={payload.stats.target_accuracy_pct != null ? `${payload.stats.target_accuracy_pct}%` : '—'}
                        />
                        <StatTile label="Batters Faced" value={String(payload.stats.batters_faced)} />
                        <StatTile label="Innings" value={String(payload.stats.innings_pitched)} />
                        <StatTile
                            label="1st Pitch Strike"
                            value={payload.stats.first_pitch_strike_pct != null ? `${payload.stats.first_pitch_strike_pct}%` : '—'}
                        />
                        <StatTile
                            label="3-Ball Rate"
                            value={payload.stats.three_ball_rate != null ? `${payload.stats.three_ball_rate}%` : '—'}
                        />
                    </StatTilesGrid>

                    {payload.velocity_trend && payload.velocity_trend.length > 0 && (
                        <SectionCard>
                            <SectionTitle>Velocity Trend</SectionTitle>
                            <VelocityChart points={payload.velocity_trend} />
                        </SectionCard>
                    )}

                    {payload.trends.length > 0 && (
                        <SectionCard>
                            <SectionTitle>Recent Trends</SectionTitle>
                            <TrendList>
                                {payload.trends.map((t, i) => (
                                    <TrendRow key={`${t.kind}-${i}`} trend={t} />
                                ))}
                            </TrendList>
                        </SectionCard>
                    )}

                    {payload.stats.pitch_types.length > 0 && (
                        <SectionCard>
                            <SectionTitle>Pitch Arsenal</SectionTitle>
                            <PitchTypeTable rows={payload.stats.pitch_types} />
                        </SectionCard>
                    )}

                    {payload.stats.zones.length > 0 && (
                        <SectionCard>
                            <SectionTitle>Zone Effectiveness</SectionTitle>
                            <ZoneTable rows={payload.stats.zones} />
                        </SectionCard>
                    )}

                    {payload.games.length > 0 && (
                        <SectionCard>
                            <SectionTitle>Game Log</SectionTitle>
                            <GameLogTable rows={payload.games} onRowClick={(gameId) => navigate(`/game/${gameId}`)} />
                        </SectionCard>
                    )}
                </Content>
            )}
        </Container>
    );
};

// ---------- Subcomponents ----------

const StatTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <StatTileBox>
        <StatValue>{value}</StatValue>
        <StatLabel>{label}</StatLabel>
    </StatTileBox>
);

const VelocityChart: React.FC<{ points: VelocityTrendPoint[] }> = ({ points }) => {
    // Inline SVG line chart — no chart-library dep. Sized to container via viewBox.
    const W = 600;
    const H = 140;
    const PAD = 28;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const xs = points.map((_, i) => (points.length === 1 ? PAD + innerW / 2 : PAD + (i / (points.length - 1)) * innerW));
    const allVelos = points.flatMap((p) => [p.avg_velocity, p.top_velocity]);
    const minV = Math.min(...allVelos);
    const maxV = Math.max(...allVelos);
    const pad = Math.max(1, (maxV - minV) * 0.15);
    const yMin = Math.floor(minV - pad);
    const yMax = Math.ceil(maxV + pad);
    const yScale = (v: number) => PAD + innerH - ((v - yMin) / Math.max(yMax - yMin, 1)) * innerH;
    const avgPath = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${yScale(p.avg_velocity).toFixed(1)}`)
        .join(' ');
    const topPath = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${yScale(p.top_velocity).toFixed(1)}`)
        .join(' ');
    return (
        <VelocitySvgWrap>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height={H}>
                {/* y-axis labels */}
                <text x={4} y={PAD} fill="var(--text-muted)" fontSize={10}>
                    {yMax}
                </text>
                <text x={4} y={H - PAD} fill="var(--text-muted)" fontSize={10}>
                    {yMin}
                </text>
                {/* avg + top paths */}
                <path d={avgPath} fill="none" stroke="var(--accent-blue)" strokeWidth={2} />
                <path d={topPath} fill="none" stroke="var(--accent-violet)" strokeWidth={1.5} strokeDasharray="4 4" />
                {/* dots */}
                {points.map((p, i) => (
                    <g key={p.game_id}>
                        <circle cx={xs[i]} cy={yScale(p.avg_velocity)} r={3} fill="var(--accent-blue)" />
                        <circle cx={xs[i]} cy={yScale(p.top_velocity)} r={2} fill="var(--accent-violet)" />
                    </g>
                ))}
            </svg>
            <VelocityLegend>
                <LegendDot style={{ background: theme.accents.blue }} /> avg
                <LegendDot style={{ background: theme.accents.violet }} /> top
            </VelocityLegend>
        </VelocitySvgWrap>
    );
};

const TrendRow: React.FC<{ trend: PitcherTrendCallout }> = ({ trend }) => {
    const arrow = trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—';
    const color =
        trend.direction === 'up' ? theme.accents.green : trend.direction === 'down' ? theme.accents.red : theme.accents.violet;
    return (
        <TrendItem>
            <TrendArrow style={{ color }}>{arrow}</TrendArrow>
            <TrendCopy>{trend.copy}</TrendCopy>
        </TrendItem>
    );
};

const PitchTypeTable: React.FC<{ rows: PitcherReportPitchTypeRow[] }> = ({ rows }) => (
    <TableWrap>
        <Table>
            <thead>
                <tr>
                    <Th>Type</Th>
                    <Th>Count</Th>
                    <Th>Usage</Th>
                    <Th>Strike%</Th>
                    <Th>Whiff%</Th>
                    <Th>Avg / Top</Th>
                    <Th>Verdict</Th>
                </tr>
            </thead>
            <tbody>
                {rows.map((r) => (
                    <tr key={r.pitch_type}>
                        <Td>{r.pitch_type}</Td>
                        <Td>{r.count}</Td>
                        <Td>{r.usage_pct}%</Td>
                        <Td>{r.strike_pct}%</Td>
                        <Td>{r.whiff_pct}%</Td>
                        <Td>{r.avg_velocity != null ? `${r.avg_velocity} / ${r.top_velocity}` : '—'}</Td>
                        <Td>
                            <SuccessTag success={r.success}>
                                {r.success === 'works' ? 'Working' : r.success === 'mixed' ? 'Mixed' : 'Struggles'}
                            </SuccessTag>
                        </Td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </TableWrap>
);

const ZoneTable: React.FC<{ rows: PitcherReportZoneRow[] }> = ({ rows }) => (
    <TableWrap>
        <Table>
            <thead>
                <tr>
                    <Th>Zone</Th>
                    <Th>Count</Th>
                    <Th>Strike%</Th>
                    <Th>Whiff%</Th>
                    <Th>Weak / Hard</Th>
                    <Th>Verdict</Th>
                </tr>
            </thead>
            <tbody>
                {rows.map((r) => (
                    <tr key={r.zone}>
                        <Td>{r.zone}</Td>
                        <Td>{r.count}</Td>
                        <Td>{r.strike_pct}%</Td>
                        <Td>{r.whiff_pct}%</Td>
                        <Td>
                            {r.weak_contact_pct}% / {r.hard_contact_pct}%
                        </Td>
                        <Td>
                            <SuccessTag success={r.success}>
                                {r.success === 'works' ? 'Working' : r.success === 'mixed' ? 'Mixed' : 'Hit'}
                            </SuccessTag>
                        </Td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </TableWrap>
);

const GameLogTable: React.FC<{
    rows: PitcherReportPayload['games'];
    onRowClick: (gameId: string) => void;
}> = ({ rows, onRowClick }) => (
    <TableWrap>
        <Table>
            <thead>
                <tr>
                    <Th>Date</Th>
                    <Th>Opponent</Th>
                    <Th>BF</Th>
                    <Th>Pitches</Th>
                    <Th>Strike%</Th>
                    <Th>Command</Th>
                    <Th>Avg Velo</Th>
                    <Th>R / H</Th>
                </tr>
            </thead>
            <tbody>
                {rows.map((r) => (
                    <ClickableRow key={r.game_id} onClick={() => onRowClick(r.game_id)}>
                        <Td>{new Date(r.game_date).toLocaleDateString()}</Td>
                        <Td>{r.opponent_name ?? '—'}</Td>
                        <Td>{r.batters_faced}</Td>
                        <Td>{r.pitches}</Td>
                        <Td>{r.strike_pct}%</Td>
                        <Td>{r.target_accuracy_pct != null ? `${r.target_accuracy_pct}%` : '—'}</Td>
                        <Td>{r.avg_velocity != null ? `${r.avg_velocity}` : '—'}</Td>
                        <Td>
                            {r.runs_allowed} / {r.hits_allowed}
                        </Td>
                    </ClickableRow>
                ))}
            </tbody>
        </Table>
    </TableWrap>
);

// ---------- Styles ----------

const Container = styled.div`
    padding: ${theme.spacing.xl};
    max-width: 1100px;
    margin: 0 auto;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: ${theme.spacing.lg};
    margin-bottom: ${theme.spacing.xl};
    flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.lg};
`;

const BackButton = styled.button`
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    cursor: pointer;
    font-size: ${theme.fontSize.lg};
`;

const PitcherName = styled.h1`
    margin: 0;
    font-size: ${theme.fontSize['2xl']};
    color: var(--text);
`;

const PitcherMeta = styled.div`
    color: var(--text-muted);
    font-size: ${theme.fontSize.base};
`;

const WindowChips = styled.div`
    display: flex;
    gap: ${theme.spacing.sm};
    flex-wrap: wrap;
`;

const WindowChip = styled.button<{ active: boolean }>`
    background: ${(p) => (p.active ? theme.accents.blue : 'transparent')};
    color: ${(p) => (p.active ? '#fff' : 'var(--text)')};
    border: 1px solid ${(p) => (p.active ? theme.accents.blue : 'var(--border)')};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.full};
    cursor: pointer;
    font-size: ${theme.fontSize.base};
`;

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.xl};
`;

const NarrativeCard = styled.div`
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.lg};
`;

const NarrativeHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${theme.spacing.md};
`;

const NarrativeTitle = styled.h2`
    margin: 0;
    font-size: ${theme.fontSize.xl};
    color: var(--text);
`;

const RegenerateButton = styled.button`
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    cursor: pointer;
    font-size: ${theme.fontSize.sm};
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const NarrativeBody = styled.p`
    margin: 0;
    color: var(--text);
    font-size: ${theme.fontSize.lg};
    line-height: 1.5;
`;

const StatTilesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: ${theme.spacing.md};
`;

const StatTileBox = styled.div`
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.lg};
    text-align: center;
`;

const StatValue = styled.div`
    font-size: ${theme.fontSize['2xl']};
    font-weight: 700;
    color: var(--text);
`;

const StatLabel = styled.div`
    margin-top: ${theme.spacing.xs};
    font-size: ${theme.fontSize.sm};
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const SectionCard = styled.div`
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.lg};
`;

const SectionTitle = styled.h3`
    margin: 0 0 ${theme.spacing.md} 0;
    font-size: ${theme.fontSize.xl};
    color: var(--text);
`;

const VelocitySvgWrap = styled.div`
    width: 100%;
`;

const VelocityLegend = styled.div`
    display: flex;
    gap: ${theme.spacing.lg};
    margin-top: ${theme.spacing.sm};
    font-size: ${theme.fontSize.sm};
    color: var(--text-muted);
    align-items: center;
`;

const LegendDot = styled.span`
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: ${theme.borderRadius.full};
    margin-right: ${theme.spacing.xs};
`;

const TrendList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.sm};
`;

const TrendItem = styled.div`
    display: flex;
    align-items: center;
    gap: ${theme.spacing.md};
`;

const TrendArrow = styled.div`
    font-weight: 700;
    font-size: ${theme.fontSize.lg};
    min-width: 16px;
`;

const TrendCopy = styled.div`
    color: var(--text);
    font-size: ${theme.fontSize.lg};
`;

const TableWrap = styled.div`
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${theme.fontSize.base};
    color: var(--text);
`;

const Th = styled.th`
    text-align: left;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: ${theme.fontSize.xs};
`;

const Td = styled.td`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-bottom: 1px solid var(--border-subtle, var(--border));
`;

const ClickableRow = styled.tr`
    cursor: pointer;
    &:hover td {
        background: var(--surface-hover, rgba(0, 0, 0, 0.03));
    }
`;

const SuccessTag = styled.span<{ success: 'works' | 'mixed' | 'struggles' }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: ${theme.borderRadius.full};
    font-size: ${theme.fontSize.xs};
    font-weight: 600;
    background: ${(p) =>
        p.success === 'works' ? theme.accents.green : p.success === 'mixed' ? theme.accents.violet : theme.accents.red};
    color: #fff;
`;

const EmptyState = styled.div`
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing['2xl']};
    text-align: center;
    color: var(--text-muted);
`;

const LoadingText = styled.div`
    padding: ${theme.spacing.xl};
    color: var(--text-muted);
`;

const ErrorText = styled.div`
    padding: ${theme.spacing.xl};
    color: var(--accent-red);
`;

export default PitcherReport;
