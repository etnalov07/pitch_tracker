import React, { useState } from 'react';
import styled from '@emotion/styled';
import { theme } from '../../styles/theme';
import { useAppDispatch } from '../../state';
import { createInvite } from '../../state/invites/invitesSlice';
import type { Player } from '../../types';

interface InviteModalProps {
    teamId: string;
    players: Player[];
    onClose: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ teamId, players, onClose }) => {
    const dispatch = useAppDispatch();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
    const [role, setRole] = useState<string>('player');
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);

        const data: { team_id: string; player_id?: string; role?: string } = {
            team_id: teamId,
            role,
        };
        if (selectedPlayerId) {
            data.player_id = selectedPlayerId;
        }

        const result = await dispatch(createInvite(data));
        setLoading(false);

        if (createInvite.fulfilled.match(result)) {
            const invite = result.payload;
            const baseUrl = window.location.origin;
            setInviteLink(`${baseUrl}/invite/${invite.token}`);
        } else {
            setError(result.payload as string || 'Failed to generate invite');
        }
    };

    const handleCopy = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = inviteLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const unlinkedPlayers = players.filter((p) => !p.user_id);

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Generate Invite Link</ModalTitle>
                    <CloseButton onClick={onClose}>X</CloseButton>
                </ModalHeader>

                {error && <ErrorText>{error}</ErrorText>}

                {!inviteLink ? (
                    <>
                        <FormGroup>
                            <Label>Role</Label>
                            <Select value={role} onChange={(e) => setRole(e.target.value)}>
                                <option value="player">Player</option>
                                <option value="assistant">Assistant Coach</option>
                                <option value="coach">Coach</option>
                            </Select>
                        </FormGroup>

                        {unlinkedPlayers.length > 0 && (
                            <FormGroup>
                                <Label>Link to Player (optional)</Label>
                                <Select
                                    value={selectedPlayerId}
                                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                                >
                                    <option value="">No specific player</option>
                                    {unlinkedPlayers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            #{p.jersey_number ?? '-'} {p.first_name} {p.last_name}
                                        </option>
                                    ))}
                                </Select>
                                <HelpText>
                                    Link this invite to a player record so when they accept, their account gets connected.
                                </HelpText>
                            </FormGroup>
                        )}

                        <GenerateButton onClick={handleGenerate} disabled={loading}>
                            {loading ? 'Generating...' : 'Generate Link'}
                        </GenerateButton>
                    </>
                ) : (
                    <>
                        <SuccessText>Invite link generated! Share it with the person you want to invite.</SuccessText>
                        <LinkBox>
                            <LinkText>{inviteLink}</LinkText>
                            <CopyButton onClick={handleCopy}>
                                {copied ? 'Copied!' : 'Copy'}
                            </CopyButton>
                        </LinkBox>
                        <GenerateButton onClick={() => { setInviteLink(null); setCopied(false); }}>
                            Generate Another
                        </GenerateButton>
                    </>
                )}
            </Modal>
        </Overlay>
    );
};

export default InviteModal;

// Styled components
const Overlay = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
});

const Modal = styled.div({
    width: '100%',
    maxWidth: '500px',
    background: 'white',
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.xl,
    padding: theme.spacing['2xl'],
});

const ModalHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
});

const ModalTitle = styled.h2({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

const CloseButton = styled.button({
    background: 'none',
    border: 'none',
    fontSize: theme.fontSize.lg,
    color: theme.colors.gray[400],
    cursor: 'pointer',
    padding: theme.spacing.sm,

    '&:hover': {
        color: theme.colors.gray[600],
    },
});

const FormGroup = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
});

const Label = styled.label({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
});

const Select = styled.select({
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    backgroundColor: 'white',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
    },
});

const HelpText = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

const GenerateButton = styled.button({
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.primary[700],
    },

    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

const LinkBox = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
    background: theme.colors.gray[50],
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
});

const LinkText = styled.span({
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[700],
    wordBreak: 'break-all',
    fontFamily: 'monospace',
});

const CopyButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    whiteSpace: 'nowrap',

    '&:hover': {
        backgroundColor: theme.colors.green[700],
    },
});

const ErrorText = styled.div({
    backgroundColor: theme.colors.red[50],
    border: `1px solid ${theme.colors.red[200]}`,
    color: theme.colors.red[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
});

const SuccessText = styled.div({
    backgroundColor: theme.colors.green[50],
    border: `1px solid ${theme.colors.green[200]}`,
    color: theme.colors.green[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
});
