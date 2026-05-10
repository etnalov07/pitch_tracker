import styled from '@emotion/styled';
import React, { useState } from 'react';
import { performanceSummaryService } from '../../../services/performanceSummaryService';
import { theme } from '../../../styles/theme';

interface Props {
    gameId: string;
    onClose: () => void;
}

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
`;

const Modal = styled.div`
    background: ${theme.surfaces.card};
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.lg};
    width: 92%;
    max-width: 460px;
    box-shadow: ${theme.shadows.lg};
`;

const Title = styled.h2`
    margin: 0 0 ${theme.spacing.sm};
    font-size: ${theme.fontSize.lg};
    color: ${theme.colors.gray[900]};
`;

const Hint = styled.p`
    margin: 0 0 ${theme.spacing.md};
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.gray[600]};
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 96px;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    border: 1px solid ${theme.colors.gray[300]};
    background: ${theme.surfaces.card};
    color: ${theme.colors.gray[900]};
    font-family: inherit;
    font-size: ${theme.fontSize.sm};
    resize: vertical;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${theme.colors.primary[500]};
    }
`;

const ErrorText = styled.p`
    margin: ${theme.spacing.sm} 0 0;
    color: ${theme.colors.red[700]};
    font-size: ${theme.fontSize.sm};
`;

const SuccessText = styled.p`
    margin: ${theme.spacing.sm} 0 0;
    color: ${theme.colors.green[700]};
    font-size: ${theme.fontSize.sm};
`;

const ActionsRow = styled.div`
    display: flex;
    gap: ${theme.spacing.sm};
    margin-top: ${theme.spacing.lg};
    justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'outline' }>`
    padding: 8px 16px;
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.semibold};
    cursor: pointer;
    border: 1px solid transparent;

    ${(p) =>
        p.$variant === 'outline'
            ? `background:${theme.surfaces.card};color:${theme.colors.gray[700]};border-color:${theme.colors.gray[300]};&:hover{background:${theme.colors.gray[50]};}`
            : `background:${theme.colors.primary[600]};color:#ffffff;&:hover{background:${theme.colors.primary[700]};}`}

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailReportModal: React.FC<Props> = ({ gameId, onClose }) => {
    const [value, setValue] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState<string[] | null>(null);

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
            const recipients = await performanceSummaryService.emailPostGameReport(gameId, candidates);
            setSent(recipients);
        } catch (e) {
            const message =
                (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send. Try again.';
            setError(message);
        } finally {
            setSending(false);
        }
    };

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Title>Email postgame report</Title>
                <Hint>Comma- or newline-separated. Recipients get the score, top stats, and a link to the full report.</Hint>
                <TextArea
                    autoFocus
                    placeholder="coach@example.com, parent@example.com"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={sending || sent !== null}
                />
                {error && <ErrorText>{error}</ErrorText>}
                {sent && (
                    <SuccessText>
                        Sent to {sent.length} recipient{sent.length === 1 ? '' : 's'}.
                    </SuccessText>
                )}
                <ActionsRow>
                    <Button $variant="outline" onClick={onClose} disabled={sending}>
                        {sent ? 'Close' : 'Cancel'}
                    </Button>
                    {!sent && (
                        <Button onClick={handleSend} disabled={sending}>
                            {sending ? 'Sending…' : 'Send'}
                        </Button>
                    )}
                </ActionsRow>
            </Modal>
        </Overlay>
    );
};

export default EmailReportModal;
