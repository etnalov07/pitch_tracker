import { PitchLocationHeatMap } from '@pitch-tracker/shared';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TendencyZoneGrid from '../TendenciesModals/TendencyZoneGrid';

interface Props {
    heatmap: PitchLocationHeatMap;
    bats?: string;
}

export default function HeatMapView({ heatmap, bats }: Props) {
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
        <View style={styles.wrapper}>
            <Text style={styles.label}>{bats === 'L' ? 'LHH' : 'RHH'} · Pitch Locations</Text>
            <TendencyZoneGrid cells={cells} lowColor="#dbeafe" highColor="#1d4ed8" />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        gap: 6,
    },
    label: {
        fontSize: 11,
        color: '#6b7280',
        fontStyle: 'italic',
    },
});
