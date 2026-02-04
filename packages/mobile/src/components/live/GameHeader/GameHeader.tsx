import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Game, Player } from '@pitch-tracker/shared';
import { colors } from '../../../styles/theme';

interface GameHeaderProps {
    game: Game;
    currentPitcher?: Player | null;
    currentBatter?: { name: string; batting_order?: number } | null;
    balls: number;
    strikes: number;
    outs: number;
    onPitcherPress?: () => void;
    onBatterPress?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
    game,
    currentPitcher,
    currentBatter,
    balls,
    strikes,
    outs,
    onPitcherPress,
    onBatterPress,
}) => {
    const getInningDisplay = () => {
        const half = game.inning_half === 'top' ? '▲' : '▼';
        return `${half} ${game.current_inning || 1}`;
    };

    return (
        <View style={styles.container}>
            {/* Top row: Score + Count inline */}
            <View style={styles.topRow}>
                <View style={styles.teamScore}>
                    <Text style={styles.teamLabel}>HOME</Text>
                    <Text style={styles.score}>{game.home_score || 0}</Text>
                </View>
                <View style={styles.centerColumn}>
                    <View style={styles.inningContainer}>
                        <Text style={styles.inning}>{getInningDisplay()}</Text>
                    </View>
                    <View style={styles.countRow}>
                        <View style={styles.countItem}>
                            <Text style={styles.countLabel}>B</Text>
                            {[0, 1, 2, 3].map((i) => (
                                <View
                                    key={`ball-${i}`}
                                    style={[styles.countDot, i < balls ? styles.ballDot : styles.emptyDot]}
                                />
                            ))}
                        </View>
                        <View style={styles.countItem}>
                            <Text style={styles.countLabel}>S</Text>
                            {[0, 1, 2].map((i) => (
                                <View
                                    key={`strike-${i}`}
                                    style={[styles.countDot, i < strikes ? styles.strikeDot : styles.emptyDot]}
                                />
                            ))}
                        </View>
                        <View style={styles.countItem}>
                            <Text style={styles.countLabel}>O</Text>
                            {[0, 1, 2].map((i) => (
                                <View
                                    key={`out-${i}`}
                                    style={[styles.countDot, i < outs ? styles.outDot : styles.emptyDot]}
                                />
                            ))}
                        </View>
                    </View>
                </View>
                <View style={styles.teamScore}>
                    <Text style={styles.teamLabel}>AWAY</Text>
                    <Text style={styles.score}>{game.away_score || 0}</Text>
                </View>
            </View>

            {/* Bottom row: Pitcher vs Batter */}
            <View style={styles.matchupSection}>
                <Pressable
                    style={[styles.playerInfo, onPitcherPress && styles.playerInfoTappable]}
                    onPress={onPitcherPress}
                    disabled={!onPitcherPress}
                >
                    <Text style={styles.playerLabel}>P</Text>
                    <Text style={styles.playerName} numberOfLines={1}>
                        {currentPitcher
                            ? `${currentPitcher.first_name[0]}. ${currentPitcher.last_name}`
                            : 'Select'}
                    </Text>
                </Pressable>
                <Text style={styles.vs}>vs</Text>
                <Pressable
                    style={[styles.playerInfo, onBatterPress && styles.playerInfoTappable]}
                    onPress={onBatterPress}
                    disabled={!onBatterPress}
                >
                    <Text style={styles.playerLabel}>AB</Text>
                    <Text style={styles.playerName} numberOfLines={1}>
                        {currentBatter
                            ? `${currentBatter.batting_order ? `#${currentBatter.batting_order} ` : ''}${currentBatter.name}`
                            : 'Select'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.primary[600],
        padding: 10,
        borderRadius: 10,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    teamScore: {
        alignItems: 'center',
        minWidth: 44,
    },
    teamLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
    },
    score: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    centerColumn: {
        alignItems: 'center',
        marginHorizontal: 12,
    },
    inningContainer: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 6,
        marginBottom: 4,
    },
    inning: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    countRow: {
        flexDirection: 'row',
        gap: 10,
    },
    countItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    countLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
    },
    countDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    emptyDot: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    ballDot: {
        backgroundColor: colors.green[400],
    },
    strikeDot: {
        backgroundColor: colors.red[400],
    },
    outDot: {
        backgroundColor: colors.yellow[400],
    },
    matchupSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    playerInfoTappable: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    playerLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
    },
    playerName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#ffffff',
    },
    vs: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginHorizontal: 6,
    },
});

export default GameHeader;
