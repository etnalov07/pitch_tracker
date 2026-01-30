import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '../../styles/theme';

export type HitType = 'fly_ball' | 'line_drive' | 'ground_ball';

export interface HitLocation {
    x: number;
    y: number;
    hitType: HitType;
}

interface InPlayModalProps {
    visible: boolean;
    onDismiss: () => void;
    onResult: (result: string, hitLocation?: HitLocation) => void;
}

const HIT_RESULTS = [
    { result: 'single', label: 'Single', isOut: false },
    { result: 'double', label: 'Double', isOut: false },
    { result: 'triple', label: 'Triple', isOut: false },
    { result: 'home_run', label: 'HR', isOut: false },
];

const OUT_RESULTS = [
    { result: 'groundout', label: 'Groundout', isOut: true },
    { result: 'flyout', label: 'Flyout', isOut: true },
    { result: 'lineout', label: 'Lineout', isOut: true },
    { result: 'popout', label: 'Popout', isOut: true },
];

const OTHER_RESULTS = [
    { result: 'error', label: 'Error', isOut: false },
    { result: 'fielders_choice', label: 'FC', isOut: true },
    { result: 'double_play', label: 'DP', isOut: true },
    { result: 'sacrifice_fly', label: 'Sac Fly', isOut: true },
];

const FIELD_SIZE = 280;
const CENTER = FIELD_SIZE / 2;

