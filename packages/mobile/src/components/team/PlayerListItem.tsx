import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { PlayerWithPitchTypes } from '@pitch-tracker/shared';

const getPositionColor = (pos: string): string => {
    switch (pos) {
        case 'P': return '#ef4444';
        case 'C': return '#3b82f6';
        case '1B': return '#22c55e';
        case '2B': return '#16a34a';
        case '3B': return '#eab308';
        case 'SS': return '#15803d';
        case 'LF': return '#2563eb';
        case 'CF': return '#1d4ed8';
        case 'RF': return '#3b82f6';
        case 'DH': return '#6b7280';
        default: return '#6b7280';
    }
};

interface PlayerListItemProps {
    player: PlayerWithPitchTypes;
    onDelete: (player: PlayerWithPitchTypes) => void;
}

const PlayerListItem: React.FC<PlayerListItemProps> = ({ player, onDelete }) => (
    <View style={styles.rosterRow}>
        <Text style={styles.rosterJersey}>
            {player.jersey_number != null ? `#${player.jersey_number}` : '-'}
        </Text>
        <View style={styles.rosterNameCol}>
            <Text style={styles.rosterName} numberOfLines={1}>
                {player.first_name} {player.last_name}
            </Text>
        </View>
        <View style={[styles.posBadge, { backgroundColor: getPositionColor(player.primary_position) }]}>
            <Text style={styles.posBadgeText}>{player.primary_position}</Text>
        </View>
        <Text style={styles.rosterBT}>
            {player.bats === 'S' ? 'S' : player.bats}/{player.throws}
        </Text>
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
    posBadge: {
        width: 36,
        paddingVertical: 2,
        borderRadius: 4,
        alignItems: 'center',
        marginRight: 4,
    },
    posBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
    },
    rosterBT: {
        width: 32,
        fontSize: 13,
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
