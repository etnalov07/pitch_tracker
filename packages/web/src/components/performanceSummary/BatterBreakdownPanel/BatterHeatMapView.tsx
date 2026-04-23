import { PitchLocationHeatMap } from '@pitch-tracker/shared';
import React from 'react';
import TendencyZoneGrid from '../../live/TendencyZoneGrid/TendencyZoneGrid';

interface Props {
    heatmap: PitchLocationHeatMap;
    bats?: string;
}

export default function BatterHeatMapView({ heatmap, bats }: Props) {
    const zones = heatmap.zones ?? {};
    const allCounts = Object.values(zones).map((z) => z.count);
    const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 1;

    const cells = Object.entries(zones).map(([zone, data]) => ({
        zone,
        value: maxCount > 0 ? data.count / maxCount : 0,
        displayValue: String(data.count),
        count: data.count,
    }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                {bats === 'L' ? 'LHH' : 'RHH'} · Pitch Locations
            </span>
            <TendencyZoneGrid cells={cells} lowColor="#dbeafe" highColor="#1d4ed8" />
        </div>
    );
}
