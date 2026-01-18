import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

// Styled Components
export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const Header = styled.header({
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    color: 'white',
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const HeaderLeft = styled.div({});

export const HeaderRight = styled.div({});

export const Logo = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    margin: 0,
});

export const WelcomeText = styled.p({
    margin: `${theme.spacing.xs} 0 0 0`,
    opacity: 0.9,
    fontSize: theme.fontSize.sm,
});

export const LogoutButton = styled.button({
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
    transition: 'all 0.2s',

    '&:hover': {
        background: 'rgba(255, 255, 255, 0.3)',
    },
});

export const MainContent = styled.main({
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `${theme.spacing.xl}`,
});

export const QuickActions = styled.div({
    display: 'flex',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
});

export const ActionCard = styled.button({
    flex: '1',
    maxWidth: '200px',
    background: 'white',
    border: '2px dashed #d1d5db',
    borderRadius: theme.borderRadius.lg,
    padding: `${theme.spacing.xl}`,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.sm,
    transition: 'all 0.2s',

    '&:hover': {
        borderColor: theme.colors.primary[500],
        background: theme.colors.primary[50],
    },
});

export const ActionIcon = styled.span({
    fontSize: theme.fontSize['3xl'],
    color: theme.colors.primary[500],
    fontWeight: theme.fontWeight.normal,
});

export const ActionText = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    fontWeight: theme.fontWeight.medium,
});

export const Section = styled.section({
    marginBottom: theme.spacing.xl,
});

export const SectionHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
});

export const LiveDot = styled.span({
    width: '10px',
    height: '10px',
    backgroundColor: theme.colors.green[500],
    borderRadius: '50%',
    animation: 'pulse 1.5s ease-in-out infinite',

    '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
    },
});

export const ViewAllLink = styled.button({
    background: 'none',
    border: 'none',
    color: theme.colors.primary[600],
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',

    '&:hover': {
        textDecoration: 'underline',
    },
});

export const GameGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: theme.spacing.lg,
});

export const GameCard = styled.div<{ isLive?: boolean }>(({ isLive }) => ({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: isLive ? `2px solid ${theme.colors.green[500]}` : 'none',

    '&:hover': {
        boxShadow: theme.shadows.md,
        transform: 'translateY(-2px)',
    },
}));

export const GameStatus = styled.div<{ color: string }>(({ color }) => ({
    display: 'inline-block',
    backgroundColor: color,
    color: 'white',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
}));

export const GameTeams = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const TeamRow = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const TeamName = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[800],
});

export const Score = styled.span({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
});

export const GameInfo = styled.div({
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
});

export const InningInfo = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
});

export const GameList = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    overflow: 'hidden',
});

export const GameListItem = styled.div({
    display: 'grid',
    gridTemplateColumns: '100px 1fr 120px 100px',
    gap: theme.spacing.md,
    alignItems: 'center',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:last-child': {
        borderBottom: 'none',
    },

    '&:hover': {
        backgroundColor: theme.colors.gray[50],
    },
});

export const GameDate = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
});

export const GameMatchup = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[800],
});

export const GameLocation = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
});

export const GameScore = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[800],
});

export const GameStatusBadge = styled.span<{ color: string }>(({ color }) => ({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: color,
    textTransform: 'uppercase',
    textAlign: 'right',
}));

export const TabContainer = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const TabButton = styled.button<{ active: boolean }>(({ active }) => ({
    background: 'none',
    border: 'none',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: active ? theme.colors.primary[600] : theme.colors.gray[600],
    cursor: 'pointer',
    borderBottom: `2px solid ${active ? theme.colors.primary[600] : 'transparent'}`,
    marginBottom: -1,
    transition: 'all 0.2s',

    '&:hover': {
        color: theme.colors.primary[600],
    },
}));

export const TeamGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: theme.spacing.lg,
});

export const TeamCard = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        boxShadow: theme.shadows.md,
        transform: 'translateY(-2px)',
    },
});

export const TeamCardName = styled.h3({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `${theme.spacing.sm} 0`,
});

export const TeamCardCity = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    margin: '0',
});

export const TeamCardAbbr = styled.span({
    display: 'inline-block',
    marginTop: theme.spacing.md,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    background: theme.colors.gray[100],
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
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

export const CreateButton = styled.button({
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
