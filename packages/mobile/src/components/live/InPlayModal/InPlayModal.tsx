import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import Svg, { Path, Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import * as Haptics from '../../../utils/haptics';
import { colors } from '../../../styles/theme';

export type HitType = 'fly_ball' | 'line_drive' | 'ground_ball';

export interface HitLocation {
    x: number;
    y: number;
    hitType: HitType;
}

interface InPlayModalProps {
    visible: boolean;
    onDismiss: () => void;
    onResult: (result: string, hitLocation?: HitLocation, fieldedBy?: string) => void;
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

// Fielder positions as 0–100 percentages (matches deriveFielderPosition coordinate space)
const FIELDER_POSITIONS_PCT: Record<string, { x: number; y: number; label: string }> = {
    CF: { x: 50, y: 12, label: 'CF' },
    LF: { x: 20, y: 22, label: 'LF' },
    RF: { x: 80, y: 22, label: 'RF' },
    SS: { x: 36, y: 46, label: 'SS' },
    '2B': { x: 62, y: 46, label: '2B' },
    '3B': { x: 20, y: 58, label: '3B' },
    '1B': { x: 80, y: 58, label: '1B' },
    P: { x: 50, y: 60, label: 'P' },
    C: { x: 50, y: 88, label: 'C' },
};

// Radius for tap-detection in percentage space
const FIELDER_HIT_RADIUS_PCT = 6;
// Circle radius in SVG units
const FIELDER_R = 13;

function deriveFielderPosition(x: number, y: number): string | null {
    const dx = x - 50;
    const dy = 82 - y;
    if (dy <= 2) return null;
    const angleDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 38) {
        if (angleDeg < -22) return 'LF';
        if (angleDeg > 22) return 'RF';
        return 'CF';
    }
    if (dist < 12) return 'P';
    if (angleDeg < -33) return '3B';
    if (angleDeg < -10) return 'SS';
    if (angleDeg < 10) return '2B';
    if (angleDeg < 33) return '1B';
    return '1B';
}

const InPlayModal: React.FC<InPlayModalProps> = ({ visible, onDismiss, onResult }) => {
    const [hitType, setHitType] = useState<HitType>('line_drive');
    const [hitLocation, setHitLocation] = useState<HitLocation | null>(null);
    const [selectedFielder, setSelectedFielder] = useState<string | null>(null);

    if (!visible) return null;

    const handleSvgPress = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        const x = (locationX / FIELD_SIZE) * 100;
        const y = (locationY / FIELD_SIZE) * 100;

        // Check if the tap landed on a fielder circle
        const tappedFielder = Object.entries(FIELDER_POSITIONS_PCT).find(([_, pos]) => {
            const dx = x - pos.x;
            const dy = y - pos.y;
            return Math.sqrt(dx * dx + dy * dy) < FIELDER_HIT_RADIUS_PCT;
        });

        if (tappedFielder) {
            Haptics.selectionAsync();
            setSelectedFielder(tappedFielder[0]);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setHitLocation({ x, y, hitType });
            const derived = deriveFielderPosition(x, y);
            if (derived && !selectedFielder) setSelectedFielder(derived);
        }
    };

    const handleResultSelect = (result: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onResult(result, hitLocation || undefined, selectedFielder || undefined);
        setHitLocation(null);
        setHitType('line_drive');
        setSelectedFielder(null);
    };

    const handleClose = () => {
        setHitLocation(null);
        setHitType('line_drive');
        setSelectedFielder(null);
        onDismiss();
    };

    const homePos = { x: CENTER, y: FIELD_SIZE * 0.82 };
    const firstPos = { x: CENTER + FIELD_SIZE * 0.25, y: FIELD_SIZE * 0.55 };
    const secondPos = { x: CENTER, y: FIELD_SIZE * 0.38 };
    const thirdPos = { x: CENTER - FIELD_SIZE * 0.25, y: FIELD_SIZE * 0.55 };

    return (
        <View style={styles.overlay}>
            <View style={styles.modal}>
                <View style={styles.header}>
                    <Text variant="titleLarge" style={styles.title}>
                        Record Play Result
                    </Text>
                    <IconButton icon="close" onPress={handleClose} size={24} />
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Hit Type Selector */}
                    <View style={styles.hitTypeRow}>
                        {(['fly_ball', 'line_drive', 'ground_ball'] as HitType[]).map((type) => (
                            <View
                                key={type}
                                style={[styles.hitTypeButton, hitType === type && styles.hitTypeButtonActive]}
                                onTouchEnd={() => {
                                    setHitType(type);
                                    Haptics.selectionAsync();
                                }}
                            >
                                <Text style={[styles.hitTypeText, hitType === type && styles.hitTypeTextActive]}>
                                    {type === 'fly_ball' ? 'Fly Ball' : type === 'line_drive' ? 'Line Drive' : 'Ground Ball'}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Field instructions */}
                    <Text style={styles.fieldInstruction}>
                        Tap field to mark hit location · Tap fielder to select who made the play
                    </Text>

                    {/* Selected fielder indicator */}
                    {selectedFielder && (
                        <Text style={styles.fielderIndicator}>
                            Fielded by: <Text style={styles.fielderName}>{selectedFielder}</Text>
                        </Text>
                    )}

                    {/* Baseball Field */}
                    <View style={styles.fieldContainer}>
                        <Svg
                            width={FIELD_SIZE}
                            height={FIELD_SIZE}
                            viewBox={`0 0 ${FIELD_SIZE} ${FIELD_SIZE}`}
                            onPress={handleSvgPress}
                        >
                            {/* Transparent background to capture all field taps */}
                            <Rect x={0} y={0} width={FIELD_SIZE} height={FIELD_SIZE} fill="transparent" />

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
                            <Line
                                x1={homePos.x}
                                y1={homePos.y}
                                x2={firstPos.x}
                                y2={firstPos.y}
                                stroke="#374151"
                                strokeWidth={1.5}
                                opacity={0.5}
                            />
                            <Line
                                x1={firstPos.x}
                                y1={firstPos.y}
                                x2={secondPos.x}
                                y2={secondPos.y}
                                stroke="#374151"
                                strokeWidth={1.5}
                                opacity={0.5}
                            />
                            <Line
                                x1={secondPos.x}
                                y1={secondPos.y}
                                x2={thirdPos.x}
                                y2={thirdPos.y}
                                stroke="#374151"
                                strokeWidth={1.5}
                                opacity={0.5}
                            />
                            <Line
                                x1={thirdPos.x}
                                y1={thirdPos.y}
                                x2={homePos.x}
                                y2={homePos.y}
                                stroke="#374151"
                                strokeWidth={1.5}
                                opacity={0.5}
                            />

                            {/* Bases */}
                            <Circle cx={homePos.x} cy={homePos.y} r={5} fill="white" stroke="#374151" strokeWidth={1.5} />
                            <Circle cx={firstPos.x} cy={firstPos.y} r={4} fill="white" stroke="#374151" strokeWidth={1.5} />
                            <Circle cx={secondPos.x} cy={secondPos.y} r={4} fill="white" stroke="#374151" strokeWidth={1.5} />
                            <Circle cx={thirdPos.x} cy={thirdPos.y} r={4} fill="white" stroke="#374151" strokeWidth={1.5} />

                            {/* Pitcher's mound */}
                            <Circle cx={CENTER} cy={FIELD_SIZE * 0.6} r={4} fill="#d4a76a" stroke="#374151" strokeWidth={1} />

                            {/* Fielder circles */}
                            {Object.entries(FIELDER_POSITIONS_PCT).map(([pos, data]) => {
                                const cx = (data.x / 100) * FIELD_SIZE;
                                const cy = (data.y / 100) * FIELD_SIZE;
                                const isSelected = selectedFielder === pos;
                                return (
                                    <G key={pos}>
                                        <Circle
                                            cx={cx}
                                            cy={cy}
                                            r={FIELDER_R}
                                            fill={isSelected ? '#1e3a5f' : 'rgba(255,255,255,0.88)'}
                                            stroke={isSelected ? '#1e3a5f' : '#6b7280'}
                                            strokeWidth={isSelected ? 2 : 1}
                                        />
                                        <SvgText
                                            x={cx}
                                            y={cy + 4}
                                            textAnchor="middle"
                                            fontSize={pos.length > 2 ? '8' : '9'}
                                            fill={isSelected ? '#ffffff' : '#374151'}
                                            fontWeight="700"
                                        >
                                            {data.label}
                                        </SvgText>
                                    </G>
                                );
                            })}

                            {/* Hit location marker */}
                            {hitLocation && (
                                <G>
                                    <Circle
                                        cx={(hitLocation.x / 100) * FIELD_SIZE}
                                        cy={(hitLocation.y / 100) * FIELD_SIZE}
                                        r={9}
                                        fill={colors.red[500]}
                                        stroke="white"
                                        strokeWidth={2}
                                        opacity={0.9}
                                    />
                                    <SvgText
                                        x={(hitLocation.x / 100) * FIELD_SIZE}
                                        y={(hitLocation.y / 100) * FIELD_SIZE + 4}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="white"
                                        fontWeight="bold"
                                    >
                                        ×
                                    </SvgText>
                                </G>
                            )}
                        </Svg>
                    </View>

                    {/* Result Selection */}
                    <Text style={styles.resultTitle}>Select Result {!hitLocation ? '(tap field first)' : ''}</Text>

                    <View style={styles.resultRow}>
                        {HIT_RESULTS.map(({ result, label }) => (
                            <View
                                key={result}
                                style={[styles.resultButton, styles.hitButton, !hitLocation && styles.resultButtonDisabled]}
                                onTouchEnd={() => hitLocation && handleResultSelect(result)}
                            >
                                <Text
                                    style={[
                                        styles.resultButtonText,
                                        styles.hitButtonText,
                                        !hitLocation && styles.resultButtonTextDisabled,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.resultRow}>
                        {OUT_RESULTS.map(({ result, label }) => (
                            <View
                                key={result}
                                style={[styles.resultButton, styles.outButton, !hitLocation && styles.resultButtonDisabled]}
                                onTouchEnd={() => hitLocation && handleResultSelect(result)}
                            >
                                <Text
                                    style={[
                                        styles.resultButtonText,
                                        styles.outButtonText,
                                        !hitLocation && styles.resultButtonTextDisabled,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.resultRow}>
                        {OTHER_RESULTS.map(({ result, label }) => (
                            <View
                                key={result}
                                style={[styles.resultButton, styles.otherButton, !hitLocation && styles.resultButtonDisabled]}
                                onTouchEnd={() => hitLocation && handleResultSelect(result)}
                            >
                                <Text
                                    style={[
                                        styles.resultButtonText,
                                        styles.otherButtonText,
                                        !hitLocation && styles.resultButtonTextDisabled,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </View>
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
        fontSize: 11,
        color: colors.gray[500],
        textAlign: 'center',
        marginBottom: 6,
    },
    fielderIndicator: {
        fontSize: 12,
        color: colors.gray[600],
        textAlign: 'center',
        marginBottom: 8,
    },
    fielderName: {
        fontWeight: '700',
        color: '#1e3a5f',
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
