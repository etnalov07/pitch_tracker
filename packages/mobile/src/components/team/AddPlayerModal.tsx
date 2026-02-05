import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
    Text,
    Button,
    Modal,
    TextInput,
    SegmentedButtons,
} from 'react-native-paper';
import * as Haptics from '../../utils/haptics';
import { useAppDispatch, addPlayer } from '../../state';
import { ThrowingHand } from '@pitch-tracker/shared';

interface AddPlayerModalProps {
    visible: boolean;
    onDismiss: () => void;
    teamId: string;
    isTablet: boolean;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ visible, onDismiss, teamId, isTablet }) => {
    const dispatch = useAppDispatch();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [throws, setThrows] = useState<ThrowingHand>('R');
    const [creating, setCreating] = useState(false);

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setJerseyNumber('');
        setThrows('R');
    };

    const handleAddPlayer = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please enter first and last name');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCreating(true);
        try {
            await dispatch(addPlayer({
                teamId,
                data: {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    jersey_number: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
                    primary_position: 'P',
                    throws,
                    bats: 'R',
                },
            })).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDismiss();
            resetForm();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to add pitcher');
        } finally {
            setCreating(false);
        }
    };

    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}
        >
            <ScrollView>
                <Text variant="titleLarge" style={styles.modalTitle}>
                    Add Pitcher
                </Text>
                <View style={styles.nameRow}>
                    <TextInput
                        label="First Name"
                        value={firstName}
                        onChangeText={setFirstName}
                        mode="outlined"
                        style={[styles.input, styles.nameInput]}
                    />
                    <TextInput
                        label="Last Name"
                        value={lastName}
                        onChangeText={setLastName}
                        mode="outlined"
                        style={[styles.input, styles.nameInput]}
                    />
                </View>
                <TextInput
                    label="Jersey Number"
                    value={jerseyNumber}
                    onChangeText={setJerseyNumber}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                />
                <Text variant="labelMedium" style={styles.fieldLabel}>Pitcher Type</Text>
                <SegmentedButtons
                    value={throws}
                    onValueChange={(v) => {
                        Haptics.selectionAsync();
                        setThrows(v as ThrowingHand);
                    }}
                    buttons={[
                        { value: 'R', label: 'RHP' },
                        { value: 'L', label: 'LHP' },
                    ]}
                    style={styles.segmented}
                />
                <View style={styles.modalActions}>
                    <Button onPress={onDismiss}>Cancel</Button>
                    <Button
                        mode="contained"
                        onPress={handleAddPlayer}
                        loading={creating}
                        disabled={creating || !firstName.trim() || !lastName.trim()}
                    >
                        Add Pitcher
                    </Button>
                </View>
            </ScrollView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        backgroundColor: '#ffffff',
        margin: 20,
        padding: 20,
        borderRadius: 12,
        maxHeight: '80%',
    },
    modalTablet: {
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    modalTitle: {
        marginBottom: 16,
    },
    nameRow: {
        flexDirection: 'row',
        gap: 12,
    },
    nameInput: {
        flex: 1,
    },
    input: {
        marginBottom: 12,
    },
    fieldLabel: {
        marginBottom: 8,
        color: '#374151',
    },
    segmented: {
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
});

export default AddPlayerModal;
