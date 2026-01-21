import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

// Styled Components
export const Container = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr',
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],

    [`@media (min-width: ${theme.breakpoints.lg})`]: {
        gridTemplateColumns: '400px 1fr',
    },
});

export const LeftPanel = styled.div({
    backgroundColor: 'white',
    borderRight: `1px solid ${theme.colors.gray[200]}`,
    overflowY: 'auto',
});

export const MainPanel = styled.div({
    padding: theme.spacing.xl,
    overflowY: 'auto',
});

export const GameHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.xl,
    boxShadow: theme.shadows.lg,
});

export const TeamInfo = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.sm,
});

export const TeamName = styled.div({
    color: 'white',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
});

export const Score = styled.div({
    color: 'white',
    fontSize: theme.fontSize['4xl'],
    fontWeight: theme.fontWeight.bold,
});

export const GameInfo = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.xs,
});

export const Inning = styled.div({
    color: 'white',
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
});

export const InningHalf = styled.div({
    color: theme.colors.primary[100],
    fontSize: theme.fontSize.sm,
    textTransform: 'uppercase',
});

export const CountDisplay = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    boxShadow: theme.shadows.md,
});

export const CountLabel = styled.span({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    fontWeight: theme.fontWeight.medium,
});

export const CountValue = styled.span({
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary[600],
});

export const OutsDisplay = styled.span({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[700],
    fontWeight: theme.fontWeight.medium,
});

export const PitchForm = styled.div({
    marginTop: theme.spacing.xl,
    padding: theme.spacing.xl,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.md,
});

export const FormRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
});

export const FormGroup = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const Label = styled.label({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
});

export const Select = styled.select({
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },
});

export const Input = styled.input({
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },
});

export const ResultButtons = styled.div({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
});

export const ResultButton = styled.button<{ active: boolean; color: string }>((props) => ({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: props.active ? props.color : theme.colors.gray[100],
    color: props.active ? 'white' : theme.colors.gray[700],
    border: `2px solid ${props.active ? props.color : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        backgroundColor: props.active ? props.color : theme.colors.gray[200],
    },
}));

export const LogButton = styled.button({
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: theme.spacing.lg,

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.primary[700],
    },

    '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
});

export const EndAtBatButton = styled.button({
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: theme.spacing.md,

    '&:hover': {
        backgroundColor: theme.colors.green[700],
    },
});

export const NoAtBatContainer = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['3xl'],
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.md,
});

export const NoAtBatText = styled.p({
    fontSize: theme.fontSize.xl,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.lg,
});

export const StartAtBatButton = styled.button({
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const LoadingContainer = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: theme.fontSize.xl,
    color: theme.colors.gray[600],
});

export const ErrorContainer = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: theme.fontSize.xl,
    color: theme.colors.red[600],
});

export const PlayerDisplay = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    boxShadow: theme.shadows.sm,
});

export const PlayerInfo = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const PlayerLabel = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[500],
    textTransform: 'uppercase',
});

export const PlayerName = styled.span({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
});

export const PlayerNumber = styled.span({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.base,
});

export const ChangeButton = styled.button({
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.gray[700],
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.gray[200],
    },
});

export const PlayersRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
});

export const SetupPrompt = styled.div({
    textAlign: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.yellow[50],
    border: `1px solid ${theme.colors.yellow[200]}`,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
});

export const SetupText = styled.p({
    fontSize: theme.fontSize.base,
    color: theme.colors.yellow[800],
    marginBottom: theme.spacing.md,
});

export const SetupButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.yellow[500],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.yellow[600],
    },
});

export const TopBar = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
});

export const BackButton = styled.button({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    color: theme.colors.gray[600],
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.gray[100],
        color: theme.colors.gray[800],
    },
});

export const GameStatus = styled.span<{ status?: string }>((props) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    backgroundColor:
        props.status === 'in_progress'
            ? theme.colors.green[100]
            : props.status === 'completed'
              ? theme.colors.gray[200]
              : theme.colors.yellow[100],
    color:
        props.status === 'in_progress'
            ? theme.colors.green[700]
            : props.status === 'completed'
              ? theme.colors.gray[700]
              : theme.colors.yellow[700],
}));

export const StartGameButton = styled.button({
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover': {
        backgroundColor: theme.colors.green[700],
    },
});

export const StartGamePrompt = styled.div({
    textAlign: 'center',
    padding: theme.spacing['2xl'],
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.md,
    marginBottom: theme.spacing.xl,
});

export const StartGameText = styled.p({
    fontSize: theme.fontSize.lg,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.lg,
});
