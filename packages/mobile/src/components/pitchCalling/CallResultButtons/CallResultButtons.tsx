import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import * as Haptics from '../../../utils/haptics';
import { PitchCallResult } from '@pitch-tracker/shared';

interface CallResultButtonsProps {
    onResult: (result: PitchCallResult) => void;
    disabled?: boolean;
}

const RESULTS: { id: PitchCallResult; label: string; color: string }[] = [
    { id: 'strike', label: 'Strike', color: '#E63946' },
    { id: 'ball', label: 'Ball', color: '#3A86FF' },
    { id: 'foul', label: 'Foul', color: '#EAB308' },
    { id: 'in_play', label: 'In Play', color: '#2EC4B6' },
];

const CallResultButtons: React.FC<CallResultButtonsProps> = ({ onResult, disabled = false }) => {
    const handlePress = (result: PitchCallResult) => {
        if (disabled) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onResult(result);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>LOG RESULT</Text>
            <View style={styles.row}>
                {RESULTS.map(({ id, label, color }) => (
                    <Pressable
                        key={id}
                        style={[styles.button, { borderColor: color }, disabled && styles.disabled]}
                        onPress={() => handlePress(id)}
                        disabled={disabled}
                    >
                        <Text style={[styles.text, { color }]}>{label}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {},
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9ca3af',
        letterSpacing: 1,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    text: {
        fontSize: 13,
        fontWeight: '700',
    },
    disabled: {
        opacity: 0.5,
    },
});

export default CallResultButtons;
