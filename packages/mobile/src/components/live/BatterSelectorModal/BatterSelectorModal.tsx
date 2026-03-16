import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Keyboard } from 'react-native';
import { Text, Button, Modal, TextInput, SegmentedButtons, IconButton } from 'react-native-paper';
import { OpponentLineupPlayer } from '@pitch-tracker/shared';
import api from '../../../services/api';

type FormMode = 'add' | 'edit' | 'substitute';

interface BatterSelectorModalProps {
    visible: boolean;
    onDismiss: () => void;
    activeBatters: OpponentLineupPlayer[];
    currentBatter: OpponentLineupPlayer | null;
    onSelectBatter: (batter: OpponentLineupPlayer) => void;
    isTablet?: boolean;
    gameId: string;
    onBatterAdded: (batter: OpponentLineupPlayer) => void;
}

const BatterSelectorModal: React.FC<BatterSelectorModalProps> = ({
    visible,
    onDismiss,
    activeBatters,
    currentBatter,
    onSelectBatter,
    isTablet,
    gameId,
    onBatterAdded,
}) => {
    const [formMode, setFormMode] = useState<FormMode | null>(null);
    const [editingBatter, setEditingBatter] = useState<OpponentLineupPlayer | null>(null);
    const [newName, setNewName] = useState('');
    const [newBattingOrder, setNewBattingOrder] = useState('1');
    const [newPosition, setNewPosition] = useState('');
    const [newBats, setNewBats] = useState<'R' | 'L' | 'S'>('R');
    const [subInning, setSubInning] = useState('');
    const [saving, setSaving] = useState(false);

    const usedOrders = new Set(activeBatters.map((b) => b.batting_order));
    const getNextAvailableOrder = (): string => {
        for (let i = 1; i <= 9; i++) {
            if (!usedOrders.has(i)) return String(i);
        }
        return '1';
    };

    const resetForm = () => {
        setFormMode(null);
        setEditingBatter(null);
        setNewName('');
        setNewBattingOrder('1');
        setNewPosition('');
        setNewBats('R');
        setSubInning('');
    };

    const handleShowAddForm = () => {
        setNewBattingOrder(getNextAvailableOrder());
        setFormMode('add');
    };

    const handleShowEditForm = (batter: OpponentLineupPlayer) => {
        setEditingBatter(batter);
        setNewName(batter.player_name);
        setNewPosition(batter.position || '');
        setNewBats((batter.bats as 'R' | 'L' | 'S') || 'R');
        setFormMode('edit');
    };

    const handleShowSubForm = (batter: OpponentLineupPlayer) => {
        setEditingBatter(batter);
        setNewName('');
        setNewPosition(batter.position || '');
        setNewBats((batter.bats as 'R' | 'L' | 'S') || 'R');
        setSubInning('');
        setFormMode('substitute');
    };

    const handleSaveNewBatter = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const response = await api.post<{ player: OpponentLineupPlayer }>(`/opponent-lineup/game/${gameId}`, {
                player_name: newName.trim(),
                batting_order: parseInt(newBattingOrder, 10),
                position: newPosition.trim() || null,
                bats: newBats,
                is_starter: false,
                inning_entered: null,
            });
            onBatterAdded(response.data.player);
            resetForm();
        } catch (error) {
            console.error('Failed to add batter:', error);
            Alert.alert('Error', 'Failed to add batter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleEditBatter = async () => {
        if (!editingBatter || !newName.trim()) return;
        setSaving(true);
        try {
            await api.put<{ player: OpponentLineupPlayer }>(`/opponent-lineup/player/${editingBatter.id}`, {
                player_name: newName.trim(),
                position: newPosition.trim() || null,
                bats: newBats,
            });
            onBatterAdded(null as unknown as OpponentLineupPlayer); // triggers refetch
            resetForm();
        } catch (error) {
            console.error('Failed to update batter:', error);
            Alert.alert('Error', 'Failed to update batter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSubstituteBatter = async () => {
        if (!editingBatter || !newName.trim() || !subInning.trim()) return;
        setSaving(true);
        try {
            await api.post<{ player: OpponentLineupPlayer }>(`/opponent-lineup/player/${editingBatter.id}/substitute`, {
                new_player_name: newName.trim(),
                inning_entered: parseInt(subInning, 10),
                position: newPosition.trim() || null,
                bats: newBats,
            });
            onBatterAdded(null as unknown as OpponentLineupPlayer); // triggers refetch
            resetForm();
        } catch (error) {
            console.error('Failed to substitute batter:', error);
            Alert.alert('Error', 'Failed to substitute batter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        if (formMode === 'add') handleSaveNewBatter();
        else if (formMode === 'edit') handleEditBatter();
        else if (formMode === 'substitute') handleSubstituteBatter();
    };

    const handleDismiss = () => {
        resetForm();
        onDismiss();
    };

    const formTitle = formMode === 'edit' ? 'Edit Batter' : formMode === 'substitute' ? 'Substitute Batter' : 'Add Batter';
    const saveDisabled = saving || !newName.trim() || (formMode === 'substitute' && !subInning.trim());

    return (
        <Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}>
            <Pressable onPress={Keyboard.dismiss} style={styles.modalInner}>
                <Text variant="titleLarge" style={styles.modalTitle}>
                    Select Batter
                </Text>
                <ScrollView style={styles.playerList} keyboardShouldPersistTaps="handled">
                    {activeBatters.length === 0 && !formMode ? (
                        <Text variant="bodyMedium" style={styles.emptyText}>
                            No opponent lineup found. Set up the opponent lineup before starting.
                        </Text>
                    ) : (
                        activeBatters.map((batter) => (
                            <Pressable
                                key={batter.id}
                                style={[styles.playerOption, currentBatter?.id === batter.id && styles.playerOptionSelected]}
                                onPress={() => onSelectBatter(batter)}
                            >
                                <View style={styles.batterOptionRow}>
                                    <View style={styles.batterOrder}>
                                        <Text style={styles.batterOrderText}>{batter.batting_order}</Text>
                                    </View>
                                    <View style={styles.playerOptionInfo}>
                                        <Text style={styles.playerOptionName}>{batter.player_name}</Text>
                                        <Text style={styles.playerOptionDetail}>
                                            {batter.position || 'Unknown'}
                                            {batter.bats ? ` · Bats ${batter.bats}` : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.actionButtons}>
                                        <IconButton
                                            icon="pencil"
                                            size={18}
                                            onPress={() => handleShowEditForm(batter)}
                                            style={styles.actionIcon}
                                        />
                                        <IconButton
                                            icon="account-switch"
                                            size={18}
                                            onPress={() => handleShowSubForm(batter)}
                                            style={styles.actionIcon}
                                        />
                                    </View>
                                </View>
                            </Pressable>
                        ))
                    )}
                </ScrollView>

                {formMode ? (
                    <View style={styles.addForm}>
                        <Text variant="titleSmall" style={styles.formTitle}>
                            {formTitle}
                        </Text>
                        {formMode === 'substitute' && editingBatter && (
                            <Text variant="bodySmall" style={styles.subLabel}>
                                Replacing: {editingBatter.player_name} (#{editingBatter.batting_order})
                            </Text>
                        )}
                        <TextInput
                            label="Player Name"
                            mode="outlined"
                            value={newName}
                            onChangeText={setNewName}
                            dense
                            autoFocus
                            style={styles.formInput}
                        />
                        <View style={styles.formRow}>
                            {formMode === 'add' && (
                                <TextInput
                                    label="Order (1-9)"
                                    mode="outlined"
                                    value={newBattingOrder}
                                    onChangeText={(text) => {
                                        const n = parseInt(text, 10);
                                        if (!text || (n >= 1 && n <= 9)) setNewBattingOrder(text);
                                    }}
                                    keyboardType="number-pad"
                                    dense
                                    style={styles.formInputSmall}
                                />
                            )}
                            {formMode === 'substitute' && (
                                <TextInput
                                    label="Inning"
                                    mode="outlined"
                                    value={subInning}
                                    onChangeText={(text) => {
                                        const n = parseInt(text, 10);
                                        if (!text || (n >= 1 && n <= 20)) setSubInning(text);
                                    }}
                                    keyboardType="number-pad"
                                    dense
                                    style={styles.formInputSmall}
                                />
                            )}
                            <TextInput
                                label="Position"
                                mode="outlined"
                                value={newPosition}
                                onChangeText={setNewPosition}
                                placeholder="e.g. SS, CF"
                                dense
                                style={styles.formInputSmall}
                            />
                        </View>
                        <Text variant="labelMedium" style={styles.batsLabel}>
                            Bats
                        </Text>
                        <SegmentedButtons
                            value={newBats}
                            onValueChange={(value) => setNewBats(value as 'R' | 'L' | 'S')}
                            buttons={[
                                { value: 'R', label: 'Right' },
                                { value: 'L', label: 'Left' },
                                { value: 'S', label: 'Switch' },
                            ]}
                            density="small"
                            style={styles.segmented}
                        />
                        <View style={styles.formActions}>
                            <Button mode="text" onPress={resetForm} disabled={saving}>
                                Cancel
                            </Button>
                            <Button mode="contained" onPress={handleSave} disabled={saveDisabled} loading={saving}>
                                Save
                            </Button>
                        </View>
                    </View>
                ) : (
                    <Button mode="outlined" onPress={handleShowAddForm} style={styles.addButton} icon="plus">
                        Add Batter
                    </Button>
                )}

                <Button onPress={handleDismiss} style={styles.modalClose}>
                    Cancel
                </Button>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { backgroundColor: '#ffffff', margin: 20, borderRadius: 12, maxHeight: '90%' },
    modalInner: { padding: 20, flex: 1 },
    modalTablet: { maxWidth: 400, alignSelf: 'center', width: '100%' },
    modalTitle: { marginBottom: 16 },
    modalClose: { marginTop: 8 },
    playerList: { flexGrow: 1, flexShrink: 1, minHeight: 300 },
    playerOption: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    playerOptionSelected: { backgroundColor: '#eff6ff' },
    playerOptionInfo: { flex: 1, gap: 2 },
    playerOptionName: { fontSize: 16, fontWeight: '600', color: '#111827' },
    playerOptionDetail: { fontSize: 13, color: '#6b7280' },
    batterOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    batterOrder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    batterOrderText: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
    actionButtons: { flexDirection: 'row', marginLeft: 'auto' },
    actionIcon: { margin: 0 },
    emptyText: { textAlign: 'center', color: '#6b7280', padding: 24 },
    addForm: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    formTitle: { color: '#111827' },
    subLabel: { color: '#6b7280', fontStyle: 'italic' },
    formInput: { backgroundColor: '#ffffff' },
    formRow: { flexDirection: 'row', gap: 8 },
    formInputSmall: { flex: 1, backgroundColor: '#ffffff' },
    batsLabel: { marginTop: 4, color: '#374151' },
    segmented: { marginBottom: 4 },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    addButton: { marginTop: 12 },
});

export default BatterSelectorModal;
