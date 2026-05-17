import styled from '@emotion/styled';
import { MyTeamLineupPlayer, Player } from '@pitch-tracker/shared';
import React, { useMemo, useState } from 'react';
import { myTeamLineupService } from '../../services/myTeamLineupService';
import { theme } from '../../styles/theme';

interface MyBatterSubModalProps {
    lineup: MyTeamLineupPlayer[];
    rosterPlayers: Player[];
    currentInningNumber?: number;
    initialBatterId?: string;
    onClose: () => void;
    onSubstituted: () => void;
}

const playerName = (p?: Player | null): string => (p ? `${p.first_name} ${p.last_name}` : 'Unknown');

const MyBatterSubModal: React.FC<MyBatterSubModalProps> = ({
    lineup,
    rosterPlayers,
    currentInningNumber,
    initialBatterId,
    onClose,
    onSubstituted,
}) => {
    const activeBatters = useMemo(
        () => [...lineup].filter((p) => !p.replaced_by_id).sort((a, b) => a.batting_order - b.batting_order),
        [lineup]
    );

    const [replaceId, setReplaceId] = useState<string>(
        initialBatterId && activeBatters.some((b) => b.id === initialBatterId) ? initialBatterId : (activeBatters[0]?.id ?? '')
    );
    const [incomingId, setIncomingId] = useState<string>('');
    const [inning, setInning] = useState<string>(currentInningNumber ? String(currentInningNumber) : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Bench = roster players not already active in the lineup.
    const benchPlayers = useMemo(() => {
        const activeIds = new Set(activeBatters.map((b) => b.player_id));
        return rosterPlayers.filter((p) => !activeIds.has(p.id));
    }, [activeBatters, rosterPlayers]);

    const replaceBatter = activeBatters.find((b) => b.id === replaceId) ?? null;
    const canSave = !saving && !!replaceId && !!incomingId && !!inning.trim();

    const handleConfirm = async () => {
        if (!canSave || !replaceBatter) return;
        setSaving(true);
        setError(null);
        try {
            await myTeamLineupService.substitute(replaceBatter.id, {
                player_id: incomingId,
                inning_entered: parseInt(inning, 10),
                position: replaceBatter.position || undefined,
            });
            onSubstituted();
            onClose();
        } catch {
            setError('Failed to substitute batter. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Title>Substitute Batter</Title>

                <Field>
                    <Label>Batter to replace</Label>
                    <Select value={replaceId} onChange={(e) => setReplaceId(e.target.value)}>
                        {activeBatters.map((b) => (
                            <option key={b.id} value={b.id}>
                                #{b.batting_order} {playerName(b.player)}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field>
                    <Label>Incoming player</Label>
                    <Select value={incomingId} onChange={(e) => setIncomingId(e.target.value)}>
                        <option value="">Select a bench player</option>
                        {benchPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {playerName(p)}
                                {p.primary_position ? ` (${p.primary_position})` : ''}
                            </option>
                        ))}
                    </Select>
                    {benchPlayers.length === 0 && <Hint>No bench players available on the roster.</Hint>}
                </Field>

                <Field>
                    <Label>Inning entered</Label>
                    <NumberInput type="number" min={1} max={20} value={inning} onChange={(e) => setInning(e.target.value)} />
                </Field>

                {error && <ErrorText>{error}</ErrorText>}

                <Actions>
                    <CancelButton onClick={onClose} disabled={saving}>
                        Cancel
                    </CancelButton>
                    <ConfirmButton onClick={handleConfirm} disabled={!canSave}>
                        {saving ? 'Substituting…' : 'Substitute'}
                    </ConfirmButton>
                </Actions>
            </Modal>
        </Overlay>
    );
};

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Modal = styled.div`
    background: ${theme.colors.gray[50]};
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.xl};
    width: 380px;
    max-width: 90vw;
    box-shadow: ${theme.shadows.xl};
`;

const Title = styled.h2`
    margin: 0 0 ${theme.spacing.lg};
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.gray[900]};
`;

const Field = styled.div`
    margin-bottom: ${theme.spacing.md};
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing.xs};
`;

const Label = styled.label`
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.gray[700]};
`;

const Select = styled.select`
    padding: ${theme.spacing.sm};
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.fontSize.base};
    background: #fff;
`;

const NumberInput = styled.input`
    padding: ${theme.spacing.sm};
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: ${theme.borderRadius.md};
    font-size: ${theme.fontSize.base};
    width: 96px;
`;

const Hint = styled.div`
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.gray[500]};
`;

const ErrorText = styled.div`
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.red[600]};
    margin-bottom: ${theme.spacing.sm};
`;

const Actions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: ${theme.spacing.sm};
    margin-top: ${theme.spacing.lg};
`;

const CancelButton = styled.button`
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    border: 1px solid ${theme.colors.gray[300]};
    border-radius: ${theme.borderRadius.md};
    background: #fff;
    color: ${theme.colors.gray[700]};
    cursor: pointer;
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ConfirmButton = styled.button`
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    border: none;
    border-radius: ${theme.borderRadius.md};
    background: ${theme.colors.primary[600]};
    color: #fff;
    font-weight: ${theme.fontWeight.semibold};
    cursor: pointer;
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export default MyBatterSubModal;
