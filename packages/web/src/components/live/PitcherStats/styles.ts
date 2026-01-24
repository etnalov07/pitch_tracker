import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Container = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.md,
});

export const Header = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const Title = styled.h3({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const TotalPitches = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.full,
});

export const SummaryRow = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.md,
});

export const SummaryStat = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
});

export const StatValue = styled.div<{ highlight?: boolean }>((props) => ({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: props.highlight ? theme.colors.green[600] : theme.colors.gray[900],
}));

export const StatLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
    textTransform: 'uppercase',
    fontWeight: theme.fontWeight.medium,
});

export const BreakdownSection = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const SectionTitle = styled.h4({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    margin: 0,
});

export const StatsTable = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
    '& thead tr': {
        borderBottom: `2px solid ${theme.colors.gray[200]}`,
    },
    '& tbody tr': {
        borderBottom: `1px solid ${theme.colors.gray[100]}`,
        '&:last-child': {
            borderBottom: 'none',
        },
        '&:hover': {
            backgroundColor: theme.colors.gray[50],
        },
    },
});

const getTdColor = (highlight?: boolean, velocity?: boolean): string => {
    if (highlight) return theme.colors.green[600];
    if (velocity) return theme.colors.primary[600];
    return theme.colors.gray[800];
};

export const Th = styled.th<{ align?: 'left' | 'right' | 'center' }>((props) => ({
    padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
    textAlign: props.align || 'left',
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    textTransform: 'uppercase',
    fontSize: theme.fontSize.xs,
}));

export const Td = styled.td<{ align?: 'left' | 'right' | 'center'; highlight?: boolean; velocity?: boolean }>((props) => ({
    padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
    textAlign: props.align || 'left',
    color: getTdColor(props.highlight, props.velocity),
    fontWeight: props.highlight || props.velocity ? theme.fontWeight.semibold : theme.fontWeight.normal,
}));

export const PitchTypeBadge = styled.span({
    display: 'inline-block',
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary[700],
    backgroundColor: theme.colors.primary[50],
    padding: `2px ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
});

export const LoadingText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[600],
    fontSize: theme.fontSize.base,
    padding: theme.spacing.lg,
});

export const EmptyText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    fontSize: theme.fontSize.sm,
    fontStyle: 'italic',
    padding: theme.spacing.lg,
});
