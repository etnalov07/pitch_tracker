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

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const Content = styled.main({
    maxWidth: '1200px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const FilterBar = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    background: 'white',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
});

export const FilterButton = styled.button<{ active: boolean }>((props) => ({
    background: props.active ? theme.colors.primary[600] : 'transparent',
    color: props.active ? 'white' : theme.colors.gray[600],
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        background: props.active ? theme.colors.primary[700] : theme.colors.gray[100],
    },
}));

export const GamesTable = styled.table({
    width: '100%',
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    borderCollapse: 'collapse',
    overflow: 'hidden',
});

export const Th = styled.th({
    textAlign: 'left',
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    background: theme.colors.gray[50],
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const Td = styled.td({
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    verticalAlign: 'middle',
});

export const GameRow = styled.tr({
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover': {
        backgroundColor: theme.colors.gray[50],
    },

    '&:last-child td': {
        borderBottom: 'none',
    },
});

export const DateCell = styled.div({});

export const DateText = styled.div({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[800],
});

export const TimeText = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

export const MatchupCell = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
});

export const TeamText = styled.span({
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[800],
});

export const AtText = styled.span({
    color: theme.colors.gray[400],
    fontSize: theme.fontSize.sm,
});

export const ScoreCell = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
});

export const ScoreTeam = styled.div({});

export const ScoreValue = styled.span({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[800],
});

export const ScoreDivider = styled.span({
    color: theme.colors.gray[400],
});

export const NoScore = styled.span({
    color: theme.colors.gray[400],
});

export const LocationText = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
});

export const StatusBadge = styled.span<{ color: string }>((props) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: `${props.color}15`,
    color: props.color,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase',
}));

export const LiveDot = styled.span({
    width: '6px',
    height: '6px',
    backgroundColor: 'currentColor',
    borderRadius: '50%',
    animation: 'pulse 1.5s ease-in-out infinite',

    '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 },
    },
});

export const InningText = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.xs,
});

export const ActionButtons = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
});

export const ViewButton = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const DeleteButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.red[300]}`,
    color: theme.colors.red[600],
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',

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

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const LoadingText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[600],
    padding: theme.spacing.xl,
});
