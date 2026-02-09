import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const Header = styled.header({
    background: 'linear-gradient(135deg, var(--team-primary) 0%, var(--team-secondary) 100%)',
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.lg,
});

export const BackButton = styled.button({
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'white',
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,

    '&:hover': {
        background: 'rgba(255, 255, 255, 0.2)',
    },
});

export const TeamInfo = styled.div({});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: 'white',
    margin: 0,
});

export const Subtitle = styled.p({
    fontSize: theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    margin: `${theme.spacing.xs} 0 0 0`,
});

export const Content = styled.main({
    maxWidth: '1000px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const FilterBar = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
});

export const FilterLabel = styled.span({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[600],
});

export const FilterSelect = styled.select({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    paddingRight: theme.spacing.xl,
    backgroundColor: 'white',
    color: theme.colors.gray[700],
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    minWidth: '180px',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },

    '&:hover': {
        borderColor: theme.colors.gray[400],
    },
});

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

export const NewSessionButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
});

export const LoadingText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[600],
    padding: theme.spacing.xl,
});

export const ErrorText = styled.p({
    textAlign: 'center',
    color: theme.colors.red[600],
    padding: theme.spacing.xl,
});
