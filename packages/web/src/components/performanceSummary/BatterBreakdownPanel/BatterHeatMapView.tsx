import styled from '@emotion/styled';
import { PitchLocationHeatMap } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../../styles/theme';

const INNER_ZONES = [
    ['TL', 'TM', 'TR'],
    ['ML', 'MM', 'MR'],
    ['BL', 'BM', 'BR'],
];

function interpolateColor(t: number): string {
    const r = Math.round(t * 220);
    const g = Math.round(60 + (1 - t) * 120);
    const b = Math.round((1 - t) * 220);
    return `rgb(${r},${g},${b})`;
}

function zoneTextColor(bg: string): string {
    if (!bg.startsWith('rgb')) return theme.colors.gray[700];
    const m = bg.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (!m) return theme.colors.gray[700];
    const lum = (parseInt(m[1]) * 299 + parseInt(m[2]) * 587 + parseInt(m[3]) * 114) / 1000;
    return lum > 140 ? theme.colors.gray[900] : '#ffffff';
}

interface Props {
    heatmap: PitchLocationHeatMap;
    bats?: string;
}

export default function BatterHeatMapView({ heatmap, bats }: Props) {
    const zones = heatmap.zones ?? {};
    const allCounts = Object.values(zones).map((z) => z.count);
    const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 1;
    const isLHH = bats === 'L';

    function zoneBg(zoneId: string): string {
        const z = zones[zoneId];
        if (!z || z.count === 0 || maxCount === 0) return theme.colors.gray[100];
        return interpolateColor(z.count / maxCount);
    }

    const renderInner = (zoneId: string) => {
        const z = zones[zoneId];
        const bg = zoneBg(zoneId);
        const tc = bg === theme.colors.gray[100] ? theme.colors.gray[400] : zoneTextColor(bg);
        return (
            <InnerCell key={zoneId} style={{ backgroundColor: bg }}>
                <CellCount style={{ color: tc }}>{z?.count ?? 0}</CellCount>
                {z && z.count > 0 && <CellAvg style={{ color: tc }}>{z.avg.toFixed(2).replace('0.', '.')}</CellAvg>}
            </InnerCell>
        );
    };

    const renderOuter = (zoneId: string) => {
        const z = zones[zoneId];
        const bg = zoneBg(zoneId);
        const tc = bg === theme.colors.gray[100] ? theme.colors.gray[400] : zoneTextColor(bg);
        return (
            <OuterCell key={zoneId} style={{ backgroundColor: bg }}>
                <CellCount style={{ color: tc, fontSize: 8 }}>{z?.count ?? 0}</CellCount>
            </OuterCell>
        );
    };

    const innerRows = INNER_ZONES.map((row) => (isLHH ? [...row].reverse() : row));
    const outerTop = isLHH ? ['OTR', 'OT', 'OTL'] : ['OTL', 'OT', 'OTR'];
    const outerBot = isLHH ? ['OBR', 'OB', 'OBL'] : ['OBL', 'OB', 'OBR'];
    const outerLeft = isLHH ? ['OTR', 'OR', 'OBR'] : ['OTL', 'OL', 'OBL'];
    const outerRight = isLHH ? ['OTL', 'OL', 'OBL'] : ['OTR', 'OR', 'OBR'];

    return (
        <HeatWrapper>
            <HeatLabel>{isLHH ? 'LHH' : 'RHH'} · Pitch Location Heatmap</HeatLabel>
            <GridWrap>
                <TopRow>{outerTop.map(renderOuter)}</TopRow>
                <MiddleRow>
                    <SideCol>{outerLeft.map(renderOuter)}</SideCol>
                    <InnerGrid>
                        {innerRows.map((row, i) => (
                            <InnerRow key={i}>{row.map(renderInner)}</InnerRow>
                        ))}
                    </InnerGrid>
                    <SideCol>{outerRight.map(renderOuter)}</SideCol>
                </MiddleRow>
                <TopRow>{outerBot.map(renderOuter)}</TopRow>
            </GridWrap>
            <LegendRow>
                <LegendLabel>0</LegendLabel>
                <GradientBar>
                    {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                        <GradientSegment key={t} style={{ backgroundColor: interpolateColor(t) }} />
                    ))}
                </GradientBar>
                <LegendLabel>{maxCount}</LegendLabel>
            </LegendRow>
        </HeatWrapper>
    );
}

const HeatWrapper = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: `${theme.spacing.sm} 0`,
});

const HeatLabel = styled.p({
    fontSize: 11,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
    marginBottom: theme.spacing.xs,
});

const GridWrap = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    alignItems: 'center',
});

const TopRow = styled.div({
    display: 'flex',
    gap: 2,
    marginLeft: 30,
    marginRight: 30,
});

const MiddleRow = styled.div({
    display: 'flex',
    alignItems: 'stretch',
    gap: 2,
});

const SideCol = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
});

const InnerGrid = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
});

const InnerRow = styled.div({
    display: 'flex',
    gap: 2,
});

const BaseCell = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    border: `1px solid ${theme.colors.gray[200]}`,
});

const InnerCell = styled(BaseCell)({
    width: 42,
    height: 42,
});

const OuterCell = styled(BaseCell)({
    width: 28,
    height: 28,
});

const CellCount = styled.span({
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    lineHeight: 1.3,
});

const CellAvg = styled.span({
    fontSize: 8,
    lineHeight: 1.2,
    opacity: 0.85,
});

const LegendRow = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
});

const LegendLabel = styled.span({
    fontSize: 10,
    color: theme.colors.gray[500],
});

const GradientBar = styled.div({
    display: 'flex',
    width: 60,
    height: 10,
    borderRadius: 2,
    overflow: 'hidden',
});

const GradientSegment = styled.div({
    flex: 1,
});
