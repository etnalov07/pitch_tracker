import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const Header = styled.header({
    background: 'white',
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const BackButton = styled.button({
    background: 'none',
    border: 'none',
    color: theme.colors.primary[600],
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    '&:hover': { background: theme.colors.gray[100] },
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const PrimaryButton = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    '&:hover': { backgroundColor: theme.colors.primary[700] },
    '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
});

export const Content = styled.main({
    maxWidth: '1000px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const OpponentGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: theme.spacing.lg,
});

export const OpponentCard = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
    cursor: 'pointer',
    border: `1px solid ${theme.colors.gray[200]}`,
    transition: 'transform 0.15s, box-shadow 0.15s',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows.md },
});

export const OpponentName = styled.div({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    marginBottom: theme.spacing.xs,
});

export const OpponentMeta = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

export const EmptyState = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['2xl'],
    textAlign: 'center',
    color: theme.colors.gray[500],
});

export const FormCard = styled.div({
    background: 'white',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    marginBottom: theme.spacing.lg,
});

export const FormRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
});

export const FormGroup = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const Label = styled.label({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
});

export const Input = styled.input({
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
});

export const FormActions = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
});

export const CancelButton = styled.button({
    background: 'white',
    border: `1px solid ${theme.colors.gray[300]}`,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
});

export const ErrorText = styled.div({
    color: theme.colors.red[600],
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
});

export const LoadingText = styled.div({
    textAlign: 'center',
    padding: theme.spacing['2xl'],
    color: theme.colors.gray[500],
});
