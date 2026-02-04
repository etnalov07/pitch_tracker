import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
    Text,
    Button,
    Modal,
    TextInput,
    Chip,
    SegmentedButtons,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useAppDispatch, addPlayer } from '../../state';
import { PlayerPosition, HandednessType, ThrowingHand } from '@pitch-tracker/shared';

const POSITIONS: PlayerPosition[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'];

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
    const [position, setPosition] = useState<PlayerPosition>('P');
    const [throws, setThrows] = useState<ThrowingHand>('R');
    const [bats, setBats] = useState<HandednessType>('R');
    const [creating, setCreating] = useState(false);

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setJerseyNumber('');
        setPosition('P');
        setThrows('R');
        setBats('R');
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
                    primary_position: position,
                    throws,
                    bats,
                },
            })).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDismiss();
            resetForm();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to add player');
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
                    Add Player
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
                <Text variant="labelMedium" style={styles.fieldLabel}>Position</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <View style={styles.chipRow}>
                        {POSITIONS.map((pos) => (
                            <Chip
                                key={pos}
                                selected={position === pos}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setPosition(pos);
                                }}
                                style={styles.positionChip}
                            >
                                {pos}
                            </Chip>
                        ))}
                    </View>
                </ScrollView>
                <Text variant="labelMedium" style={styles.fieldLabel}>Throws</Text>
                <SegmentedButtons
                    value={throws}
                    onValueChange={(v) => {
                        Haptics.selectionAsync();
                        setThrows(v as ThrowingHand);
                    }}
                    buttons={[
                        { value: 'R', label: 'Right' },
                        { value: 'L', label: 'Left' },
                    ]}
                    style={styles.segmented}
                />
                <Text variant="labelMedium" style={styles.fieldLabel}>Bats</Text>
                <SegmentedButtons
                    value={bats}
                    onValueChange={(v) => {
                        Haptics.selectionAsync();
                        setBats(v as HandednessType);
                    }}
                    buttons={[
                        { value: 'R', label: 'Right' },
                        { value: 'L', label: 'Left' },
                        { value: 'S', label: 'Switch' },
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
                        Add Player
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
    chipScroll: {
        marginBottom: 12,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
    },
    positionChip: {
        marginRight: 4,
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
