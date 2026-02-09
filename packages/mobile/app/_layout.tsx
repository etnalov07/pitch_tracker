import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme, InteractionManager, Alert, Platform } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';

import { store, useAppDispatch, useAppSelector, initializeAuth } from '../src/state';
import { lightTheme, darkTheme } from '../src/styles/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
    initialRouteName: '(tabs)',
};

// Global JS error interceptor for iOS 26.2 beta debugging
// This captures the actual error message before RCTFatal kills the app
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
        // Log the error so we can see it in crash diagnostics
        const message = error?.message || String(error);
        const stack = error?.stack || '';
        console.error(`[FATAL JS ERROR] ${message}\n${stack}`);
        // Show alert so the user can report the error text
        try {
            Alert.alert('App Error (iOS 26.2 debug)', `${message}\n\nPlease screenshot this and report via TestFlight.`, [
                { text: 'OK' },
            ]);
        } catch {
            // Alert might not be available this early
        }
    }
    // For non-fatal errors, still call original handler
    // For fatal errors, do NOT call originalHandler — it triggers RCTFatal which kills
    // the process before Alert can display. We want to see the error message first.
    if (!isFatal && originalHandler) {
        originalHandler(error, isFatal);
    }
});

// Wrap splash screen in try-catch for iOS 26.2 beta compatibility
try {
    SplashScreen.preventAutoHideAsync();
} catch (e) {
    console.warn('SplashScreen.preventAutoHideAsync failed:', e);
}

function AuthGuard({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { isAuthenticated, initializing } = useAppSelector((state) => state.auth);
    const segments = useSegments();
    const router = useRouter();

    // Initialize auth on mount
    // Use InteractionManager to defer native module access until after animations complete
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            const initialize = async () => {
                try {
                    await dispatch(initializeAuth());
                } catch (err) {
                    console.warn('Failed to initialize auth:', err);
                }
            };

            initialize();
        });

        return () => {
            task.cancel();
        };
    }, [dispatch]);

    // Handle navigation based on auth state
    useEffect(() => {
        if (initializing) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inInvite = (segments[0] as string) === 'invite';

        if (!isAuthenticated && !inAuthGroup && !inInvite) {
            router.replace('/login');
        } else if (isAuthenticated && inAuthGroup) {
            router.replace('/');
        }
    }, [isAuthenticated, initializing, segments, router]);

    if (initializing) {
        return null;
    }

    return <>{children}</>;
}

function RootLayoutContent() {
    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

    return (
        <PaperProvider theme={theme}>
            <AuthGuard>
                <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="game/[id]/index"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="game/[id]/live"
                        options={{
                            headerShown: false,
                            gestureEnabled: false,
                        }}
                    />
                    <Stack.Screen name="game/[id]/setup" options={{ title: 'Game Setup' }} />
                    <Stack.Screen name="game/[id]/lineup" options={{ title: 'Opponent Lineup' }} />
                    <Stack.Screen name="team/[id]" options={{ title: 'Team Details' }} />
                    <Stack.Screen name="invite/[token]" options={{ title: 'Team Invite' }} />
                    <Stack.Screen name="join-team" options={{ title: 'Find a Team' }} />
                    <Stack.Screen name="+not-found" />
                </Stack>
            </AuthGuard>
        </PaperProvider>
    );
}

export default function RootLayout() {
    const [loaded, error] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        ...FontAwesome.font,
    });

    useEffect(() => {
        if (error) throw error;
    }, [error]);

    useEffect(() => {
        if (loaded) {
            try {
                SplashScreen.hideAsync();
            } catch (e) {
                console.warn('SplashScreen.hideAsync failed:', e);
            }
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        <ReduxProvider store={store}>
            <RootLayoutContent />
        </ReduxProvider>
    );
}
