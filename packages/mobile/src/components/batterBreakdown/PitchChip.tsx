import { BatterAtBatPitch, PitchCallZone, PitchResult, PitchType } from '@pitch-tracker/shared';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const PITCH_ABBREV: Record<PitchType, string> = {
    fastball: 'FB',
    '2-seam': '2S',
    '4-seam': '4S',
    cutter: 'CT',
    sinker: 'SK',
    slider: 'SL',
    curveball: 'CB',
    changeup: 'CH',
    splitter: 'SP',
    knuckleball: 'KN',
    screwball: 'SC',
    other: 'OT',
};

export const RESULT_COLOR: Record<PitchResult, { bg: string; text: string }> = {
    ball: { bg: '#dbeafe', text: '#1d4ed8' },
    called_strike: { bg: '#fee2e2', text: '#dc2626' },
    swinging_strike: { bg: '#dc2626', text: '#ffffff' },
    foul: { bg: '#fef3c7', text: '#92400e' },
    in_play: { bg: '#dcfce7', text: '#166534' },
    hit_by_pitch: { bg: '#f3e8ff', text: '#6d28d9' },
};

const RESULT_LABEL: Record<PitchResult, string> = {
    ball: 'B',
    called_strike: 'K',
    swinging_strike: 'SW',
    foul: 'F',
    in_play: 'IP',
    hit_by_pitch: 'HBP',
};

function getLocationLabel(zone?: PitchCallZone): string | null {
    if (!zone) return null;
    if (zone.startsWith('W-')) {
        const parts = zone.slice(2).split('-');
        if (parts.length === 1) {
            if (parts[0] === 'high') return 'High';
            if (parts[0] === 'low') return 'Low';
            if (parts[0] === 'in') return 'In';
            if (parts[0] === 'out') return 'Out';
        } else {
            const v = parts[0] === 'high' ? 'Hi' : 'Lo';
            const h = parts[1] === 'in' ? 'In' : 'Out';
            return `${v}-${h}`;
        }
    }
    const col = parseInt(zone.split('-')[1]);
    if (isNaN(col)) return null;
    if (col === 1) return 'Mid';
    return col === 0 ? 'In' : 'Out';
}

interface Props {
    pitch: BatterAtBatPitch;
}

const PitchChip: React.FC<Props> = ({ pitch }) => {
    const colors = RESULT_COLOR[pitch.pitch_result];
    const abbrev = PITCH_ABBREV[pitch.pitch_type] ?? pitch.pitch_type.slice(0, 2).toUpperCase();
    const locationLabel = getLocationLabel(pitch.target_zone);

    return (
        <View style={[styles.chip, { backgroundColor: colors.bg }, pitch.is_ab_ending && styles.endingChip]}>
            <Text style={[styles.line, { color: colors.text, fontSize: 9 }]}>
                {pitch.balls_before}-{pitch.strikes_before}
            </Text>
            <Text style={[styles.line, { color: colors.text, fontSize: 13, fontWeight: '700' }]}>{abbrev}</Text>
            <Text style={[styles.line, { color: colors.text, fontSize: 9 }]}>{RESULT_LABEL[pitch.pitch_result]}</Text>
            {pitch.velocity != null && (
                <Text style={[styles.line, { color: colors.text, fontSize: 9 }]}>{Math.round(pitch.velocity)}</Text>
            )}
            {locationLabel != null && <Text style={[styles.line, { color: colors.text, fontSize: 9 }]}>{locationLabel}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    chip: {
        width: 44,
        paddingVertical: 4,
        paddingHorizontal: 2,
        marginRight: 4,
        marginBottom: 4,
        borderRadius: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    endingChip: {
        borderColor: '#eab308',
        borderWidth: 2,
    },
    line: {
        textAlign: 'center',
        lineHeight: 12,
    },
});

export default PitchChip;