const InPlayModal: React.FC<InPlayModalProps> = ({ visible, onDismiss, onResult }) => {
    const [hitType, setHitType] = useState<HitType>('line_drive');
    const [hitLocation, setHitLocation] = useState<HitLocation | null>(null);

    if (!visible) return null;

    const handleFieldPress = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        const x = (locationX / FIELD_SIZE) * 100;
        const y = (locationY / FIELD_SIZE) * 100;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setHitLocation({ x, y, hitType });
    };

    const handleResultSelect = (result: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onResult(result, hitLocation || undefined);
        // Reset state
        setHitLocation(null);
        setHitType('line_drive');
    };

    const handleClose = () => {
        setHitLocation(null);
        setHitType('line_drive');
        onDismiss();
    };

    // Diamond coordinates
    const homePos = { x: CENTER, y: FIELD_SIZE * 0.82 };
    const firstPos = { x: CENTER + FIELD_SIZE * 0.25, y: FIELD_SIZE * 0.55 };
    const secondPos = { x: CENTER, y: FIELD_SIZE * 0.38 };
    const thirdPos = { x: CENTER - FIELD_SIZE * 0.25, y: FIELD_SIZE * 0.55 };

    return (
        <View style={styles.overlay}>
            <View style={styles.modal}>
                <View style={styles.header}>
                    <Text variant="titleLarge" style={styles.title}>Record Play Result</Text>
                    <IconButton icon="close" onPress={handleClose} size={24} />
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Hit Type Selector */}
                    <View style={styles.hitTypeRow}>
                        {(['fly_ball', 'line_drive', 'ground_ball'] as HitType[]).map((type) => (
                            <Pressable
                                key={type}
                                style={[styles.hitTypeButton, hitType === type && styles.hitTypeButtonActive]}
                                onPress={() => { setHitType(type); Haptics.selectionAsync(); }}
                            >
                                <Text style={[styles.hitTypeText, hitType === type && styles.hitTypeTextActive]}>
                                    {type === 'fly_ball' ? 'Fly Ball' : type === 'line_drive' ? 'Line Drive' : 'Ground Ball'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Baseball Field */}
                    <Text style={styles.fieldInstruction}>
                        Tap the field to mark hit location
                    </Text>
                    <View style={styles.fieldContainer}>
                        <Pressable onPress={handleFieldPress}>
                            <Svg width={FIELD_SIZE} height={FIELD_SIZE} viewBox={`0 0 ${FIELD_SIZE} ${FIELD_SIZE}`}>
                                {/* Outfield grass */}
                                <Path
                                    d={`M ${CENTER} ${homePos.y} L ${FIELD_SIZE * 0.05} ${FIELD_SIZE * 0.15} A ${FIELD_SIZE * 0.55} ${FIELD_SIZE * 0.55} 0 0 1 ${FIELD_SIZE * 0.95} ${FIELD_SIZE * 0.15} Z`}
                                    fill="#4ade80"
                                    opacity={0.35}
                                />

                                {/* Infield dirt */}
                                <Path
                                    d={`M ${homePos.x} ${homePos.y} L ${firstPos.x} ${firstPos.y} L ${secondPos.x} ${secondPos.y} L ${thirdPos.x} ${thirdPos.y} Z`}
                                    fill="#d4a76a"
                                    opacity={0.4}
                                />

                                {/* Base paths */}
                                <Line x1={homePos.x} y1={homePos.y} x2={firstPos.x} y2={firstPos.y} stroke="#374151" strokeWidth={1.5} opacity={0.5} />
                                <Line x1={firstPos.x} y1={firstPos.y} x2={secondPos.x} y2={secondPos.y} stroke="#374151" strokeWidth={1.5} opacity={0.5} />
                                <Line x1={secondPos.x} y1={secondPos.y} x2={thirdPos.x} y2={thirdPos.y} stroke="#374151" strokeWidth={1.5} opacity={0.5} />
                                <Line x1={thirdPos.x} y1={thirdPos.y} x2={homePos.x} y2={homePos.y} stroke="#374151" strokeWidth={1.5} opacity={0.5} />

                                {/* Bases */}
                                <Circle cx={homePos.x} cy={homePos.y} r={6} fill="white" stroke="#374151" strokeWidth={1.5} />
                                <Circle cx={firstPos.x} cy={firstPos.y} r={5} fill="white" stroke="#374151" strokeWidth={1.5} />
                                <Circle cx={secondPos.x} cy={secondPos.y} r={5} fill="white" stroke="#374151" strokeWidth={1.5} />
                                <Circle cx={thirdPos.x} cy={thirdPos.y} r={5} fill="white" stroke="#374151" strokeWidth={1.5} />

                                {/* Pitcher's mound */}
                                <Circle cx={CENTER} cy={FIELD_SIZE * 0.6} r={4} fill="#d4a76a" stroke="#374151" strokeWidth={1} />

                                {/* Field position labels */}
                                <SvgText x={CENTER} y={FIELD_SIZE * 0.12} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">CF</SvgText>
                                <SvgText x={FIELD_SIZE * 0.2} y={FIELD_SIZE * 0.22} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">LF</SvgText>
                                <SvgText x={FIELD_SIZE * 0.8} y={FIELD_SIZE * 0.22} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">RF</SvgText>
                                <SvgText x={CENTER - 35} y={FIELD_SIZE * 0.5} textAnchor="middle" fontSize="10" fill="#374151">SS</SvgText>
                                <SvgText x={CENTER + 35} y={FIELD_SIZE * 0.48} textAnchor="middle" fontSize="10" fill="#374151">2B</SvgText>
                                <SvgText x={thirdPos.x - 15} y={thirdPos.y} textAnchor="middle" fontSize="10" fill="#374151">3B</SvgText>
                                <SvgText x={firstPos.x + 15} y={firstPos.y} textAnchor="middle" fontSize="10" fill="#374151">1B</SvgText>

                                {/* Hit location marker */}
                                {hitLocation && (
                                    <G>
                                        <Circle
                                            cx={(hitLocation.x / 100) * FIELD_SIZE}
                                            cy={(hitLocation.y / 100) * FIELD_SIZE}
                                            r={12}
                                            fill={colors.red[500]}
                                            stroke="white"
                                            strokeWidth={2.5}
                                            opacity={0.9}
                                        />
                                        <SvgText
                                            x={(hitLocation.x / 100) * FIELD_SIZE}
                                            y={(hitLocation.y / 100) * FIELD_SIZE + 4}
                                            textAnchor="middle"
                                            fontSize="14"
                                            fill="white"
                                            fontWeight="bold"
                                        >
                                            ×
                                        </SvgText>
                                    </G>
                                )}
                            </Svg>
                        </Pressable>
                    </View>

                    {/* Result Selection */}
                    <Text style={styles.resultTitle}>
                        Select Result {!hitLocation ? '(tap field first)' : ''}
                    </Text>

                    {/* Hit results row */}
                    <View style={styles.resultRow}>
                        {HIT_RESULTS.map(({ result, label }) => (
                            <Pressable
                                key={result}
                                style={[styles.resultButton, styles.hitButton, !hitLocation && styles.resultButtonDisabled]}
                                onPress={() => hitLocation && handleResultSelect(result)}
                                disabled={!hitLocation}
                            >
                                <Text style={[styles.resultButtonText, styles.hitButtonText, !hitLocation && styles.resultButtonTextDisabled]}>
                                    {label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Out results row */}
                    <View style={styles.resultRow}>
                        {OUT_RESULTS.map(({ result, label }) => (
                            <Pressable
                                key={result}
                                style={[styles.resultButton, styles.outButton, !hitLocation && styles.resultButtonDisabled]}
                                onPress={() => hitLocation && handleResultSelect(result)}
                                disabled={!hitLocation}
                            >
                                <Text style={[styles.resultButtonText, styles.outButtonText, !hitLocation && styles.resultButtonTextDisabled]}>
                                    {label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Other results row */}
                    <View style={styles.resultRow}>
                        {OTHER_RESULTS.map(({ result, label }) => (
                            <Pressable
                                key={result}
                                style={[styles.resultButton, styles.otherButton, !hitLocation && styles.resultButtonDisabled]}
                                onPress={() => hitLocation && handleResultSelect(result)}
                                disabled={!hitLocation}
                            >
                                <Text style={[styles.resultButtonText, styles.otherButtonText, !hitLocation && styles.resultButtonTextDisabled]}>
                                    {label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        width: '92%',
        maxWidth: 400,
        maxHeight: '90%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
    },
    title: {
        fontWeight: '700',
    },
    scrollContent: {
        padding: 16,
    },
    hitTypeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    hitTypeButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.gray[100],
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    hitTypeButtonActive: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[500],
    },
    hitTypeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray[600],
    },
    hitTypeTextActive: {
        color: colors.primary[700],
    },
    fieldInstruction: {
        fontSize: 12,
        color: colors.gray[500],
        textAlign: 'center',
        marginBottom: 8,
    },
    fieldContainer: {
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: colors.gray[50],
        borderRadius: 12,
        padding: 4,
    },
    resultTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray[700],
        marginBottom: 10,
    },
    resultRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 8,
    },
    resultButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultButtonDisabled: {
        opacity: 0.4,
    },
    hitButton: {
        backgroundColor: colors.green[500],
    },
    outButton: {
        backgroundColor: colors.red[500],
    },
    otherButton: {
        backgroundColor: colors.gray[500],
    },
    resultButtonText: {
        fontSize: 11,
        fontWeight: '700',
    },
    hitButtonText: {
        color: '#ffffff',
    },
    outButtonText: {
        color: '#ffffff',
    },
    otherButtonText: {
        color: '#ffffff',
    },
    resultButtonTextDisabled: {
        color: 'rgba(255,255,255,0.6)',
    },
});

export default InPlayModal;
