import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Snackbar, Text, useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';

export type ToastType = 'info' | 'error' | 'success';

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
    const theme = useTheme();
    const [toast, setToast] = useState<ActiveToast | null>(null);

    const show = useCallback((opts: ToastOptions) => {
        setToast({ ...opts, key: Date.now() });
    }, []);

    const hide = useCallback(() => {
        setToast(null);
    }, []);

    const value = useMemo(() => ({ show, hide }), [show, hide]);

    const duration = toast?.duration ?? (toast?.action ? 5000 : 3000);
    const bgColor =
        toast?.type === 'error'
            ? theme.colors.errorContainer
            : toast?.type === 'success'
              ? theme.colors.primaryContainer
              : theme.colors.inverseSurface;
    const textColor =
        toast?.type === 'error'
            ? theme.colors.onErrorContainer
            : toast?.type === 'success'
              ? theme.colors.onPrimaryContainer
              : theme.colors.inverseOnSurface;

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Snackbar
                key={toast?.key}
                visible={toast !== null}
                onDismiss={hide}
                duration={duration}
                style={[styles.snackbar, { backgroundColor: bgColor }]}
                action={
                    toast?.action
                        ? {
                              label: toast.action.label,
                              labelStyle: { color: textColor, fontWeight: '700' },
                              onPress: () => {
                                  toast.action!.onPress();
                                  hide();
                              },
                          }
                        : undefined
                }
            >
                <Text style={{ color: textColor }}>{toast?.message ?? ''}</Text>
            </Snackbar>
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

const styles = StyleSheet.create({
    snackbar: {
        marginBottom: 16,
        marginHorizontal: 16,
        borderRadius: 8,
    },
});
