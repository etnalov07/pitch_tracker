import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const Header = styled.header({
    background: 'white',
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.lg,
});

export const BackButton = styled.button({
    background: 'none',
    border: 'none',
    color: theme.colors.primary[600],
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,

    '&:hover': {
        background: theme.colors.gray[100],
    },
});

export const ProfileInfo = styled.div({});

export const PitcherName = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const PitcherMeta = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
});

export const JerseyNumber = styled.span({
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary[600],
});

export const TeamName = styled.span({
    color: theme.colors.gray[700],
});

export const Content = styled.main({
    maxWidth: '1000px',
    margin: '0 auto',
    padding: theme.spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
});

export const CareerStatsCard = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
});

export const CareerStatsTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.md} 0`,
});

export const CareerStatsGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: theme.spacing.md,
});

export const StatBox = styled.div({
    textAlign: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
});

export const StatValue = styled.div<{ highlight?: boolean }>((props) => ({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: props.highlight ? theme.colors.green[600] : theme.colors.gray[900],
}));

export const StatLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});

export const PitchTypesCard = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
});

export const PitchTypesTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.md} 0`,
});

export const PitchTypesList = styled.div({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
});

export const PitchTypeBadge = styled.span({
    display: 'inline-block',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'capitalize',
});

export const GameLogsSection = styled.section({});

export const SectionHeader = styled.div({
    marginBottom: theme.spacing.md,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: 0,
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

export const ErrorContainer = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: theme.spacing.lg,
});
