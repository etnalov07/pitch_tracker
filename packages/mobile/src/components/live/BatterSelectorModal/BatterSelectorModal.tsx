import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Button, Modal } from 'react-native-paper';
import { OpponentLineupPlayer } from '@pitch-tracker/shared';

interface BatterSelectorModalProps {
    visible: boolean;
    onDismiss: () => void;
    activeBatters: OpponentLineupPlayer[];
    currentBatter: OpponentLineupPlayer | null;
    onSelectBatter: (batter: OpponentLineupPlayer) => void;
    isTablet?: boolean;
}

const BatterSelectorModal: React.FC<BatterSelectorModalProps> = ({
    visible,
    onDismiss,
    activeBatters,
    currentBatter,
    onSelectBatter,
    isTablet,
}) => {
    return (
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}>
            <Text variant="titleLarge" style={styles.modalTitle}>
                Select Batter
            </Text>
            <ScrollView style={styles.playerList}>
                {activeBatters.length === 0 ? (
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
            <Button onPress={onDismiss} style={styles.modalClose}>
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
});

export default BatterSelectorModal;
