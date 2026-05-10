import styled from '@emotion/styled';
import { Pitch } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../styles/theme';

interface UndoPitchModalProps {
    isOpen: boolean;
    pitch: Pitch | null;
    onCancel: () => void;
    onConfirm: () => void;
}

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

const Modal = styled.div`
    background: ${theme.surfaces.card};
    border-radius: 12px;
    padding: 24px;
    max-width: 360px;
    width: 100%;
`;

const Title = styled.h2`
    margin: 0 0 12px 0;
    font-size: 20px;
    color: ${theme.colors.gray[900]};
    text-align: center;
`;

const Detail = styled.div`
    background: ${theme.colors.gray[50]};
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 8px;
    color: ${theme.colors.gray[800]};
    font-size: 14px;
    text-align: center;
`;

const DetailLabel = styled.span`
    color: ${theme.colors.gray[500]};
    margin-right: 6px;
`;

const Note = styled.p`
    margin: 8px 0 20px 0;
    font-size: 13px;
    color: ${theme.colors.gray[600]};
    text-align: center;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 12px;
`;

const Button = styled.button<{ variant?: 'destructive' }>`
    flex: 1;
    padding: 10px 16px;
    border: 1px solid ${({ variant }) => (variant === 'destructive' ? theme.colors.red[600] : theme.colors.gray[300])};
    border-radius: 8px;
    background: ${({ variant }) => (variant === 'destructive' ? theme.colors.red[600] : theme.surfaces.card)};
    color: ${({ variant }) => (variant === 'destructive' ? 'white' : theme.colors.gray[700])};
    font-weight: 600;
    cursor: pointer;
    &:hover {
        background: ${({ variant }) => (variant === 'destructive' ? theme.colors.red[700] : theme.colors.gray[50])};
    }
`;

const formatLabel = (s: string) => s.replace(/_/g, ' ');

const UndoPitchModal: React.FC<UndoPitchModalProps> = ({ isOpen, pitch, onCancel, onConfirm }) => {
    if (!isOpen || !pitch) return null;
    return (
        <Overlay onClick={onCancel}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Title>Undo last pitch?</Title>
                <Detail>
                    <DetailLabel>Pitch:</DetailLabel>
                    {formatLabel(pitch.pitch_type)}
                    {pitch.velocity ? ` · ${pitch.velocity} mph` : ''}
                </Detail>
                <Detail>
                    <DetailLabel>Result:</DetailLabel>
                    {formatLabel(pitch.pitch_result)}
                </Detail>
                <Detail>
                    <DetailLabel>Count before:</DetailLabel>
                    {pitch.balls_before}-{pitch.strikes_before}
                </Detail>
                <Note>This reverses count, baserunners, outs, and score back to before this pitch.</Note>
                <ButtonRow>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button variant="destructive" onClick={onConfirm}>
                        Undo
                    </Button>
                </ButtonRow>
            </Modal>
        </Overlay>
    );
};

export default UndoPitchModal;
