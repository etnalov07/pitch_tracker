import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Text } from 'react-native';
import { getInputLevel } from '../../../utils/walkieTalkie';

interface WalkieTalkieButtonProps {
    /** Whether the button is disabled (e.g., BT disconnected) */
    disabled?: boolean;
    /** Called when the coach presses in (start talking) */
    onPressIn: () => void;
    /** Called when the coach releases (stop talking) */
    onPressOut: () => void;
    /** Whether the walkie-talkie is currently active */
    isActive: boolean;
}

const WalkieTalkieButton: React.FC<WalkieTalkieButtonProps> = ({ disabled, onPressIn, onPressOut, isActive }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [audioLevel, setAudioLevel] = useState(0);
    const levelInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Pulsing ring animation when active
    useEffect(() => {
        if (isActive) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isActive, pulseAnim]);

    // Poll input level for the audio meter
    useEffect(() => {
        if (isActive) {
            levelInterval.current = setInterval(() => {
                setAudioLevel(getInputLevel());
            }, 80);
            return () => {
                if (levelInterval.current) clearInterval(levelInterval.current);
            };
        } else {
            setAudioLevel(0);
            if (levelInterval.current) clearInterval(levelInterval.current);
        }
    }, [isActive]);

    return (
        <View style={styles.wrapper}>
            <Animated.View
                style={[styles.pulseRing, isActive && styles.pulseRingActive, { transform: [{ scale: isActive ? pulseAnim : 1 }] }]}
            >
                <Pressable
                    style={[styles.button, isActive && styles.buttonActive, disabled && styles.buttonDisabled]}
                    onPressIn={disabled ? undefined : onPressIn}
                    onPressOut={disabled ? undefined : onPressOut}
                    disabled={disabled}
                >
                    <Text style={[styles.micIcon, isActive && styles.micIconActive]}>{isActive ? '🎙' : '🎙'}</Text>
                </Pressable>
            </Animated.View>

            <Text style={[styles.label, isActive && styles.labelActive]}>
                {disabled ? 'NO BT' : isActive ? 'TALKING...' : 'HOLD TO TALK'}
            </Text>

            {/* Audio level meter */}
            {isActive && (
                <View style={styles.meterContainer}>
                    <View style={[styles.meterFill, { width: `${Math.max(audioLevel * 100, 5)}%` }]} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        gap: 4,
    },
    pulseRing: {
        borderRadius: 34,
        borderWidth: 3,
        borderColor: 'transparent',
        padding: 2,
    },
    pulseRingActive: {
        borderColor: '#EF4444',
    },
    button: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1E293B',
        borderWidth: 2,
        borderColor: '#2A3A55',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    buttonDisabled: {
        opacity: 0.3,
    },
    micIcon: {
        fontSize: 24,
    },
    micIconActive: {},
    label: {
        fontSize: 8,
        fontWeight: '700',
        color: '#5A6278',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    labelActive: {
        color: '#EF4444',
    },
    meterContainer: {
        width: 60,
        height: 4,
        backgroundColor: '#1E293B',
        borderRadius: 2,
        overflow: 'hidden',
    },
    meterFill: {
        height: '100%',
        backgroundColor: '#22C55E',
        borderRadius: 2,
    },
});

export default WalkieTalkieButton;
