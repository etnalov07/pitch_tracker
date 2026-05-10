import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, useTheme } from 'react-native-paper';
import { performanceSummaryApi } from '../../state/performanceSummary/api/performanceSummaryApi';
import { colors } from '../../styles/theme';

interface Props {
    gameId: string;
    visible: boolean;
    onDismiss: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailReportModal: React.FC<Props> = ({ gameId, visible, onDismiss }) => {
    const theme = useTheme();
    const [value, setValue] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState<string[] | null>(null);

    const reset = () => {
        setValue('');
        setSending(false);
        setError(null);
        setSent(null);
    };

    const handleClose = () => {
        reset();
        onDismiss();
    };

    const parseEmails = (input: string): string[] =>
        Array.from(
            new Set(
                input
                    .split(/[,\n;]/)
                    .map((e) => e.trim().toLowerCase())
                    .filter((e) => e.length > 0)
            )
        );

    const handleSend = async () => {
        setError(null);
        const candidates = parseEmails(value);
        if (candidates.length === 0) {
            setError('Enter at least one email address.');
            return;
        }
        const invalid = candidates.filter((e) => !EMAIL_REGEX.test(e));
        if (invalid.length > 0) {
            setError(`Invalid: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '…' : ''}`);
            return;
        }
        if (candidates.length > 25) {
            setError('Cap is 25 recipients per send.');
            return;
        }
        setSending(true);
        try {
            const recipients = await performanceSummaryApi.emailPostGameReport(gameId, candidates);
            setSent(recipients);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to send. Try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleClose}
                contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                    Email postgame report
                </Text>
                <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
                    Comma- or newline-separated. Recipients get the score, top stats, and a link to the full report.
                </Text>
                <TextInput
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    value={value}
                    onChangeText={setValue}
                    placeholder="coach@example.com, parent@example.com"
                    disabled={sending || sent !== null}
                    style={styles.input}
                />
                {error && <Text style={[styles.error, { color: colors.red[700] }]}>{error}</Text>}
                {sent && (
                    <Text style={[styles.success, { color: colors.green[700] }]}>
                        Sent to {sent.length} recipient{sent.length === 1 ? '' : 's'}.
                    </Text>
                )}
                <View style={styles.actions}>
                    <Button mode="outlined" onPress={handleClose} disabled={sending}>
                        {sent ? 'Close' : 'Cancel'}
                    </Button>
                    {!sent && (
                        <Button mode="contained" onPress={handleSend} loading={sending} disabled={sending}>
                            Send
                        </Button>
                    )}
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modal: {
        margin: 20,
        padding: 20,
        borderRadius: 12,
    },
    title: {
        fontWeight: '700',
        marginBottom: 4,
    },
    hint: {
        fontSize: 13,
        marginBottom: 12,
    },
    input: {
        marginBottom: 4,
    },
    error: {
        fontSize: 13,
        marginTop: 8,
    },
    success: {
        fontSize: 13,
        marginTop: 8,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 16,
    },
});

export default EmailReportModal;
