import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Card = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.md,
});

export const NarrativeBox = styled.div({
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
    borderLeft: `4px solid ${theme.colors.primary[500]}`,
    fontStyle: 'italic',
    fontSize: theme.fontSize.base,
    lineHeight: '1.6',
    color: theme.colors.gray[700],
});

export const NarrativePlaceholder = styled.div({
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    fontStyle: 'italic',
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[400],
});

export const SectionTitle = styled.h3({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const MetricsGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: theme.spacing.md,
});

export const StatBox = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
});

export const StatValue = styled.span({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
});

export const StatLabel = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[400],
    fontWeight: theme.fontWeight.medium,
});

export const RatingBadge = styled.span<{ rating: 'highlight' | 'concern' | 'neutral' }>(({ rating }) => ({
    display: 'inline-block',
    padding: `2px ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    ...(rating === 'highlight' && {
        backgroundColor: theme.colors.green[100],
        color: theme.colors.green[600],
    }),
    ...(rating === 'concern' && {
        backgroundColor: theme.colors.red[100],
        color: theme.colors.red[600],
    }),
    ...(rating === 'neutral' && {
        backgroundColor: theme.colors.gray[100],
        color: theme.colors.gray[500],
    }),
}));

export const MetricRow = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.sm} 0`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    '&:last-child': {
        borderBottom: 'none',
    },
});

export const MetricName = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
});

export const MetricRight = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
});

export const DeltaText = styled.span<{ positive: boolean }>(({ positive }) => ({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: positive ? theme.colors.green[600] : theme.colors.red[600],
}));

export const StatsTable = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
});

export const Th = styled.th({
    textAlign: 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.sm}`,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[500],
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const Td = styled.td({
    padding: `${theme.spacing.sm} ${theme.spacing.sm}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
});

export const HighlightsList = styled.ul({
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const HighlightItem = styled.li({
    fontSize: theme.fontSize.sm,
    color: theme.colors.green[700],
    paddingLeft: theme.spacing.md,
    position: 'relative' as const,
    '&::before': {
        content: '"\\2022"',
        position: 'absolute' as const,
        left: 0,
    },
});

export const ConcernItem = styled.li({
    fontSize: theme.fontSize.sm,
    color: theme.colors.red[600],
    paddingLeft: theme.spacing.md,
    position: 'relative' as const,
    '&::before': {
        content: '"\\2022"',
        position: 'absolute' as const,
        left: 0,
    },
});

export const RegenerateButton = styled.button({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.gray[600],
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    alignSelf: 'flex-start',
    '&:hover': {
        backgroundColor: theme.colors.gray[200],
    },
    '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
});
