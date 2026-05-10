import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { PlayerWithPitchTypes } from '@pitch-tracker/shared';

interface PlayerListItemProps {
    player: PlayerWithPitchTypes;
    onEdit: (player: PlayerWithPitchTypes) => void;
    onDelete: (player: PlayerWithPitchTypes) => void;
}

function positionLabel(player: PlayerWithPitchTypes): string {
    const isPitcher = player.primary_position === 'P' || player.secondary_position === 'P';
    if (!isPitcher) {
        return player.secondary_position ? `${player.primary_position}/${player.secondary_position}` : player.primary_position;
    }
    const hand = player.throws === 'L' ? 'LHP' : 'RHP';
    if (player.primary_position === 'P' && player.secondary_position) {
        return `${hand}/${player.secondary_position}`;
    }
    if (player.secondary_position === 'P') {
        return `${player.primary_position}/${hand}`;
    }
    return hand;
}

const PlayerListItem: React.FC<PlayerListItemProps> = ({ player, onEdit, onDelete }) => {
    const theme = useTheme();
    return (
        <View style={styles.rosterRow}>
            <Text style={[styles.rosterJersey, { color: theme.colors.onSurface }]}>
                {player.jersey_number != null ? `#${player.jersey_number}` : '-'}
            </Text>
            <View style={styles.rosterNameCol}>
                <Text style={[styles.rosterName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {player.first_name} {player.last_name}
                </Text>
            </View>
            <Text style={[styles.rosterType, { color: theme.colors.onSurfaceVariant }]}>{positionLabel(player)}</Text>
            <IconButton
                icon="pencil-outline"
                size={18}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => onEdit(player)}
                style={styles.actionButton}
            />
            <IconButton
                icon="trash-can-outline"
                size={18}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => onDelete(player)}
                style={styles.actionButton}
            />
        </View>
    );
};

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
    },
    rosterNameCol: {
        flex: 1,
    },
    rosterName: {
        fontSize: 15,
        fontWeight: '500',
    },
    rosterType: {
        minWidth: 52,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    actionButton: {
        margin: 0,
        width: 34,
        height: 34,
    },
});

export default PlayerListItem;
