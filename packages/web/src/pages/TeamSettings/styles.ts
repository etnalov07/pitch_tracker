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

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: 'white',
    margin: 0,
});

export const Content = styled.main({
    maxWidth: '800px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const Section = styled.section({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
    marginBottom: theme.spacing.lg,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.lg} 0`,
    paddingBottom: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const FormGroup = styled.div({
    marginBottom: theme.spacing.lg,

    '&:last-child': {
        marginBottom: 0,
    },
});

export const Label = styled.label({
    display: 'block',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
});

export const Input = styled.input({
    width: '100%',
    padding: theme.spacing.md,
    fontSize: theme.fontSize.base,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    outline: 'none',
    transition: 'border-color 0.2s',

    '&:focus': {
        borderColor: theme.colors.primary[500],
    },
});

export const SaveButton = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    width: '100%',
    marginTop: theme.spacing.md,

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },

    '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
});

export const SuccessMessage = styled.div({
    background: theme.colors.green[50],
    color: theme.colors.green[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.lg,
});

export const ErrorMessage = styled.div({
    background: theme.colors.red[50],
    color: theme.colors.red[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.lg,
});

export const LoadingText = styled.p({
    textAlign: 'center',
    padding: theme.spacing['2xl'],
    color: theme.colors.gray[500],
});
