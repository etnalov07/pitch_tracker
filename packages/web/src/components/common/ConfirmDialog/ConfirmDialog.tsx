import React, { useEffect } from 'react';
import {
    ConfirmOverlay,
    ConfirmDialog as ConfirmBox,
    ConfirmTitle,
    ConfirmMessage,
    ConfirmActions,
    CancelBtn,
    ConfirmBtn,
} from './styles';

interface ConfirmDialogViewProps {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialogView: React.FC<ConfirmDialogViewProps> = ({
    title,
    message,
    confirmLabel,
    cancelLabel,
    destructive,
    onConfirm,
    onCancel,
}) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel]);

    return (
        <ConfirmOverlay onClick={onCancel}>
            <ConfirmBox onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                <ConfirmTitle id="confirm-title">{title}</ConfirmTitle>
                {message && <ConfirmMessage>{message}</ConfirmMessage>}
                <ConfirmActions>
                    <CancelBtn type="button" onClick={onCancel}>
                        {cancelLabel ?? 'Cancel'}
                    </CancelBtn>
                    <ConfirmBtn type="button" destructive={destructive ?? false} onClick={onConfirm} autoFocus>
                        {confirmLabel ?? (destructive ? 'Delete' : 'OK')}
                    </ConfirmBtn>
                </ConfirmActions>
            </ConfirmBox>
        </ConfirmOverlay>
    );
};

export default ConfirmDialogView;
