import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAppDispatch, useAppSelector, loginUser, clearAuthError } from '../../src/state';

export default function LoginScreen() {
    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = () => {
        if (!email.trim() || !password.trim()) {
            return;
        }
        dispatch(loginUser({ email: email.trim(), password }));
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (error) dispatch(clearAuthError());
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        if (error) dispatch(clearAuthError());
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Surface style={styles.surface} elevation={2}>
                    <Text variant="headlineMedium" style={styles.title}>
                        PitchChart
                    </Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Sign in to your account
                    </Text>

                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={handleEmailChange}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        style={styles.input}
                        error={!!error}
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={handlePasswordChange}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        style={styles.input}
                        error={!!error}
                        right={
                            <TextInput.Icon
                                icon={showPassword ? 'eye-off' : 'eye'}
                                onPress={() => setShowPassword(!showPassword)}
                            />
                        }
                    />

                    {error && (
                        <HelperText type="error" visible={!!error}>
                            {error}
                        </HelperText>
                    )}

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading || !email.trim() || !password.trim()}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Sign In
                    </Button>

                    <View style={styles.registerLink}>
                        <Text variant="bodyMedium">Don't have an account? </Text>
                        <Link href="/register" asChild>
                            <Text variant="bodyMedium" style={styles.link}>
                                Sign Up
                            </Text>
                        </Link>
                    </View>
                </Surface>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    surface: {
        padding: 24,
        borderRadius: 12,
        backgroundColor: '#ffffff',
    },
    title: {
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: 'bold',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 24,
        color: '#6b7280',
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
        marginBottom: 16,
    },
    buttonContent: {
        paddingVertical: 8,
    },
    registerLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    link: {
        color: '#334e68',
        fontWeight: '600',
    },
});
