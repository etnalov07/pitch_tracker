import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const ChartWrapper = styled.div({
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
});

export const ChartTable = styled.table({
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.xs,
    width: '100%',
    minWidth: 600,
    fontFamily: 'system-ui, sans-serif',

    'th, td': {
        border: `1px solid ${theme.colors.gray[300]}`,
        padding: '3px 5px',
        textAlign: 'center',
        whiteSpace: 'nowrap',
    },
});

export const SectionHeader = styled.th({
    background: theme.colors.gray[100],
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    fontSize: theme.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: `2px solid ${theme.colors.gray[400]}`,
});

export const CountHeaderCell = styled.th({
    background: theme.colors.gray[50],
    color: theme.colors.gray[600],
    fontWeight: theme.fontWeight.medium,
    minWidth: 32,
});

export const PitchTypeCell = styled.td({
    background: theme.colors.gray[50],
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    textAlign: 'left',
    paddingLeft: theme.spacing.xs,
    minWidth: 36,
});

export const CountCell = styled.td({
    color: theme.colors.gray[800],
    background: 'white',
    minWidth: 28,
});

export const TotalCell = styled.td({
    background: theme.colors.gray[100],
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
});

export const TotalRow = styled.tr({
    '& td': {
        borderTop: `2px solid ${theme.colors.gray[400]}`,
        background: theme.colors.gray[100],
        fontWeight: theme.fontWeight.semibold,
    },
});

export const KPctCell = styled.td<{ pct: number }>((props) => ({
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.xs,
    color:
        props.pct >= 65
            ? theme.colors.green[700]
            : props.pct >= 50
              ? theme.colors.yellow[700]
              : props.pct > 0
                ? theme.colors.red[600]
                : theme.colors.gray[400],
    background: 'white',
}));

export const EmptyText = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
    textAlign: 'center',
    margin: `${theme.spacing.md} 0`,
});

// Legacy exports kept for any remaining consumers
export const Panel = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    boxShadow: theme.shadows.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const PanelTitle = styled.h4({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    margin: `0 0 ${theme.spacing.md} 0`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});
