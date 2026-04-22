import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Modal, TextInput, SegmentedButtons, Chip } from 'react-native-paper';
import * as Haptics from '../../utils/haptics';
import { useAppDispatch, addPlayer, updatePlayer, setPlayerPitchTypes } from '../../state';
import { PlayerWithPitchTypes, PlayerPosition, HandednessType, ThrowingHand } from '@pitch-tracker/shared';
import { teamsApi } from '../../state/teams/api/teamsApi';

const POSITIONS: PlayerPosition[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'];

const PITCH_TYPES: { value: string; label: string }[] = [
    { value: 'fastball', label: 'Fastball' },
    { value: '4-seam', label: '4-Seam' },
    { value: '2-seam', label: '2-Seam' },
    { value: 'cutter', label: 'Cutter' },
    { value: 'sinker', label: 'Sinker' },
    { value: 'slider', label: 'Slider' },
    { value: 'curveball', label: 'Curveball' },
    { value: 'changeup', label: 'Changeup' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'knuckleball', label: 'Knuckle' },
];

interface AddPlayerModalProps {
    visible: boolean;
    onDismiss: () => void;
    teamId: string;
    isTablet: boolean;
    editingPlayer?: PlayerWithPitchTypes | null;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ visible, onDismiss, teamId, isTablet, editingPlayer }) => {
    const dispatch = useAppDispatch();
    const isEditing = !!editingPlayer;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [primaryPosition, setPrimaryPosition] = useState<PlayerPosition>('P');
    const [secondaryPosition, setSecondaryPosition] = useState<PlayerPosition | ''>('');
    const [bats, setBats] = useState<HandednessType>('R');
    const [throws, setThrows] = useState<ThrowingHand>('R');
    const [selectedPitchTypes, setSelectedPitchTypes] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const isPitcher = primaryPosition === 'P' || secondaryPosition === 'P';

    useEffect(() => {
        if (visible && editingPlayer) {
            setFirstName(editingPlayer.first_name);
            setLastName(editingPlayer.last_name);
            setJerseyNumber(editingPlayer.jersey_number?.toString() ?? '');
            setPrimaryPosition(editingPlayer.primary_position);
            setSecondaryPosition(editingPlayer.secondary_position ?? '');
            setBats(editingPlayer.bats);
            setThrows(editingPlayer.throws);
            if (editingPlayer.pitch_types) {
                setSelectedPitchTypes(editingPlayer.pitch_types);
            } else {
                teamsApi
                    .getPitchTypes(editingPlayer.id)
                    .then(setSelectedPitchTypes)
                    .catch(() => {});
            }
        } else if (visible && !editingPlayer) {
            resetForm();
        }
    }, [visible, editingPlayer]);

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setJerseyNumber('');
        setPrimaryPosition('P');
        setSecondaryPosition('');
        setBats('R');
        setThrows('R');
        setSelectedPitchTypes([]);
    };

    const togglePitchType = (value: string) => {
        Haptics.selectionAsync();
        setSelectedPitchTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
    };

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please enter first and last name');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSaving(true);
        try {
            const playerData = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                jersey_number: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
                primary_position: primaryPosition,
                secondary_position: secondaryPosition || undefined,
                bats,
                throws,
            };

            let playerId: string;

            if (isEditing) {
                await dispatch(updatePlayer({ playerId: editingPlayer!.id, data: playerData })).unwrap();
                playerId = editingPlayer!.id;
            } else {
                const result = await dispatch(addPlayer({ teamId, data: playerData })).unwrap();
                playerId = result.id;
            }

            if (isPitcher) {
                await dispatch(setPlayerPitchTypes({ playerId, pitchTypes: selectedPitchTypes })).unwrap();
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDismiss();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', isEditing ? 'Failed to update player' : 'Failed to add player');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}>
            <ScrollView keyboardShouldPersistTaps="handled">
                <Text variant="titleLarge" style={styles.modalTitle}>
                    {isEditing ? 'Edit Player' : 'Add Player'}
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

                <Text variant="labelMedium" style={styles.fieldLabel}>
                    Primary Position
                </Text>
                <View style={styles.positionGrid}>
                    {POSITIONS.map((pos) => (
                        <Chip
                            key={pos}
                            selected={primaryPosition === pos}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setPrimaryPosition(pos);
                                if (secondaryPosition === pos) setSecondaryPosition('');
                            }}
                            style={styles.positionChip}
                            compact
                        >
                            {pos}
                        </Chip>
                    ))}
                </View>

                <Text variant="labelMedium" style={styles.fieldLabel}>
                    Secondary Position <Text style={styles.optional}>(optional)</Text>
                </Text>
                <View style={styles.positionGrid}>
                    {POSITIONS.filter((pos) => pos !== primaryPosition).map((pos) => (
                        <Chip
                            key={pos}
                            selected={secondaryPosition === pos}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setSecondaryPosition((prev) => (prev === pos ? '' : pos));
                            }}
                            style={styles.positionChip}
                            compact
                        >
                            {pos}
                        </Chip>
                    ))}
                </View>

                <Text variant="labelMedium" style={styles.fieldLabel}>
                    Bats
                </Text>
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

                {isPitcher && (
                    <>
                        <Text variant="labelMedium" style={styles.fieldLabel}>
                            Throws
                        </Text>
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

                        <Text variant="labelMedium" style={styles.fieldLabel}>
                            Pitch Types
                        </Text>
                        <View style={styles.pitchTypesGrid}>
                            {PITCH_TYPES.map(({ value, label }) => (
                                <Chip
                                    key={value}
                                    selected={selectedPitchTypes.includes(value)}
                                    onPress={() => togglePitchType(value)}
                                    style={styles.pitchChip}
                                    compact
                                >
                                    {label}
                                </Chip>
                            ))}
                        </View>
                    </>
                )}

                <View style={styles.modalActions}>
                    <Button onPress={onDismiss}>Cancel</Button>
                    <Button
                        mode="contained"
                        onPress={handleSave}
                        loading={saving}
                        disabled={saving || !firstName.trim() || !lastName.trim()}
                    >
                        {isEditing ? 'Save Changes' : 'Add Player'}
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
        maxHeight: '90%',
    },
    modalTablet: {
        maxWidth: 560,
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
    optional: {
        color: '#9ca3af',
        fontWeight: '400',
    },
    positionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16,
    },
    positionChip: {
        marginBottom: 0,
    },
    segmented: {
        marginBottom: 16,
    },
    pitchTypesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16,
    },
    pitchChip: {
        marginBottom: 0,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
});

export default AddPlayerModal;
