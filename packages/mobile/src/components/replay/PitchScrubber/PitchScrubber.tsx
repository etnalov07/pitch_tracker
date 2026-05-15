import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

interface Props {
    pitchCount: number;
    pitchIdx: number;
    onChange: (idx: number) => void;
}

const PitchScrubber: React.FC<Props> = ({ pitchCount, pitchIdx, onChange }) => {
    const theme = useTheme();
    const [trackWidth, setTrackWidth] = useState(0);
    const disabled = pitchCount <= 1;
    const denom = Math.max(1, pitchCount - 1);
    const thumbX = trackWidth > 0 ? (pitchIdx / denom) * trackWidth : 0;

    const onTrackLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

    const handleTrackPress = (e: { nativeEvent: { locationX: number } }) => {
        if (disabled || trackWidth <= 0) return;
        const ratio = Math.min(1, Math.max(0, e.nativeEvent.locationX / trackWidth));
        onChange(Math.round(ratio * denom));
    };

    return (
        <View style={styles.container}>
            <IconButton
                icon="chevron-left"
                size={24}
                onPress={() => onChange(Math.max(0, pitchIdx - 1))}
                disabled={pitchIdx <= 0}
            />
            <Pressable onPress={handleTrackPress} style={styles.trackArea} onLayout={onTrackLayout}>
                <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]} />
                {!disabled && <View style={[styles.thumb, { backgroundColor: theme.colors.primary, left: thumbX - 10 }]} />}
            </Pressable>
            <IconButton
                icon="chevron-right"
                size={24}
                onPress={() => onChange(Math.min(pitchCount - 1, pitchIdx + 1))}
                disabled={pitchIdx >= pitchCount - 1}
            />
            <Text variant="labelLarge" style={styles.counter}>
                {pitchIdx + 1} / {pitchCount}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
    },
    trackArea: {
        flex: 1,
        height: 32,
        justifyContent: 'center',
    },
    track: {
        height: 4,
        borderRadius: 2,
    },
    thumb: {
        position: 'absolute',
        top: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    counter: {
        marginLeft: 6,
        minWidth: 56,
        textAlign: 'right',
    },
});

export default PitchScrubber;
