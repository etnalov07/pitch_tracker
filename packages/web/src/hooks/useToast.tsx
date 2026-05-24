import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ToastView, type ToastType } from '../components/common/Toast';

export type { ToastType };

export interface ToastAction {
    label: string;
    onPress: () => void;
}

export interface ToastOptions {
    message: string;
    type?: ToastType;
    action?: ToastAction;
    duration?: number;
}

interface ToastContextValue {
    show: (opts: ToastOptions) => void;
    hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ActiveToast extends ToastOptions {
    key: number;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ActiveToast | null>(null);

    const hide = useCallback(() => {
        setToast(null);
    }, []);

    const show = useCallback((opts: ToastOptions) => {
        setToast({ ...opts, key: Date.now() });
    }, []);

    // Auto-dismiss after the configured duration. Reset the timer whenever a new toast appears.
    useEffect(() => {
        if (!toast) return;
        const duration = toast.duration ?? (toast.action ? 5000 : 3500);
        const handle = window.setTimeout(() => setToast(null), duration);
        return () => window.clearTimeout(handle);
    }, [toast]);

    const value = useMemo(() => ({ show, hide }), [show, hide]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast && (
                <ToastView
                    key={toast.key}
                    message={toast.message}
                    type={toast.type ?? 'info'}
                    action={toast.action}
                    onDismiss={hide}
                />
            )}
        </ToastContext.Provider>
    );
};

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return ctx;
}
