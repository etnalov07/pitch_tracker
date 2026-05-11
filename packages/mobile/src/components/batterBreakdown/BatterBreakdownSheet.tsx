import { BatterBreakdown } from '@pitch-tracker/shared';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, SafeAreaView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import { performanceSummaryApi } from '../../state/performanceSummary/api/performanceSummaryApi';
import BatterRow from './BatterRow';
import { RESULT_COLOR } from './PitchChip';

interface Props {
    visible: boolean;
    gameId: string;
    currentBatterId?: string;
    currentBatterName?: string;
    onClose: () => void;
}

const LEGEND_ITEMS: { key: keyof typeof RESULT_COLOR; label: string }[] = [
    { key: 'ball', label: 'Ball' },
    { key: 'called_strike', label: 'Called K' },
    { key: 'swinging_strike', label: 'Swing K' },
    { key: 'foul', label: 'Foul' },
    { key: 'in_play', label: 'In Play' },
];

const BatterBreakdownSheet: React.FC<Props> = ({ visible, gameId, currentBatterId, currentBatterName, onClose }) => {
    const [breakdown, setBreakdown] = useState<BatterBreakdown[] | null>(null);
    const listRef = useRef<FlatList<BatterBreakdown>>(null);

    useEffect(() => {
        if (!visible) {
            setBreakdown(null);
            return;
        }
        let cancelled = false;
        performanceSummaryApi
            .getBatterBreakdown(gameId)
            .then((data) => {
                if (!cancelled) setBreakdown(data);
            })
            .catch(() => {
                if (!cancelled) setBreakdown([]);
            });
        return () => {
            cancelled = true;
        };
    }, [visible, gameId]);

    const sorted = useMemo(() => {
        if (!breakdown) return [];
        return [...breakdown].sort((a, b) => a.batting_order - b.batting_order);
    }, [breakdown]);

    const currentIndex = useMemo(() => {
        if (!currentBatterId) return -1;
        return sorted.findIndex((b) => b.batter_id === currentBatterId);
    }, [sorted, currentBatterId]);

    useEffect(() => {
        if (currentIndex < 0 || !listRef.current) return;
        const handle = setTimeout(() => {
            try {
                listRef.current?.scrollToIndex({ index: currentIndex, animated: true, viewPosition: 0 });
            } catch {
                // No-op if list isn't laid out yet
            }
        }, 100);
        return () => clearTimeout(handle);
    }, [currentIndex, sorted.length]);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text variant="titleMedium">Batter Breakdown</Text>
                        {currentBatterName && <Text style={styles.headerSubtitle}>At bat: {currentBatterName}</Text>}
                    </View>
                    <IconButton icon="close" onPress={onClose} />
                </View>
                <View style={styles.legendRow}>
                    {LEGEND_ITEMS.map(({ key, label }) => {
                        const c = RESULT_COLOR[key];
                        return (
                            <View key={key} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: c.bg, borderColor: c.text }]} />
                                <Text style={styles.legendText}>{label}</Text>
                            </View>
                        );
                    })}
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#fef9c3', borderColor: '#eab308', borderWidth: 2 }]} />
                        <Text style={styles.legendText}>AB-Ending</Text>
                    </View>
                </View>
                <Text style={styles.hint}>Count · Type · Result · Vel · Target</Text>
                {breakdown === null ? (
                    <View style={styles.loading}>
                        <ActivityIndicator />
                        <Text style={styles.loadingText}>Loading batter breakdown…</Text>
                    </View>
                ) : sorted.length === 0 ? (
                    <Text style={styles.empty}>No batters in opponent lineup.</Text>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={sorted}
                        keyExtractor={(b) => b.batter_id}
                        renderItem={({ item }) => <BatterRow batter={item} gameId={gameId} />}
                        contentContainerStyle={styles.listContent}
                        onScrollToIndexFailed={(info) => {
                            setTimeout(() => {
                                listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
                            }, 100);
                        }}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerText: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingTop: 8,
        gap: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
    },
    legendText: {
        fontSize: 10,
        color: '#374151',
    },
    hint: {
        fontSize: 10,
        color: '#9ca3af',
        fontStyle: 'italic',
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    listContent: {
        padding: 12,
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    loadingText: {
        fontSize: 12,
        color: '#6b7280',
    },
    empty: {
        textAlign: 'center',
        padding: 24,
        fontSize: 12,
        color: '#9ca3af',
    },
});

export default BatterBreakdownSheet;
