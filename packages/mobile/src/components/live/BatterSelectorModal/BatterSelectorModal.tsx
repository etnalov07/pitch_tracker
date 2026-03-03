import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text, Button, Modal, TextInput, SegmentedButtons } from 'react-native-paper';
import { OpponentLineupPlayer } from '@pitch-tracker/shared';
import api from '../../../services/api';

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
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBattingOrder, setNewBattingOrder] = useState('1');
    const [newPosition, setNewPosition] = useState('');
    const [newBats, setNewBats] = useState<'R' | 'L' | 'S'>('R');
    const [saving, setSaving] = useState(false);

    const usedOrders = new Set(activeBatters.map((b) => b.batting_order));
    const getNextAvailableOrder = (): string => {
        for (let i = 1; i <= 9; i++) {
            if (!usedOrders.has(i)) return String(i);
        }
        return '1';
    };

    const handleShowAddForm = () => {
        setNewBattingOrder(getNextAvailableOrder());
        setShowAddForm(true);
    };

    const handleCancelAdd = () => {
        setShowAddForm(false);
        setNewName('');
        setNewBattingOrder('1');
        setNewPosition('');
        setNewBats('R');
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
            handleCancelAdd();
        } catch (error) {
            console.error('Failed to add batter:', error);
            Alert.alert('Error', 'Failed to add batter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDismiss = () => {
        handleCancelAdd();
        onDismiss();
    };

    return (
        <Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}>
            <Text variant="titleLarge" style={styles.modalTitle}>
                Select Batter
            </Text>
            <ScrollView style={styles.playerList}>
                {activeBatters.length === 0 && !showAddForm ? (
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
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            {showAddForm ? (
                <View style={styles.addForm}>
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
                        <Button mode="text" onPress={handleCancelAdd} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSaveNewBatter}
                            disabled={saving || !newName.trim()}
                            loading={saving}
                        >
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
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { backgroundColor: '#ffffff', margin: 20, padding: 20, borderRadius: 12, maxHeight: '80%' },
    modalTablet: { maxWidth: 400, alignSelf: 'center', width: '100%' },
    modalTitle: { marginBottom: 16 },
    modalClose: { marginTop: 8 },
    playerList: { maxHeight: 400 },
    playerOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    playerOptionSelected: { backgroundColor: '#eff6ff' },
    playerOptionInfo: { gap: 2 },
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
    formInput: { backgroundColor: '#ffffff' },
    formRow: { flexDirection: 'row', gap: 8 },
    formInputSmall: { flex: 1, backgroundColor: '#ffffff' },
    batsLabel: { marginTop: 4, color: '#374151' },
    segmented: { marginBottom: 4 },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    addButton: { marginTop: 12 },
});

export default BatterSelectorModal;
