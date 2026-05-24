import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ConfirmDialogView } from '../components/common/ConfirmDialog';

export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm {
    opts: ConfirmOptions;
    resolve: (value: boolean) => void;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [pending, setPending] = useState<PendingConfirm | null>(null);
    const pendingRef = useRef<PendingConfirm | null>(null);
    pendingRef.current = pending;

    const confirm = useCallback<ConfirmFn>((opts) => {
        return new Promise<boolean>((resolve) => {
            setPending({ opts, resolve });
        });
    }, []);

    const handleResolve = useCallback((value: boolean) => {
        const current = pendingRef.current;
        if (current) current.resolve(value);
        setPending(null);
    }, []);

    const value = useMemo<ConfirmFn>(() => confirm, [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            {pending && (
                <ConfirmDialogView
                    title={pending.opts.title}
                    message={pending.opts.message}
                    confirmLabel={pending.opts.confirmLabel}
                    cancelLabel={pending.opts.cancelLabel}
                    destructive={pending.opts.destructive}
                    onConfirm={() => handleResolve(true)}
                    onCancel={() => handleResolve(false)}
                />
            )}
        </ConfirmContext.Provider>
    );
};

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return ctx;
}
