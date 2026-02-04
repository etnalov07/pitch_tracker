import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    padding: theme.spacing.lg,
});

export const Card = styled.div({
    width: '100%',
    maxWidth: '480px',
    background: 'white',
    borderRadius: theme.borderRadius['2xl'],
    boxShadow: theme.shadows.xl,
    padding: theme.spacing['2xl'],
    textAlign: 'center',
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: `0 0 ${theme.spacing.md} 0`,
});

export const Subtitle = styled.p({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    margin: `0 0 ${theme.spacing.xl} 0`,
});

export const InviteInfo = styled.div({
    background: theme.colors.gray[50],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    textAlign: 'left',
});

export const InfoRow = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${theme.spacing.sm} 0`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,

    '&:last-child': {
        borderBottom: 'none',
    },
});

export const InfoLabel = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    fontWeight: theme.fontWeight.medium,
});

export const InfoValue = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[900],
    fontWeight: theme.fontWeight.semibold,
});

export const AcceptButton = styled.button({
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: theme.spacing.md,

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.green[700],
    },

    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

export const BackLink = styled.a({
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary[600],
    cursor: 'pointer',
    textDecoration: 'none',

    '&:hover': {
        textDecoration: 'underline',
    },
});

export const ErrorText = styled.div({
    backgroundColor: theme.colors.red[50],
    border: `1px solid ${theme.colors.red[200]}`,
    color: theme.colors.red[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
});

export const SuccessText = styled.div({
    backgroundColor: theme.colors.green[50],
    border: `1px solid ${theme.colors.green[200]}`,
    color: theme.colors.green[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
});

export const LoadingText = styled.p({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[500],
});
