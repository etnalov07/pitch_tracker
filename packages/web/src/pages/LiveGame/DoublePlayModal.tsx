import styled from '@emotion/styled';
import { BaseRunners, RunnerBase } from '@pitch-tracker/shared';
import React, { useEffect, useState } from 'react';
import { theme } from '../../styles/theme';

interface DoublePlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    runners: BaseRunners;
    currentOuts: number;
    onConfirm: (outRunners: RunnerBase[], batterReachesFirst: boolean) => void;
}

const BASE_LABELS: { base: RunnerBase; label: string }[] = [
    { base: 'first', label: '1st Base' },
    { base: 'second', label: '2nd Base' },
    { base: 'third', label: '3rd Base' },
];

// ─── Styled components ───────────────────────────────────────────────────────

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
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    max-height: 85vh;
    overflow-y: auto;
`;

const Title = styled.h3`
    margin: 0 0 18px 0;
    font-size: 17px;
    font-weight: 700;
    color: ${theme.colors.gray[800]};
`;

const ToggleRow = styled.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: 8px;
    background: ${theme.colors.gray[50]};
    border: 1px solid ${theme.colors.gray[200]};
    cursor: pointer;
    margin-bottom: 18px;
    user-select: none;
`;

const ToggleText = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: ${theme.colors.gray[700]};
`;

const Toggle = styled.input`
    width: 40px;
    height: 22px;
    cursor: pointer;
    accent-color: ${theme.colors.primary[600]};
`;

const SectionLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: ${theme.colors.gray[500]};
    margin-bottom: 8px;
`;

const Section = styled.div`
    margin-bottom: 16px;
`;

const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const Chip = styled.button<{ $selected?: boolean }>`
    padding: 7px 14px;
    border-radius: 20px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid ${(p) => (p.$selected ? theme.colors.red[400] : theme.colors.gray[300])};
    background: ${(p) => (p.$selected ? theme.colors.red[50] : 'white')};
    color: ${(p) => (p.$selected ? theme.colors.red[700] : theme.colors.gray[700])};
    &:hover {
        border-color: ${theme.colors.red[300]};
    }
`;

const NoRunners = styled.p`
    color: ${theme.colors.gray[500]};
    font-style: italic;
    margin: 0;
    font-size: 13px;
`;

const DiamondRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    margin-bottom: 14px;
`;

const DiamondArrow = styled.span`
    font-size: 20px;
    color: ${theme.colors.gray[400]};
`;

const DiamondLabel = styled.div`
    font-size: 11px;
    color: ${theme.colors.gray[500]};
    text-align: center;
    margin-bottom: 4px;
    font-weight: 600;
`;

const DiamondGrid = styled.div`
    display: grid;
    grid-template-columns: 28px 28px 28px;
    grid-template-rows: 28px 28px 28px;
    gap: 4px;
`;

const Base = styled.div<{ $occupied?: boolean; $batter?: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 2px solid
        ${(p) => (p.$batter ? theme.colors.green[400] : p.$occupied ? theme.colors.primary[500] : theme.colors.gray[300])};
    background: ${(p) => (p.$batter ? theme.colors.green[500] : p.$occupied ? theme.colors.primary[500] : 'white')};
    color: ${(p) => (p.$occupied || p.$batter ? 'white' : theme.colors.gray[400])};
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotate(45deg);
`;

const BaseLabel = styled.span`
    transform: rotate(-45deg);
    display: block;
`;

const Warning = styled.p`
    color: ${theme.colors.red[700]};
    font-size: 13px;
    background: ${theme.colors.red[50]};
    border: 1px solid ${theme.colors.red[200]};
    border-radius: 6px;
    padding: 8px 12px;
    margin: 0 0 14px 0;
`;

const ButtonRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
`;

const ActionButton = styled.button<{ $variant?: 'red' | 'outline' }>`
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    ${(p) => {
        if (p.$variant === 'red')
            return `background:${theme.colors.red[500]};color:white;border:none;&:hover{background:${theme.colors.red[600]};}&:disabled{background:${theme.colors.gray[300]};cursor:not-allowed;}`;
        return `background:white;color:${theme.colors.gray[700]};border:1px solid ${theme.colors.gray[300]};&:hover{background:${theme.colors.gray[50]};}`;
    }}
