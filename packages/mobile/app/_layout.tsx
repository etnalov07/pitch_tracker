import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme, InteractionManager } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';

import { store, useAppDispatch, useAppSelector, initializeAuth } from '../src/state';
import { lightTheme, darkTheme } from '../src/styles/theme';
// Offline service disabled for iOS 26.2 beta testing (TurboModule crash)
// import { startOfflineService, stopOfflineService } from '../src/services/offlineService';

export {
    ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
    initialRouteName: '(tabs)',
};

// expo-splash-screen removed for iOS 26.2 beta compatibility (native crash on launch)

function AuthGuard({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { isAuthenticated, initializing } = useAppSelector((state) => state.auth);
    const segments = useSegments();
    const router = useRouter();

    // Initialize auth and offline service on mount
    // Use InteractionManager to defer native module access until after animations complete
    // This helps avoid TurboModule race conditions on iOS 26 beta
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            const initialize = async () => {
                try {
                    await dispatch(initializeAuth());
                } catch (err) {
                    console.warn('Failed to initialize auth:', err);
                }

                // Offline service disabled for iOS 26.2 beta testing
                // try {
                //     await startOfflineService();
                // } catch (err) {
                //     console.warn('Failed to start offline service:', err);
                // }
            };

            initialize();
        });

        return () => {
            task.cancel();
            // stopOfflineService(); // Disabled for iOS 26.2 beta testing
        };
    }, [dispatch]);

    // Handle navigation based on auth state
    useEffect(() => {
        if (initializing) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inInvite = (segments[0] as string) === 'invite';

        if (!isAuthenticated && !inAuthGroup && !inInvite) {
            // Redirect to login if not authenticated (allow invite screen)
            router.replace('/login');
        } else if (isAuthenticated && inAuthGroup) {
            // Redirect to home if authenticated but on auth screen
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
        // SplashScreen.hideAsync() removed for iOS 26.2 beta compatibility
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
