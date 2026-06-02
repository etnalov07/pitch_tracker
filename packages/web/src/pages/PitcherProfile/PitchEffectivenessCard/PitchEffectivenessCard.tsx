import React, { useEffect, useState } from 'react';
import TendencyZoneGrid from '../../../components/live/TendencyZoneGrid';
import { analyticsService } from '../../../services/analyticsService';
import { theme } from '../../../styles/theme';
import type { PitcherEffectiveness } from '../../../types';
import {
    Card,
    Header,
    Title,
    ControlsRow,
    WindowSelect,
    EmptyText,
    LoadingText,
    Table,
    Th,
    Td,
    Row,
    HandHeader,
    HandSubHeader,
    PitchCell,
    PctCell,
    Sample,
    ExpandHint,
    ExpandedRow,
    ExpandedGrid,
    ExpandedGridCol,
    ExpandedColLabel,
} from './styles';

// HEAT_ZONES inside ids → TendencyZoneGrid's 3x3 "row-col" ids.
// The backend returns batter-relative coords (LHH mirrored), where high x =
// inside. TendencyZoneGrid labels col 0 as inside ('UI'/'MI'/'DI'), so the
// rightmost HEAT_ZONES column (TR/MR/BR) maps to col 0.
const HEAT_TO_3x3: Record<string, string> = {
    TR: '0-0',
    TM: '0-1',
    TL: '0-2',
    MR: '1-0',
    MM: '1-1',
    ML: '1-2',
    BR: '2-0',
    BM: '2-1',
    BL: '2-2',
};

function formatPitchType(t: string): string {
    return t.charAt(0).toUpperCase() + t.slice(1);
}

interface Props {
    pitcherId: string;
}

const WINDOW_OPTIONS: Array<{ value: 'career' | 'last_5'; label: string }> = [
    { value: 'career', label: 'Career' },
    { value: 'last_5', label: 'Last 5 games' },
];

