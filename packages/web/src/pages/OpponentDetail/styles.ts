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
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const HeaderRight = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
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

export const Subtitle = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
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

export const SecondaryButton = styled.button({
    background: 'white',
    border: `1px solid ${theme.colors.gray[300]}`,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    color: theme.colors.gray[700],
    '&:hover': { background: theme.colors.gray[50] },
});

export const Content = styled.main({
    maxWidth: '1000px',
    margin: '0 auto',
    padding: theme.spacing.xl,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.xl,
    '@media (max-width: 700px)': {
        gridTemplateColumns: '1fr',
    },
});

export const Section = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.md}`,
    paddingBottom: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
});

export const RosterList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const RosterRow = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    background: theme.colors.gray[50],
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    '&:hover': { background: theme.colors.gray[100] },
});

export const RosterName = styled.span({
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[900],
});

export const RosterMeta = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

export const EmptyState = styled.div({
    color: theme.colors.gray[400],
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    padding: theme.spacing.lg,
});

export const StatGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
});

export const StatBox = styled.div({
    textAlign: 'center',
    padding: theme.spacing.md,
    background: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
});

export const StatValue = styled.div({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
});

export const StatLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: 2,
});

export const LoadingText = styled.div({
    textAlign: 'center',
    padding: theme.spacing['2xl'],
    color: theme.colors.gray[500],
});

export const ErrorText = styled.div({
    color: theme.colors.red[600],
    fontSize: theme.fontSize.sm,
    padding: theme.spacing.xl,
    textAlign: 'center',
});
