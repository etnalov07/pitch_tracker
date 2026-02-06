import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Table = styled.table({
    width: '100%',
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    borderCollapse: 'collapse',
    overflow: 'hidden',
});

export const Th = styled.th<{ align?: string }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    background: theme.colors.gray[50],
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
}));

export const Row = styled.tr({
    cursor: 'pointer',
    transition: 'background-color 0.15s',

    '&:hover': {
        backgroundColor: theme.colors.gray[50],
    },
});

export const Td = styled.td<{ align?: string; highlight?: boolean }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    verticalAlign: 'middle',
    color: props.highlight ? theme.colors.green[600] : theme.colors.gray[800],
    fontWeight: props.highlight ? theme.fontWeight.semibold : theme.fontWeight.normal,

    'tr:last-child &': {
        borderBottom: 'none',
    },
}));

export const IntensityBadge = styled.span<{ intensity: 'low' | 'medium' | 'high' }>((props) => {
    const colors = {
        low: { bg: '#dcfce7', text: '#16a34a' },
        medium: { bg: '#fef9c3', text: '#ca8a04' },
        high: { bg: '#fee2e2', text: '#dc2626' },
    };
    const c = colors[props.intensity];
    return {
        display: 'inline-block',
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        backgroundColor: c.bg,
        color: c.text,
        borderRadius: theme.borderRadius.sm,
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        textTransform: 'capitalize' as const,
    };
});

export const ViewButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.primary[300]}`,
    color: theme.colors.primary[600],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.medium,

    '&:hover': {
        background: theme.colors.primary[50],
    },
});

export const EmptyState = styled.div({
    textAlign: 'center',
    padding: theme.spacing.xl,
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    color: theme.colors.gray[500],
    fontSize: theme.fontSize.base,
});
