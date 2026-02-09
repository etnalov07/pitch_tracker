import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { PlayerWithPitchTypes } from '@pitch-tracker/shared';

interface PlayerListItemProps {
    player: PlayerWithPitchTypes;
    onDelete: (player: PlayerWithPitchTypes) => void;
}

const PlayerListItem: React.FC<PlayerListItemProps> = ({ player, onDelete }) => (
    <View style={styles.rosterRow}>
        <Text style={styles.rosterJersey}>{player.jersey_number != null ? `#${player.jersey_number}` : '-'}</Text>
        <View style={styles.rosterNameCol}>
            <Text style={styles.rosterName} numberOfLines={1}>
                {player.first_name} {player.last_name}
            </Text>
        </View>
        <Text style={styles.rosterType}>{player.throws === 'L' ? 'LHP' : 'RHP'}</Text>
        <IconButton
            icon="trash-can-outline"
            size={18}
            iconColor="#9ca3af"
            onPress={() => onDelete(player)}
            style={styles.deleteButton}
        />
    </View>
);

const styles = StyleSheet.create({
    rosterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    rosterJersey: {
        width: 40,
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    rosterNameCol: {
        flex: 1,
    },
    rosterName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111827',
    },
    rosterType: {
        width: 36,
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        textAlign: 'center',
    },
    deleteButton: {
        margin: 0,
        width: 34,
        height: 34,
    },
});

export default PlayerListItem;
