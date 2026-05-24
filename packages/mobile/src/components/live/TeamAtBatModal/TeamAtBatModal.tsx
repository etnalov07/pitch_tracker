import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text, Button, Modal, useTheme } from 'react-native-paper';

interface TeamAtBatModalProps {
    visible: boolean;
    inning: number;
    inningHalf: string;
    teamRunsScored: string;
    onRunsChange: (value: string) => void;
    onConfirm: () => void;
    onDismiss: () => void;
    isTablet?: boolean;
}

const TeamAtBatModal: React.FC<TeamAtBatModalProps> = ({
    visible,
    inning,
    inningHalf,
    teamRunsScored,
    onRunsChange,
    onConfirm,
    onDismiss,
    isTablet,
}) => {
    const theme = useTheme();
    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }, isTablet && styles.modalTablet]}
        >
            <Text variant="titleLarge" style={styles.modalTitle}>
                Your Team At Bat
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
                {inningHalf === 'top' ? 'Top' : 'Bottom'} of Inning {inning}
                {'\n'}Enter your team's runs scored
            </Text>
            <Text style={[styles.runsLabel, { color: theme.colors.onSurfaceVariant }]}>Runs Scored</Text>
            <TextInput
                style={[styles.runsInput, { color: theme.colors.onSurface }]}
                value={teamRunsScored}
                onChangeText={onRunsChange}
                keyboardType="number-pad"
                selectTextOnFocus
            />
            <View style={styles.buttonRow}>
                <Button mode="text" onPress={onDismiss} style={styles.dismissButton}>
                    Cancel
                </Button>
                <Button mode="contained" onPress={onConfirm} style={styles.confirmButton}>
                    Continue
                </Button>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { margin: 20, padding: 20, borderRadius: 12, maxHeight: '80%' },
    modalTablet: { maxWidth: 400, alignSelf: 'center', width: '100%' },
    modalTitle: { marginBottom: 16, textAlign: 'center' },
    infoText: { fontSize: 16, textAlign: 'center', marginBottom: 16, lineHeight: 24 },
    runsLabel: { fontSize: 14, marginBottom: 8 },
    runsInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 24,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 16,
    },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
    dismissButton: {},
    confirmButton: {},
});

export default TeamAtBatModal;
