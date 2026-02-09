import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const Header = styled.header({
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.lg,
});

export const HeaderRight = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
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

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: 'white',
    margin: 0,
});

export const CreateButton = styled.button({
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

export const Content = styled.main({
    maxWidth: '1000px',
    margin: '0 auto',
    padding: theme.spacing.xl,
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

export const Td = styled.td<{ align?: string }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    verticalAlign: 'middle',
    color: theme.colors.gray[800],

    'tr:last-child &': {
        borderBottom: 'none',
    },
}));

export const Description = styled.span({
    color: theme.colors.gray[500],
    fontSize: theme.fontSize.sm,
});

export const EditButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.primary[300]}`,
    color: theme.colors.primary[600],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.medium,
    marginRight: theme.spacing.sm,

    '&:hover': {
        background: theme.colors.primary[50],
    },
});

export const DeleteButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.red[300]}`,
    color: theme.colors.red[600],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.medium,

    '&:hover': {
        background: theme.colors.red[50],
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
