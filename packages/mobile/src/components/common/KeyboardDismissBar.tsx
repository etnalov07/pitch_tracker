import React, { useEffect, useState } from 'react';
import { Keyboard, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

/**
 * Floating "Done" bar that appears above the keyboard whenever it is visible.
 * Tapping it dismisses the keyboard. Rendered at the root layout level so it
 * works across all screens without any per-screen wiring.
 */
const KeyboardDismissBar: React.FC = () => {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    if (keyboardHeight === 0) return null;

    return (
        <TouchableOpacity style={[styles.bar, { bottom: keyboardHeight }]} onPress={() => Keyboard.dismiss()} activeOpacity={0.8}>
            <Text style={styles.label}>Done</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    bar: {
        position: 'absolute',
        right: 0,
        left: 0,
        height: 36,
        backgroundColor: '#e5e7eb',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingHorizontal: 16,
        zIndex: 9999,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1d4ed8',
    },
});

export default KeyboardDismissBar;
