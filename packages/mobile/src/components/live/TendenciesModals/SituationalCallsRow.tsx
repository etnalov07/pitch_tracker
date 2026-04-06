import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SituationalCallType } from '@pitch-tracker/shared';

interface SitCall {
    type: SituationalCallType;
    abbrev: string;
    label: string;
    color: string;
}

const SITUATIONAL_CALLS: SitCall[] = [
    { type: 'pickoff', abbrev: 'PO', label: 'Pickoff', color: '#7c3aed' },
    { type: 'bunt_coverage', abbrev: 'BNT', label: 'Bunt Coverage', color: '#0891b2' },
    { type: '1st_3rd_coverage', abbrev: '1&3', label: '1st & 3rd', color: '#059669' },
    { type: 'shake', abbrev: 'SHK', label: 'Shake', color: '#d97706' },
];

interface SituationalCallsRowProps {
    shakeCount?: number;
    disabled?: boolean;
    onCallSent?: (type: SituationalCallType) => void;
}

const SituationalCallsRow: React.FC<SituationalCallsRowProps> = ({ shakeCount = 0, disabled, onCallSent }) => (
    <View style={styles.row}>
        <Text style={styles.label}>SITUATIONAL</Text>
        {SITUATIONAL_CALLS.map((call) => (
            <TouchableOpacity
                key={call.type}
                onPress={() => !disabled && onCallSent && onCallSent(call.type)}
                disabled={disabled}
                style={[styles.btn, { borderColor: call.color }]}
                activeOpacity={0.7}
            >
                <Text style={[styles.btnText, { color: call.color }]}>{call.abbrev}</Text>
                {call.type === 'shake' && shakeCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: call.color }]}>
                        <Text style={styles.badgeText}>{shakeCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        ))}
    </View>
);

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        marginTop: 4,
        flexWrap: 'wrap',
    },
    label: { fontSize: 9, color: '#9ca3af', fontWeight: '700', minWidth: 56 },
    btn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    btnText: { fontSize: 11, fontWeight: '700' },
    badge: {
        width: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
});

export default SituationalCallsRow;
