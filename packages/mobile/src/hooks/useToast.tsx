import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

// ============================================================
// DIAGNOSTIC INSTRUMENTATION — temp, remove once root-caused.
// Detects (a) double-bundling of this module (= two different
// ToastContext objects), (b) provider never mounted, (c) provider
// mounted but useToast called from outside its subtree.
// ============================================================
const TOAST_MODULE_ID = Math.random().toString(36).slice(2, 8);
let toastProviderMountCount = 0;
let toastProviderLiveCount = 0;
let toastUseCallCount = 0;
let toastUseFailCount = 0;
// Expose to other modules that want to log a snapshot (e.g. live-game controller)
// without re-importing private state.
export function _toastDiagnostics(): string {
    return `mod=${TOAST_MODULE_ID} providersMounted=${toastProviderMountCount} live=${toastProviderLiveCount} uses=${toastUseCallCount} fails=${toastUseFailCount}`;
}

const ToastContext = createContext<ToastContextValue | null>(null);
ToastContext.displayName = `ToastContext[${TOAST_MODULE_ID}]`;

interface ActiveToast extends ToastOptions {
    key: number;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const theme = useTheme();
    const [toast, setToast] = useState<ActiveToast | null>(null);
    const instanceIdRef = useRef<number>(0);
    if (instanceIdRef.current === 0) {
        instanceIdRef.current = ++toastProviderMountCount;
    }
    useEffect(() => {
        toastProviderLiveCount++;
        console.log(`[ToastProvider#${instanceIdRef.current}] mount (${_toastDiagnostics()})`);
        return () => {
            toastProviderLiveCount--;
            console.log(`[ToastProvider#${instanceIdRef.current}] UNMOUNT (${_toastDiagnostics()})`);
        };
    }, []);

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
    toastUseCallCount++;
    const ctx = useContext(ToastContext);
    if (!ctx) {
        toastUseFailCount++;
        const diag = _toastDiagnostics();
        const stack = new Error().stack ?? '(no stack)';
        // Surface diagnostics in the error message so they show up in the
        // ErrorBoundary screen on TestFlight (where console logs are invisible).
        // First 6 stack lines is enough to identify the caller.
        const stackTop = stack.split('\n').slice(0, 8).join(' | ');
        throw new Error(`useToast: ctx=null. ${diag}. callerStack: ${stackTop}`);
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
