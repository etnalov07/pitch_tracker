import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';

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
    const theme = useTheme();
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
        if (current) {
            current.resolve(value);
        }
        setPending(null);
    }, []);

    const value = useMemo<ConfirmFn>(() => confirm, [confirm]);

    const opts = pending?.opts;
    const destructive = opts?.destructive ?? false;
    const confirmColor = destructive ? theme.colors.error : theme.colors.primary;

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            <Portal>
                <Dialog visible={pending !== null} onDismiss={() => handleResolve(false)}>
                    {opts && (
                        <>
                            <Dialog.Title>{opts.title}</Dialog.Title>
                            {opts.message && (
                                <Dialog.Content>
                                    <Text variant="bodyMedium">{opts.message}</Text>
                                </Dialog.Content>
                            )}
                            <Dialog.Actions>
                                <Button onPress={() => handleResolve(false)}>{opts.cancelLabel ?? 'Cancel'}</Button>
                                <Button onPress={() => handleResolve(true)} textColor={confirmColor}>
                                    {opts.confirmLabel ?? (destructive ? 'Delete' : 'OK')}
                                </Button>
                            </Dialog.Actions>
                        </>
                    )}
                </Dialog>
            </Portal>
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
