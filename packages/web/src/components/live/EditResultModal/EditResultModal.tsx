import React, { useEffect } from 'react';
import { PitchResult } from '../../../types';
import {
    EditOverlay,
    EditDialog,
    EditTitle,
    EditSubtitle,
    EditCurrentResult,
    EditGrid,
    EditOption,
    EditOptionLabel,
    EditCurrentTag,
    EditCancel,
} from './styles';

interface EditResultModalProps {
    currentResult?: PitchResult | null;
    onCancel: () => void;
    onSelect: (newResult: PitchResult) => void;
}

const RESULT_OPTIONS: { value: PitchResult; label: string }[] = [
    { value: 'ball', label: 'Ball' },
    { value: 'called_strike', label: 'Called Strike' },
    { value: 'swinging_strike', label: 'Swinging Strike' },
    { value: 'foul', label: 'Foul' },
    { value: 'hit_by_pitch', label: 'HBP' },
    { value: 'in_play', label: 'In Play' },
];

const formatResult = (r: string): string => r.replace(/_/g, ' ');

const EditResultModal: React.FC<EditResultModalProps> = ({ currentResult, onCancel, onSelect }) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel]);

    return (
        <EditOverlay onClick={onCancel}>
            <EditDialog onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-title">
                <EditTitle id="edit-title">Edit last pitch</EditTitle>
                {currentResult && (
                    <EditSubtitle>
                        Currently: <EditCurrentResult>{formatResult(currentResult)}</EditCurrentResult>
                    </EditSubtitle>
                )}
                <EditGrid>
                    {RESULT_OPTIONS.map((opt) => {
                        const isCurrent = opt.value === currentResult;
                        return (
                            <EditOption
                                key={opt.value}
                                type="button"
                                disabled={isCurrent}
                                isCurrent={isCurrent}
                                onClick={() => !isCurrent && onSelect(opt.value)}
                            >
                                <EditOptionLabel>{opt.label}</EditOptionLabel>
                                {isCurrent && <EditCurrentTag>current</EditCurrentTag>}
                            </EditOption>
                        );
                    })}
                </EditGrid>
                <EditCancel type="button" onClick={onCancel}>
                    Cancel
                </EditCancel>
            </EditDialog>
        </EditOverlay>
    );
};

export default EditResultModal;
