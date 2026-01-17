import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

// Styled Components
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
    gap: theme.spacing.lg,
});

export const HeaderRight = styled.div({});

export const BackButton = styled.button({
    background: 'none',
    border: 'none',
    color: theme.colors.primary[600],
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,

    '&:hover': {
        background: theme.colors.gray[100],
    },
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const CreateButton = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const Content = styled.main({
    maxWidth: '1200px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const FormCard = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
    marginBottom: theme.spacing.xl,
});

export const FormTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.lg} 0`,
});

export const Form = styled.form({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
});

export const FormRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.lg,
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

export const FormActions = styled.div({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
});

export const CancelButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.gray[300]}`,
    color: theme.colors.gray[700],
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        background: theme.colors.gray[50],
    },
});

export const SubmitButton = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.primary[700],
    },

    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

export const ErrorMessage = styled.div({
    backgroundColor: theme.colors.red[50],
    border: `1px solid ${theme.colors.red[200]}`,
    color: theme.colors.red[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    fontSize: theme.fontSize.sm,
});

export const TeamGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: theme.spacing.lg,
});

export const TeamCard = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
});

export const TeamCardHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
});

export const TeamName = styled.h3({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: 0,
});

export const TeamAbbr = styled.span({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    background: theme.colors.primary[100],
    color: theme.colors.primary[700],
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
});

export const TeamCity = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    margin: `0 0 ${theme.spacing.lg} 0`,
});

export const TeamActions = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.gray[100]}`,
});

export const ViewButton = styled.button({
    flex: 1,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const DeleteButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.red[300]}`,
    color: theme.colors.red[600],
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        background: theme.colors.red[50],
    },
});

export const EmptyState = styled.div({
    textAlign: 'center',
    padding: theme.spacing['3xl'],
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
});

export const EmptyIcon = styled.div({
    fontSize: '64px',
    marginBottom: theme.spacing.lg,
});

export const EmptyTitle = styled.h3({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.sm} 0`,
});

export const EmptyText = styled.p({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    margin: `0 0 ${theme.spacing.xl} 0`,
});

export const CreateButtonLarge = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const LoadingText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[600],
    padding: theme.spacing.xl,
});
