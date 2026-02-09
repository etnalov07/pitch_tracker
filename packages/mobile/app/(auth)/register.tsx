import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText, SegmentedButtons } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAppDispatch, useAppSelector, registerUser, clearAuthError } from '../../src/state';

export default function RegisterScreen() {
    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.auth);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [registrationType, setRegistrationType] = useState<string>('coach');

    const handleRegister = () => {
        // Validation
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
            setLocalError('All fields are required');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        setLocalError(null);
        dispatch(
            registerUser({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                password,
                registration_type: registrationType as 'coach' | 'player' | 'org_admin',
            })
        );
    };

    const handleInputChange = () => {
        if (error) dispatch(clearAuthError());
        if (localError) setLocalError(null);
    };

    const displayError = localError || error;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Surface style={styles.surface} elevation={2}>
                    <Text variant="headlineMedium" style={styles.title}>
                        Create Account
                    </Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Join Pitch Chart
                    </Text>

                    <View style={styles.nameRow}>
                        <TextInput
                            label="First Name"
                            value={firstName}
                            onChangeText={(text) => {
                                setFirstName(text);
                                handleInputChange();
                            }}
                            mode="outlined"
                            autoCapitalize="words"
                            style={[styles.input, styles.nameInput]}
                        />
                        <TextInput
                            label="Last Name"
                            value={lastName}
                            onChangeText={(text) => {
                                setLastName(text);
                                handleInputChange();
                            }}
                            mode="outlined"
                            autoCapitalize="words"
                            style={[styles.input, styles.nameInput]}
                        />
                    </View>

                    <Text variant="bodyMedium" style={styles.roleLabel}>
                        I am a...
                    </Text>
                    <SegmentedButtons
                        value={registrationType}
                        onValueChange={setRegistrationType}
                        buttons={[
                            { value: 'coach', label: 'Coach' },
                            { value: 'player', label: 'Player' },
                            { value: 'org_admin', label: 'Org Admin' },
                        ]}
                        style={styles.segmentedButtons}
                    />

                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={(text) => {
                            setEmail(text);
                            handleInputChange();
                        }}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        style={styles.input}
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={(text) => {
                            setPassword(text);
                            handleInputChange();
                        }}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        style={styles.input}
                        right={
                            <TextInput.Icon
                                icon={showPassword ? 'eye-off' : 'eye'}
                                onPress={() => setShowPassword(!showPassword)}
                            />
                        }
                    />

                    <TextInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={(text) => {
                            setConfirmPassword(text);
                            handleInputChange();
                        }}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        style={styles.input}
                    />

                    {displayError && (
                        <HelperText type="error" visible={!!displayError}>
                            {displayError}
                        </HelperText>
                    )}

                    <Button
                        mode="contained"
                        onPress={handleRegister}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        Create Account
                    </Button>

                    <View style={styles.loginLink}>
                        <Text variant="bodyMedium">Already have an account? </Text>
                        <Link href="/login" asChild>
                            <Text variant="bodyMedium" style={styles.link}>
                                Sign In
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
    nameRow: {
        flexDirection: 'row',
        gap: 12,
    },
    nameInput: {
        flex: 1,
    },
    roleLabel: {
        marginBottom: 8,
        color: '#374151',
        fontWeight: '500',
    },
    segmentedButtons: {
        marginBottom: 16,
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
    loginLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    link: {
        color: '#2563eb',
        fontWeight: '600',
    },
});
