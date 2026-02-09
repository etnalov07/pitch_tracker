import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Text, Button, Modal } from 'react-native-paper';

interface InningChangeModalProps {
    visible: boolean;
    inningChangeInfo: { inning: number; half: string } | null;
    teamRunsScored: string;
    onRunsChange: (value: string) => void;
    onConfirm: () => void;
    isTablet?: boolean;
}

const InningChangeModal: React.FC<InningChangeModalProps> = ({
    visible,
    inningChangeInfo,
    teamRunsScored,
    onRunsChange,
    onConfirm,
    isTablet,
}) => {
    return (
        <Modal visible={visible} onDismiss={() => {}} contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}>
            <Text variant="titleLarge" style={styles.modalTitle}>
                Inning Over
            </Text>
            <Text style={styles.inningChangeText}>
                3 outs recorded.{'\n'}
                {inningChangeInfo && `End of ${inningChangeInfo.half === 'top' ? 'Top' : 'Bottom'} ${inningChangeInfo.inning}`}
            </Text>
            <Text style={styles.runsLabel}>Runs scored by your team this inning:</Text>
            <TextInput
                style={styles.runsInput}
                value={teamRunsScored}
                onChangeText={onRunsChange}
                keyboardType="number-pad"
                selectTextOnFocus
            />
            <Button mode="contained" onPress={onConfirm} style={styles.inningChangeButton}>
                Next Inning
            </Button>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { backgroundColor: '#ffffff', margin: 20, padding: 20, borderRadius: 12, maxHeight: '80%' },
    modalTablet: { maxWidth: 400, alignSelf: 'center', width: '100%' },
    modalTitle: { marginBottom: 16 },
    inningChangeText: { fontSize: 16, color: '#374151', textAlign: 'center', marginBottom: 16, lineHeight: 24 },
    runsLabel: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
    runsInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 24,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#111827',
    },
    inningChangeButton: { marginTop: 4 },
});

export default InningChangeModal;
