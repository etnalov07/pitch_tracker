import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.surfaces.body,
});

export const Header = styled.header({
    background: 'linear-gradient(135deg, var(--header-bg-start) 0%, var(--header-bg-end) 100%)',
    color: 'white',
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const HeaderLeft = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const HeaderRight = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const TeamName = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    margin: 0,
});

export const SubLine = styled.p({
    margin: 0,
    opacity: 0.9,
    fontSize: theme.fontSize.sm,
});

export const TeamSwitcher = styled.select({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: '1px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: 'white',
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
});

export const LogoutButton = styled.button({
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
});

export const MainContent = styled.main({
    padding: theme.spacing.xl,
    maxWidth: 800,
    margin: '0 auto',
});

export const Section = styled.section({
    backgroundColor: theme.surfaces.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
    marginBottom: theme.spacing.md,
});

export const StatsPlaceholder = styled.p({
    color: theme.colors.gray[600],
    fontStyle: 'italic',
    margin: 0,
});

export const EmptyState = styled.div({
    textAlign: 'center',
    padding: theme.spacing['3xl'],
    color: theme.colors.gray[600],
});

export const EmptyTitle = styled.h2({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
    marginBottom: theme.spacing.sm,
});

export const EmptyText = styled.p({
    margin: 0,
    color: theme.colors.gray[600],
});

export const StatBlock = styled.div({
    marginBottom: theme.spacing.lg,
    ':last-of-type': {
        marginBottom: 0,
    },
});

export const StatBlockTitle = styled.h3({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    margin: 0,
    marginBottom: theme.spacing.md,
});

export const StatGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
    gap: theme.spacing.md,
});

export const StatItem = styled.div({
    textAlign: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.surfaces.body,
    borderRadius: theme.borderRadius.md,
});

export const StatItemValue = styled.div({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
});

export const StatItemLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
    textTransform: 'uppercase',
    marginTop: theme.spacing.xs,
});

export const GameList = styled.div({
    display: 'flex',
    flexDirection: 'column',
});

export const GameRow = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: `${theme.spacing.md} 0`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    ':last-of-type': {
        borderBottom: 'none',
    },
});

export const GameDate = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    minWidth: 64,
});

export const GameOpponent = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[900],
    flex: 1,
});

export const GameResult = styled.span<{ result: 'W' | 'L' | 'T' | null }>(({ result }) => ({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: result === 'W' ? theme.colors.green[700] : result === 'L' ? theme.colors.red[700] : theme.colors.gray[600],
    minWidth: 72,
    textAlign: 'right',
}));

export const GameLines = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    flex: 2,
});

export const GameLine = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
});
