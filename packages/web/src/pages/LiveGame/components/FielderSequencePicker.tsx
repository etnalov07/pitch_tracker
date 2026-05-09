import styled from '@emotion/styled';
import { formatFielderSequence } from '@pitch-tracker/shared';
import React from 'react';
import { theme } from '../../../styles/theme';

interface FielderSequencePickerProps {
    value: number[];
    onChange: (seq: number[]) => void;
    /** Maximum sequence length (DB constraint allows up to 5). */
    maxLength?: number;
}

const POSITION_LABELS: Record<number, string> = {
    1: 'P',
    2: 'C',
    3: '1B',
    4: '2B',
    5: '3B',
    6: 'SS',
    7: 'LF',
    8: 'CF',
    9: 'RF',
};

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const PreviewRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
`;

const Preview = styled.span`
    font-size: 18px;
    font-weight: 700;
    color: ${theme.colors.gray[900]};
    min-width: 60px;
    text-align: center;
`;

const PreviewPlaceholder = styled.span`
    font-size: 14px;
    font-style: italic;
    color: ${theme.colors.gray[500]};
    min-width: 60px;
    text-align: center;
`;

const ClearButton = styled.button`
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid ${theme.colors.gray[300]};
    background: white;
    color: ${theme.colors.gray[600]};
    cursor: pointer;
    font-size: 12px;

    &:hover {
        background: ${theme.colors.gray[50]};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
`;

const PositionChip = styled.button<{ $order: number | null }>`
    position: relative;
    padding: 8px 0;
    border-radius: 8px;
    border: 1px solid ${(props) => (props.$order != null ? theme.colors.primary[500] : theme.colors.gray[300])};
    background: ${(props) => (props.$order != null ? theme.colors.primary[50] : 'white')};
    color: ${(props) => (props.$order != null ? theme.colors.primary[700] : theme.colors.gray[700])};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    user-select: none;

    &:hover {
        border-color: ${theme.colors.primary[400]};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const OrderBadge = styled.span`
    position: absolute;
    top: -6px;
    right: -6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${theme.colors.primary[600]};
    color: white;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const FielderSequencePicker: React.FC<FielderSequencePickerProps> = ({ value, onChange, maxLength = 5 }) => {
    const togglePosition = (pos: number) => {
        const idx = value.indexOf(pos);
        if (idx >= 0) {
            // Tapping a selected chip removes it (and everything after, since order matters).
            // Easier mental model: re-tap the latest selection to undo, or use Clear.
            onChange(value.slice(0, idx));
        } else if (value.length < maxLength) {
            onChange([...value, pos]);
        }
    };

    const preview = formatFielderSequence(value);
    const atLimit = value.length >= maxLength;

    return (
        <Wrapper>
            <PreviewRow>
                {preview ? <Preview>{preview}</Preview> : <PreviewPlaceholder>tap fielders in order</PreviewPlaceholder>}
                <ClearButton type="button" onClick={() => onChange([])} disabled={value.length === 0}>
                    Clear
                </ClearButton>
            </PreviewRow>
            <Grid>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pos) => {
                    const order = value.indexOf(pos);
                    const isSelected = order >= 0;
                    return (
                        <PositionChip
                            key={pos}
                            type="button"
                            $order={isSelected ? order : null}
                            onClick={() => togglePosition(pos)}
                            disabled={!isSelected && atLimit}
                            aria-label={`Position ${pos} (${POSITION_LABELS[pos]})`}
                        >
                            {pos}
                            <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.7, marginLeft: 4 }}>
                                {POSITION_LABELS[pos]}
                            </span>
                            {isSelected && <OrderBadge>{order + 1}</OrderBadge>}
                        </PositionChip>
                    );
                })}
            </Grid>
        </Wrapper>
    );
};

export default FielderSequencePicker;
