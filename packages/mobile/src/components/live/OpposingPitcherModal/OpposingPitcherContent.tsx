import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, List, RadioButton, Text, TextInput, useTheme } from 'react-native-paper';
import { CreateOpposingPitcherParams, OpposingPitcher, ThrowingHand } from '@pitch-tracker/shared';

export interface OpposingPitcherContentProps {
    gameId: string;
    opposingPitchers: OpposingPitcher[];
    currentOpposingPitcher: OpposingPitcher | null;
    /** Already-combined select behavior (modal dismisses after; panel just sets). */
    onSelect: (pitcher: OpposingPitcher) => void;
    onCreate: (params: CreateOpposingPitcherParams) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    opponentName?: string;
}

/**
 * Shared body for the Opposing Pitcher picker — the pitcher list + inline add
 * form. Wrapped by `OpposingPitcherModal` (phone, in a Portal/Modal) and by
 * `OpposingPitcherPanel` (iPad sidebar, inline). Mirrors the web
 * OpposingPitcherPanel. Holds its own form state; the parent owns selection.
 */
const OpposingPitcherContent: React.FC<OpposingPitcherContentProps> = ({
    gameId,
    opposingPitchers,
    currentOpposingPitcher,
    onSelect,
    onCreate,
    onDelete,
    opponentName,
}) => {
    const theme = useTheme();
    const [pitcherName, setPitcherName] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [throws, setThrows] = useState<ThrowingHand>('R');
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const handleSave = async () => {
        if (!pitcherName.trim()) return;
        setSaving(true);
        try {
            await onCreate({
                game_id: gameId,
                team_name: opponentName ?? 'Opponent',
                pitcher_name: pitcherName.trim(),
                jersey_number: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
                throws,
            });
            setPitcherName('');
            setJerseyNumber('');
            setThrows('R');
            setShowForm(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View>
            {opposingPitchers.length === 0 && !showForm && (
                <Text variant="bodySmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    No opposing pitchers added yet.
                </Text>
            )}
            {opposingPitchers.map((p) => (
                <List.Item
                    key={p.id}
                    title={`${p.jersey_number != null ? `#${p.jersey_number} ` : ''}${p.pitcher_name}`}
                    description={`${p.throws}HP`}
                    onPress={() => onSelect(p)}
                    left={(props) => (
                        <RadioButton
                            {...props}
                            value={p.id}
                            status={currentOpposingPitcher?.id === p.id ? 'checked' : 'unchecked'}
                            onPress={() => onSelect(p)}
                        />
                    )}
                    right={(props) => <IconButton {...props} icon="delete-outline" size={18} onPress={() => onDelete(p.id)} />}
                    style={currentOpposingPitcher?.id === p.id ? styles.activeItem : undefined}
                />
            ))}

            {showForm ? (
                <View style={styles.form}>
                    <TextInput
                        label="Pitcher Name"
                        value={pitcherName}
                        onChangeText={setPitcherName}
                        mode="outlined"
                        dense
                        style={styles.input}
                        autoFocus
                    />
                    <View style={styles.formRow}>
                        <TextInput
                            label="Jersey # (opt.)"
                            value={jerseyNumber}
                            onChangeText={setJerseyNumber}
                            mode="outlined"
                            dense
                            keyboardType="numeric"
                            style={[styles.input, { flex: 1 }]}
                        />
                        <View style={styles.handRow}>
                            <Text variant="labelSmall">Throws:</Text>
                            <RadioButton.Group onValueChange={(v) => setThrows(v as ThrowingHand)} value={throws}>
                                <View style={styles.radioOption}>
                                    <RadioButton value="R" />
                                    <Text variant="bodySmall">R</Text>
                                </View>
                                <View style={styles.radioOption}>
                                    <RadioButton value="L" />
                                    <Text variant="bodySmall">L</Text>
                                </View>
                            </RadioButton.Group>
                        </View>
                    </View>
                    <View style={styles.formActions}>
                        <Button mode="outlined" onPress={() => setShowForm(false)} compact>
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSave}
                            loading={saving}
                            disabled={saving || !pitcherName.trim()}
                            compact
                        >
                            Add
                        </Button>
                    </View>
                </View>
            ) : (
                <Button mode="outlined" onPress={() => setShowForm(true)} style={styles.addButton} icon="plus">
                    Add Pitcher
                </Button>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    emptyText: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 12,
    },
    activeItem: {
        backgroundColor: '#eff6ff',
    },
    form: {
        marginTop: 12,
        gap: 8,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    input: {},
    handRow: {
        alignItems: 'center',
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    addButton: {
        marginTop: 12,
    },
});

export default OpposingPitcherContent;
