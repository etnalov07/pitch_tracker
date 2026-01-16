import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

// Styled Components
export const Container = styled.div({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    padding: theme.spacing.lg,
});

export const FormCard = styled.div({
    width: '100%',
    maxWidth: '450px',
    background: 'white',
    borderRadius: theme.borderRadius['2xl'],
    boxShadow: theme.shadows.xl,
    padding: theme.spacing['2xl'],
});

export const Logo = styled.div({
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
    color: theme.colors.primary[600],
    marginBottom: theme.spacing.lg,
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    textAlign: 'center',
    margin: `0 0 ${theme.spacing.sm} 0`,
});

export const Subtitle = styled.p({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    textAlign: 'center',
    margin: `0 0 ${theme.spacing.xl} 0`,
});

export const ErrorMessage = styled.div({
    backgroundColor: theme.colors.red[50],
    border: `1px solid ${theme.colors.primary[200]}`,
    color: theme.colors.red[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
});

export const Form = styled.form({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
});

export const FormRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
});

export const FormGroup = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const Label = styled.label({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
});

export const Input = styled.input({
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    transition: 'all 0.2s',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },

    '&::placeholder': {
        color: theme.colors.gray[400],
    },
});

export const SubmitButton = styled.button({
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: theme.spacing.md,

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.primary[700],
    },

    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

export const ToggleText = styled.p({
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
});

export const ToggleLink = styled.span({
    color: theme.colors.primary[600],
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover': {
        color: theme.colors.primary[700],
        textDecoration: 'underline',
    },
});
