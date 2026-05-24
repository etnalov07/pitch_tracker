import React from 'react';
import { ToastContainer, ToastBar, ToastMessage, ToastAction, ToastDismiss } from './styles';

export type ToastType = 'info' | 'error' | 'success';

interface ToastViewProps {
    message: string;
    type: ToastType;
    action?: { label: string; onPress: () => void };
    onDismiss: () => void;
}

export const ToastView: React.FC<ToastViewProps> = ({ message, type, action, onDismiss }) => {
    return (
        <ToastContainer role="status" aria-live="polite">
            <ToastBar type={type}>
                <ToastMessage>{message}</ToastMessage>
                {action && (
                    <ToastAction
                        type="button"
                        onClick={() => {
                            action.onPress();
                            onDismiss();
                        }}
                    >
                        {action.label}
                    </ToastAction>
                )}
                <ToastDismiss type="button" aria-label="Dismiss" onClick={onDismiss}>
                    ×
                </ToastDismiss>
            </ToastBar>
        </ToastContainer>
    );
};

export default ToastView;
