import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    maxWidth: '800px',
    margin: '0 auto',
    padding: theme.spacing['2xl'],
});

export const Header = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const BackButton = styled.button({
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.gray[50],
    },
});

export const SearchSection = styled.div({
    marginBottom: theme.spacing.xl,
});

export const SearchRow = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
});

export const SearchInput = styled.input({
    flex: 1,
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },

    '&::placeholder': {
        color: theme.colors.gray[400],
    },
});

export const SearchButton = styled.button({
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },

    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

export const ResultsList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
});

export const TeamResult = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    background: 'white',
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
});

export const TeamResultInfo = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const TeamResultName = styled.span({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
});

export const TeamResultCity = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
});

export const JoinButton = styled.button({
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.green[700],
    },

    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

export const Section = styled.div({
    marginBottom: theme.spacing.xl,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    marginBottom: theme.spacing.md,
});

export const RequestList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
});

export const RequestItem = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    background: 'white',
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
});

export const RequestInfo = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const RequestTeam = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[900],
});

export const RequestStatus = styled.span<{ status: string }>(({ status }) => ({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.full,
    backgroundColor:
        status === 'pending' ? theme.colors.yellow[100] :
        status === 'approved' ? theme.colors.green[100] :
        theme.colors.red[100],
    color:
        status === 'pending' ? theme.colors.yellow[700] :
        status === 'approved' ? theme.colors.green[700] :
        theme.colors.red[700],
}));

export const EmptyText = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    textAlign: 'center',
    padding: theme.spacing.xl,
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
