import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../../services/analyticsService';
import { PitchChart, TeamSide } from '../../../types';
import {
    ChartTable,
    ChartWrapper,
    CountCell,
    CountHeaderCell,
    EmptyText,
    KPctCell,
    PitchTypeCell,
    SectionHeader,
    TotalCell,
    TotalRow,
} from './styles';

interface Props {
    gameId: string;
    pitcherId?: string;
    teamSide?: TeamSide;
    refreshTrigger?: number;
}

const COUNT_SECTIONS = [
    { label: '1st Pitch', counts: ['0-0'] },
    { label: 'Ahead', counts: ['0-1', '0-2', '1-2'] },
    { label: 'Even', counts: ['1-1', '2-2'] },
    { label: 'Behind', counts: ['1-0', '2-0', '2-1', '3-0', '3-1', '3-2'] },
];

const ALL_COUNTS = COUNT_SECTIONS.flatMap((s) => s.counts);

const PITCH_ABBREV: Record<string, string> = {
    fastball: 'FB',
    '4-seam': 'FB',
    '2-seam': 'FB',
    sinker: 'FB',
    curveball: 'CB',
    slider: 'SL',
    changeup: 'CH',
    change: 'CH',
    cutter: 'CT',
    splitter: 'SP',
    knuckleball: 'KN',
    other: 'OT',
};

function abbrev(pitchType: string): string {
    const lower = pitchType.toLowerCase();
    return PITCH_ABBREV[lower] ?? pitchType.slice(0, 2).toUpperCase();
}

const CountBreakdownPanel: React.FC<Props> = ({ gameId, pitcherId, teamSide, refreshTrigger }) => {
    const [data, setData] = useState<PitchChart | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        analyticsService
            .getPitchChart(gameId, pitcherId, teamSide)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [gameId, pitcherId, teamSide, refreshTrigger]);

    if (loading) return <EmptyText>Loading...</EmptyText>;
    if (!data || data.grand_total === 0) return <EmptyText>No pitches yet</EmptyText>;

    const { pitch_types, counts, totals_by_type } = data;

    const totalForCount = (c: string) => counts[c]?.total ?? 0;
    const kpctForCount = (c: string) => counts[c]?.strike_pct ?? 0;
    const countForType = (pt: string, c: string): number => {
        const entry = counts[c]?.by_type.find((x) => x.pitch_type === pt);
        return entry?.count ?? 0;
    };
    const totalForType = (pt: string): number => totals_by_type.find((x) => x.pitch_type === pt)?.count ?? 0;

    return (
        <ChartWrapper>
            <ChartTable>
                <thead>
                    <tr>
                        <th />
                        {COUNT_SECTIONS.map((sec) => (
                            <SectionHeader key={sec.label} colSpan={sec.counts.length}>
                                {sec.label}
                            </SectionHeader>
                        ))}
                        <SectionHeader>Total</SectionHeader>
                    </tr>
                    <tr>
                        <th />
                        {ALL_COUNTS.map((c) => (
                            <CountHeaderCell key={c}>{c}</CountHeaderCell>
                        ))}
                        <CountHeaderCell>#</CountHeaderCell>
                    </tr>
                </thead>
                <tbody>
                    {pitch_types.map((pt) => (
                        <tr key={pt}>
                            <PitchTypeCell title={pt}>{abbrev(pt)}</PitchTypeCell>
                            {ALL_COUNTS.map((c) => {
                                const n = countForType(pt, c);
                                return <CountCell key={c}>{n > 0 ? n : ''}</CountCell>;
                            })}
                            <TotalCell>{totalForType(pt)}</TotalCell>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <TotalRow>
                        <PitchTypeCell>Tot</PitchTypeCell>
                        {ALL_COUNTS.map((c) => (
                            <TotalCell key={c}>{totalForCount(c) > 0 ? totalForCount(c) : ''}</TotalCell>
                        ))}
                        <TotalCell>{data.grand_total}</TotalCell>
                    </TotalRow>
                    <tr>
                        <PitchTypeCell>K%</PitchTypeCell>
                        {ALL_COUNTS.map((c) => {
                            const pct = kpctForCount(c);
                            return (
                                <KPctCell key={c} pct={pct}>
                                    {totalForCount(c) > 0 ? `${pct}%` : ''}
                                </KPctCell>
                            );
                        })}
                        <td />
                    </tr>
                </tfoot>
            </ChartTable>
        </ChartWrapper>
    );
};

export default CountBreakdownPanel;
