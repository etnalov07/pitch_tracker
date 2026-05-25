// Shared modal scaffolding for the Pitcher / Hitter tendencies modals
// (UX-TD-10). The two modals duplicated ~80% of header / close / scroll
// layout — this shell owns all of that; each variant supplies only its
// own header-right toolbar (optional) and body content as children.

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Modal, useTheme } from 'react-native-paper';

import { colors } from '../../../styles/theme';

interface TendenciesModalShellProps {
    visible: boolean;
    onDismiss: () => void;
    title: string;
    subtitle: string;
    /** Optional toolbar slot below the header — e.g. PitcherTendencies' L/R handedness toggle. */
    toolbar?: React.ReactNode;
    children: React.ReactNode;
}

const TendenciesModalShell: React.FC<TendenciesModalShellProps> = ({ visible, onDismiss, title, subtitle, toolbar, children }) => {
    const theme = useTheme();
    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
                </View>
                <TouchableOpacity
                    onPress={onDismiss}
                    style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                >
                    <Text style={[styles.closeBtnText, { color: theme.colors.onSurface }]}>✕</Text>
                </TouchableOpacity>
            </View>

            {toolbar}

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {children}
            </ScrollView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { margin: 16, borderRadius: 12, maxHeight: '85%', overflow: 'hidden' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.primary[900] },
    subtitle: { fontSize: 13, marginTop: 2 },
    closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { fontSize: 14 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingTop: 4 },
});

export default TendenciesModalShell;