const PitchEffectivenessCard: React.FC<Props> = ({ pitcherId }) => {
    const [window, setWindow] = useState<'career' | 'last_5'>('career');
    const [dataL, setDataL] = useState<PitcherEffectiveness | null>(null);
    const [dataR, setDataR] = useState<PitcherEffectiveness | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        if (!pitcherId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([
            analyticsService.getPitcherEffectiveness(pitcherId, 'L', window),
            analyticsService.getPitcherEffectiveness(pitcherId, 'R', window),
        ])
            .then(([l, r]) => {
                if (cancelled) return;
                setDataL(l);
                setDataR(r);
            })
            .catch(() => {
                if (!cancelled) setError('Failed to load effectiveness');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [pitcherId, window]);

    // Build the union of pitch types across both hands, sorted by total n desc.
    const pitchTypes = React.useMemo(() => {
        const map = new Map<string, number>();
        for (const p of dataL?.pitch_types ?? []) map.set(p.pitch_type, (map.get(p.pitch_type) ?? 0) + p.n);
        for (const p of dataR?.pitch_types ?? []) map.set(p.pitch_type, (map.get(p.pitch_type) ?? 0) + p.n);
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([pt]) => pt);
    }, [dataL, dataR]);

    const renderPct = (n: number | undefined, pct: number | undefined) => {
        if (n === undefined || pct === undefined || n < 5) {
            return (
                <PctCell>
                    <span style={{ color: theme.colors.gray[400] }}>—</span>
                    <Sample>{n ? `n=${n}` : ''}</Sample>
                </PctCell>
            );
        }
        let color = theme.colors.gray[700];
        if (n >= 15) {
            if (pct >= 70) color = theme.colors.green[600];
            else if (pct >= 60) color = theme.colors.yellow[600];
            else if (pct < 50) color = theme.colors.red[500];
        }
        return (
            <PctCell>
                <span style={{ color, fontWeight: theme.fontWeight.semibold }}>{pct}%</span>
                <Sample>n={n}</Sample>
            </PctCell>
        );
    };

    const renderExpanded = (pt: string) => {
        const lRow = dataL?.pitch_types.find((p) => p.pitch_type === pt);
        const rRow = dataR?.pitch_types.find((p) => p.pitch_type === pt);

        const buildCells = (row: typeof lRow) => {
            if (!row) return [];
            const cells = [];
            for (const z of row.by_zone) {
                const mapped = HEAT_TO_3x3[z.zone];
                if (!mapped) continue;
                cells.push({
                    zone: mapped,
                    value: z.strike_pct / 100,
                    displayValue: `${z.strike_pct}%`,
                    count: z.n,
                });
            }
            return cells;
        };

        return (
            <ExpandedGrid>
                <ExpandedGridCol>
                    <ExpandedColLabel>vs LHH ({lRow?.n ?? 0})</ExpandedColLabel>
                    <TendencyZoneGrid
                        cells={buildCells(lRow)}
                        lowColor={theme.colors.red[200]}
                        highColor={theme.colors.green[600]}
                    />
                </ExpandedGridCol>
                <ExpandedGridCol>
                    <ExpandedColLabel>vs RHH ({rRow?.n ?? 0})</ExpandedColLabel>
                    <TendencyZoneGrid
                        cells={buildCells(rRow)}
                        lowColor={theme.colors.red[200]}
                        highColor={theme.colors.green[600]}
                    />
                </ExpandedGridCol>
            </ExpandedGrid>
        );
    };

    return (
        <Card>
            <Header>
                <Title>Pitch Effectiveness</Title>
                <ControlsRow>
                    <WindowSelect value={window} onChange={(e) => setWindow(e.target.value as 'career' | 'last_5')}>
                        {WINDOW_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </WindowSelect>
                </ControlsRow>
            </Header>

            {loading && <LoadingText>Loading…</LoadingText>}
            {error && <EmptyText>{error}</EmptyText>}
            {!loading && !error && pitchTypes.length === 0 && (
                <EmptyText>Not enough pitches logged yet to compute effectiveness.</EmptyText>
            )}
            {!loading && !error && pitchTypes.length > 0 && (
                <Table>
                    <thead>
                        <tr>
                            <Th>Pitch</Th>
                            <HandHeader colSpan={1}>
                                vs LHH
                                <HandSubHeader>strike %</HandSubHeader>
                            </HandHeader>
                            <HandHeader colSpan={1}>
                                vs RHH
                                <HandSubHeader>strike %</HandSubHeader>
                            </HandHeader>
                            <Th>Best zone</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {pitchTypes.map((pt) => {
                            const lRow = dataL?.pitch_types.find((p) => p.pitch_type === pt);
                            const rRow = dataR?.pitch_types.find((p) => p.pitch_type === pt);
                            const isOpen = expanded === pt;
                            const bestZone =
                                (lRow?.best_zone_id && (lRow.n ?? 0) >= (rRow?.n ?? 0) ? lRow.best_zone_id : rRow?.best_zone_id) ??
                                lRow?.best_zone_id ??
                                rRow?.best_zone_id ??
                                '—';
                            return (
                                <React.Fragment key={pt}>
                                    <Row onClick={() => setExpanded(isOpen ? null : pt)} aria-expanded={isOpen}>
                                        <PitchCell>
                                            {formatPitchType(pt)}
                                            <ExpandHint>{isOpen ? '▾' : '▸'}</ExpandHint>
                                        </PitchCell>
                                        <Td>{renderPct(lRow?.n, lRow?.strike_pct)}</Td>
                                        <Td>{renderPct(rRow?.n, rRow?.strike_pct)}</Td>
                                        <Td>{bestZone}</Td>
                                    </Row>
                                    {isOpen && (
                                        <ExpandedRow>
                                            <td colSpan={4}>{renderExpanded(pt)}</td>
                                        </ExpandedRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </Table>
            )}
        </Card>
    );
};

export default PitchEffectivenessCard;