`;

// ─── Mini diamond ─────────────────────────────────────────────────────────────

const MiniDiamond: React.FC<{ runners: BaseRunners; label: string; batterAtFirst?: boolean }> = ({
    runners,
    label,
    batterAtFirst,
}) => (
    <div>
        <DiamondLabel>{label}</DiamondLabel>
        <DiamondGrid>
            <div />
            <Base $occupied={runners.second}>
                <BaseLabel>2</BaseLabel>
            </Base>
            <div />
            <Base $occupied={runners.third}>
                <BaseLabel>3</BaseLabel>
            </Base>
            <div style={{ width: 28, height: 28 }} />
            <Base $occupied={runners.first} $batter={!runners.first && batterAtFirst}>
                <BaseLabel>1</BaseLabel>
            </Base>
            <div />
            <div
                style={{
                    width: 28,
                    height: 28,
                    border: `2px solid ${theme.colors.gray[200]}`,
                    borderRadius: 4,
                    transform: 'rotate(45deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <span style={{ transform: 'rotate(-45deg)', fontSize: 10, color: theme.colors.gray[300] }}>H</span>
            </div>
            <div />
        </DiamondGrid>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const DoublePlayModal: React.FC<DoublePlayModalProps> = ({ isOpen, onClose, runners, currentOuts, onConfirm }) => {
    const [batterReachesFirst, setBatterReachesFirst] = useState(false);
    const [outRunners, setOutRunners] = useState<RunnerBase[]>([]);

    const occupiedBases = BASE_LABELS.filter((b) => runners[b.base]);

    useEffect(() => {
        if (!isOpen) return;
        setBatterReachesFirst(false);
        setOutRunners([]);
    }, [isOpen]);

    useEffect(() => {
        setOutRunners([]);
    }, [batterReachesFirst]);

    const toggleRunner = (base: RunnerBase) => {
        if (batterReachesFirst) {
            setOutRunners((prev) =>
                prev.includes(base) ? prev.filter((b) => b !== base) : prev.length < 2 ? [...prev, base] : prev
            );
        } else {
            setOutRunners((prev) => (prev.includes(base) ? [] : [base]));
        }
    };

    const afterRunners: BaseRunners = { ...runners };
    for (const base of outRunners) afterRunners[base] = false;

    const canConfirm = batterReachesFirst ? outRunners.length >= 2 : outRunners.length === 1;

    if (!isOpen) return null;

    const willEndInning = currentOuts + 2 >= 3;

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Title>Double Play</Title>

                <ToggleRow>
                    <ToggleText>Batter reaches 1st</ToggleText>
                    <Toggle
                        type="checkbox"
                        checked={batterReachesFirst}
                        onChange={(e) => setBatterReachesFirst(e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </ToggleRow>

                <Section>
                    <SectionLabel>{batterReachesFirst ? 'Runners out — select 2' : 'Runner out on bases'}</SectionLabel>
                    {occupiedBases.length === 0 ? (
                        <NoRunners>No runners on base</NoRunners>
                    ) : (
                        <ChipRow>
                            {occupiedBases.map((b) => (
                                <Chip key={b.base} $selected={outRunners.includes(b.base)} onClick={() => toggleRunner(b.base)}>
                                    {b.label}
                                </Chip>
                            ))}
                        </ChipRow>
                    )}
                </Section>

                <DiamondRow>
                    <MiniDiamond runners={runners} label="Before" />
                    <DiamondArrow>→</DiamondArrow>
                    <MiniDiamond runners={afterRunners} label="After" batterAtFirst={batterReachesFirst} />
                </DiamondRow>

                {willEndInning && <Warning>This double play will end the inning</Warning>}

                <ButtonRow>
                    <ActionButton $variant="outline" onClick={onClose}>
                        Cancel
                    </ActionButton>
                    <ActionButton $variant="red" disabled={!canConfirm} onClick={() => onConfirm(outRunners, batterReachesFirst)}>
                        Confirm Double Play
                    </ActionButton>
                </ButtonRow>
            </Modal>
        </Overlay>
    );
};

export default DoublePlayModal;
