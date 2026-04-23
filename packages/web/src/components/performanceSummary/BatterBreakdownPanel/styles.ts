import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Wrapper = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
});

export const SectionHeader = styled.h3({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    margin: `${theme.spacing.sm} 0 ${theme.spacing.xs}`,
    paddingBottom: theme.spacing.xs,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const Legend = styled.div({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
});

export const LegendItem = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

export const LegendDot = styled.div<{ bg: string; border: string; isEnding?: boolean }>(({ bg, border, isEnding }) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: bg,
    border: `${isEnding ? 2 : 1}px solid ${border}`,
}));

export const HintText = styled.p({
    fontSize: 11,
    color: '#9ca3af',
    margin: `0 0 ${theme.spacing.sm}`,
    fontStyle: 'italic',
});

export const EmptyText = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[400],
    textAlign: 'center',
    padding: `${theme.spacing['2xl']} 0`,
});

export const BatterList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const BatterRowContainer = styled.div({
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.gray[100]}`,
    overflow: 'hidden',
});

export const BatterHeader = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.gray[50],
    cursor: 'pointer',
    userSelect: 'none' as const,
    '&:hover': { backgroundColor: theme.colors.gray[100] },
});

export const BatterOrderBadge = styled.div({
    width: 26,
    height: 26,
    borderRadius: '50%',
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    flexShrink: 0,
});

export const BatterNameBlock = styled.div({ flex: 1 });

export const BatterNameText = styled.span({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
});

export const BatterMetaText = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[400],
    marginLeft: theme.spacing.sm,
});

export const AtBatBlock = styled.div({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderTop: `1px solid ${theme.colors.gray[100]}`,
});

export const AtBatHeaderRow = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
});

export const AtBatInningLabel = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    minWidth: 52,
});

export const AtBatResultLabel = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[700],
    flex: 1,
});

export const PitchSequence = styled.div({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
});

export const PitchCard = styled.div<{ bg: string; isEnding: boolean }>(({ bg, isEnding }) => ({
    width: 44,
    minHeight: 52,
    borderRadius: 6,
    backgroundColor: bg,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    position: 'relative' as const,
    boxSizing: 'border-box' as const,
    ...(isEnding && { outline: '2px solid #eab308', outlineOffset: -2 }),
}));

export const PitchTextLine = styled.span<{ color: string; size?: number }>(({ color, size = 11 }) => ({
    fontSize: size,
    fontWeight: 700,
    color,
    lineHeight: 1.2,
}));

export const ViewToggleRow = styled.div({
    display: 'flex',
    gap: 2,
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderTop: `1px solid ${theme.colors.gray[100]}`,
    backgroundColor: theme.colors.gray[50],
});

export const ViewToggleBtn = styled.button<{ active: boolean }>(({ active }) => ({
    fontSize: 11,
    fontWeight: active ? theme.fontWeight.semibold : theme.fontWeight.normal,
    color: active ? theme.colors.primary[700] : theme.colors.gray[500],
    background: active ? theme.colors.primary[50] : 'none',
    border: `1px solid ${active ? theme.colors.primary[300] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.sm,
    padding: `2px ${theme.spacing.sm}`,
    cursor: 'pointer',
    transition: 'all 0.1s',
    '&:hover': { borderColor: theme.colors.primary[300], color: theme.colors.primary[600] },
}));

export const ChartContainer = styled.div({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderTop: `1px solid ${theme.colors.gray[100]}`,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
});

export const ChartsRow = styled.div({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
});

export const ChartLoading = styled.p({
    fontSize: 12,
    color: theme.colors.gray[400],
    fontStyle: 'italic',
    padding: `${theme.spacing.lg} 0`,
});

export const MiniZoneGrid = styled.div({
    width: 27,
    height: 27,
    display: 'flex',
    flexWrap: 'wrap' as const,
    border: '0.5px solid rgba(0,0,0,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative' as const,
    marginTop: 2,
    flexShrink: 0,
});

export const MiniZoneCell = styled.div<{ active: boolean; dotColor: string }>(({ active, dotColor }) => ({
    width: 9,
    height: 9,
    border: '0.5px solid rgba(0,0,0,0.1)',
    backgroundColor: active ? dotColor : 'rgba(255,255,255,0.35)',
    boxSizing: 'border-box' as const,
}));

export const MiniZoneWasteDot = styled.div<{ dotColor: string }>(({ dotColor }) => ({
    position: 'absolute' as const,
    top: 9,
    left: 9,
    width: 9,
    height: 9,
    borderRadius: '50%',
    backgroundColor: dotColor,
    opacity: 0.7,
}));
