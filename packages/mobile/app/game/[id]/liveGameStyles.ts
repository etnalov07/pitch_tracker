import { StyleSheet } from 'react-native';

import { colors, semantic } from '../../../src/styles/theme';

/**
 * Shared StyleSheet for the live-game layout components.
 * Used by LiveGameTablet, LiveGamePhone, and LiveGameRenderHelpers.
 * Extracted from live.tsx as part of UX audit item C continuation 3b.
 */
export const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    tabletContent: { flex: 1, flexDirection: 'row' },
    statsPanel: { width: 320, borderRightWidth: 1, borderRightColor: 'rgba(128,128,128,0.25)' },
    statsPanelContent: { padding: 16 },
    sidebarPanels: { marginTop: 12, gap: 12 },
    statsPlaceholder: { marginTop: 16 },
    mainPanel: { flex: 1 },
    mainPanelContent: { padding: 12, gap: 8 },
    // iPad: bound + center the strike zone (capped) so the single
    // pitch-type → zone → result column fits without scrolling on landscape iPad.
    tabletZoneWrap: { width: '72%', maxWidth: 374, alignSelf: 'center' },
    phoneContent: { flex: 1 },
    phoneContentInner: { padding: 10, gap: 8 },
    placeholder: { marginTop: 4, opacity: 0.7 },
    logButton: { marginTop: 4 },
    logRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
    undoButton: { borderColor: colors.red[700] },
    logButtonContent: { paddingVertical: 6 },
    zoneHint: { fontSize: 12, opacity: 0.75, marginBottom: 4, marginTop: 2 },
    zoneHintBold: { fontWeight: '700' },
    zoneHintReady: { color: colors.green[600] },
    actualEqualsTargetButton: { marginTop: 4 },
    startAtBatButton: { marginTop: 6 },
    selectPrompt: { marginTop: 6, padding: 12, backgroundColor: semantic.warningBg, borderRadius: 8, alignItems: 'center' },
    selectPromptText: { color: semantic.warningText, fontSize: 14, fontWeight: '500' },
    tendenciesRow: { flexDirection: 'row' as const, gap: 8, marginTop: 6 },
    tendencyBtn: { flex: 1 },
    tendencyBtnHitter: { borderColor: colors.green[600] },
    tendencyBtnLabel: { fontSize: 11 },
    tendencyBtnLabelHitter: { color: colors.green[600] },
    callRow: {
        flexDirection: 'row' as const,
        gap: 8,
        alignItems: 'stretch' as const,
    },
    sendCallButton: {
        flex: 1,
        backgroundColor: colors.amber[500],
    },
    talkHoldButton: {
        borderWidth: 2,
        borderColor: colors.purple[600],
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 2,
    },
    talkHoldButtonActive: {
        borderColor: colors.red[500],
        backgroundColor: 'rgba(239, 68, 68, 0.13)',
    },
    talkHoldIcon: {
        fontSize: 16,
    },
    talkHoldIconActive: {},
    talkHoldLabel: {
        fontSize: 9,
        fontWeight: '700' as const,
        color: colors.purple[600],
    },
    talkHoldLabelActive: {
        color: colors.red[500],
    },
    talkHoldSmall: {
        borderWidth: 1,
        borderColor: colors.purple[600],
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    talkHoldSmallLabel: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: colors.purple[600],
    },
    callBadge: {
        backgroundColor: colors.scoreboard.navyLight,
        borderWidth: 1.5,
        borderColor: colors.scoreboard.amber,
        borderRadius: 8,
        padding: 10,
        alignItems: 'center' as const,
    },
    callBadgeText: {
        fontSize: 13,
        fontWeight: '700' as const,
        color: colors.scoreboard.chalk,
        letterSpacing: 0.5,
    },
    callActions: {
        flexDirection: 'row' as const,
        gap: 8,
        marginTop: 6,
    },
    // SHAKE button styled to sit inline inside the pitch-calling row (next to
    // SEND + Hold-to-Talk, or inside the active-call action bar). Same colors
    // as the legacy stand-alone shakeBtn, sized to match the talk-hold buttons.
    shakeBtnInline: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.amber[600],
    },
    // Undo + Previous At-Bats — two between-pitches buttons pair naturally on
    // one row. Each child is independently conditional.
    undoPrevRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
        marginTop: 4,
        flexWrap: 'wrap' as const,
    },
    shakeBtn: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.amber[600],
    },
    shakeBtnText: {
        fontSize: 11,
        fontWeight: '700' as const,
        color: colors.amber[600],
    },
    shakeBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.amber[600],
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    shakeBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '700' as const,
    },
    veloRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    veloLabel: {
        fontSize: 13,
        fontWeight: '600' as const,
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    veloInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.4)',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '600' as const,
        textAlign: 'center' as const,
    },
    pitchFilterBar: {
        flexDirection: 'row' as const,
        gap: 6,
        paddingHorizontal: 4,
        paddingVertical: 6,
    },
    pitchFilterChip: {},
    pitchFilterChipText: {
        fontSize: 12,
    },
    pitchFilterChipTextActive: {
        fontSize: 12,
        color: '#ffffff',
    },
    breakdownTable: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.25)',
        overflow: 'hidden' as const,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '700' as const,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    breakdownRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
    },
    breakdownHeaderText: {
        fontSize: 11,
        fontWeight: '700' as const,
        opacity: 0.7,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    breakdownTypeCell: {
        flex: 2,
        fontSize: 13,
    },
    breakdownNumCell: {
        flex: 1,
        fontSize: 13,
        textAlign: 'center' as const,
    },
    breakdownText: {
        fontSize: 13,
    },
    typeColorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    breakdownTotalRow: {
        borderBottomWidth: 0,
    },
    breakdownTotalText: {
        fontSize: 13,
        fontWeight: '700' as const,
    },
    roleSelectContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    roleSelectTitle: {
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    roleSelectSubtitle: {
        marginBottom: 32,
        textAlign: 'center',
    },
    roleSelectButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    roleButton: {
        minWidth: 120,
    },
    lineupBanner: {
        flexDirection: 'row' as const,
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: semantic.warningBg,
        borderWidth: 1,
        borderColor: semantic.warningBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 6,
    },
    lineupBannerText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: semantic.warningText,
        flex: 1,
    },
    lineupBannerBtn: {
        backgroundColor: colors.amber[600],
    },
});
