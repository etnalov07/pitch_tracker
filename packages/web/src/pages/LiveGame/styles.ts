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
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
});

export const MainPanel = styled.div({
    padding: theme.spacing.lg,
    overflowY: 'auto',
});

export const GameHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    boxShadow: theme.shadows.md,
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
    fontSize: theme.fontSize['xl'],
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
    fontSize: theme.fontSize.base,
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
    gap: theme.spacing.md,
    padding: theme.spacing.xs,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    boxShadow: theme.shadows.sm,
});

export const CountLabel = styled.span({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    fontWeight: theme.fontWeight.medium,
});

export const CountValue = styled.span({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary[600],
});

export const OutsDisplay = styled.span({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[700],
    fontWeight: theme.fontWeight.medium,
});

export const StrikeZoneRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,

    [`@media (min-width: ${theme.breakpoints.md})`]: {
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'start',
    },
});

export const StrikeZoneContainer = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
});

export const PitchForm = styled.div({
    padding: theme.spacing.lg,
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
    gap: theme.spacing.xs,
});

export const Label = styled.label({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
});

export const Select = styled.select({
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 2px ${theme.colors.primary[100]}`,
    },
});

export const Input = styled.input({
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 2px ${theme.colors.primary[100]}`,
    },
});

export const ResultButtons = styled.div({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
});

export const ResultButton = styled.button<{ active: boolean; color: string }>((props) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: props.active ? props.color : theme.colors.gray[100],
    color: props.active ? 'white' : theme.colors.gray[700],
    border: `1px solid ${props.active ? props.color : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        backgroundColor: props.active ? props.color : theme.colors.gray[200],
    },
}));

export const LogButton = styled.button({
    width: '100%',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: theme.spacing.md,

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
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: theme.spacing.sm,

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

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.gray[200],
    },

    '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
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

export const TopBarRight = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const EndGameButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.red[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover': {
        backgroundColor: theme.colors.red[700],
    },
});

export const ResumeGameButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
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

// Outs display with visual indicators
export const OutsContainer = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
});

export const OutsLabel = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary[200],
    textTransform: 'uppercase',
    marginRight: theme.spacing.xs,
});

export const OutIndicator = styled.div<{ active: boolean }>((props) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: props.active ? theme.colors.yellow[400] : 'rgba(255, 255, 255, 0.3)',
    border: `2px solid ${props.active ? theme.colors.yellow[500] : 'rgba(255, 255, 255, 0.4)'}`,
    transition: 'all 0.2s',
}));

// At-bat result buttons for in-play scenarios
export const InPlayResultsContainer = styled.div({
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const InPlayResultsTitle = styled.div({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
});

export const InPlayResultsGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.sm,
});

export const InPlayResultButton = styled.button<{ isOut?: boolean }>((props) => ({
    padding: theme.spacing.sm,
    backgroundColor: props.isOut ? theme.colors.red[50] : theme.colors.green[50],
    color: props.isOut ? theme.colors.red[700] : theme.colors.green[700],
    border: `1px solid ${props.isOut ? theme.colors.red[200] : theme.colors.green[200]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        backgroundColor: props.isOut ? theme.colors.red[100] : theme.colors.green[100],
        borderColor: props.isOut ? theme.colors.red[300] : theme.colors.green[300],
    },
}));

// Inning change notification
export const InningChangeOverlay = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
});

export const InningChangeModal = styled.div({
    backgroundColor: 'white',
    padding: theme.spacing['2xl'],
    borderRadius: theme.borderRadius.xl,
    textAlign: 'center',
    boxShadow: theme.shadows.xl,
});

export const InningChangeText = styled.div({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    marginBottom: theme.spacing.md,
});

export const InningChangeSubtext = styled.div({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.lg,
});

export const InningChangeDismiss = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
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
});

export const RunsInputSection = styled.div({
    marginBottom: theme.spacing.lg,
});

export const RunsInputLabel = styled.label({
    display: 'block',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
});

export const RunsInput = styled.input({
    width: '80px',
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
    border: `2px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },
});

// Baseball Diamond Modal for In-Play recording
export const DiamondModalOverlay = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
});

export const DiamondModal = styled.div({
    backgroundColor: 'white',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.xl,
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
});

export const DiamondModalHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
});

export const DiamondModalTitle = styled.h3({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const DiamondModalClose = styled.button({
    padding: theme.spacing.sm,
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: theme.fontSize.xl,
    color: theme.colors.gray[500],
    cursor: 'pointer',

    '&:hover': {
        color: theme.colors.gray[700],
    },
});

export const HitTypeSelector = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
});

export const HitTypeButton = styled.button<{ active: boolean; hitColor: string }>((props) => ({
    flex: 1,
    padding: theme.spacing.sm,
    backgroundColor: props.active ? props.hitColor : theme.colors.gray[100],
    color: props.active ? 'white' : theme.colors.gray[700],
    border: `2px solid ${props.active ? props.hitColor : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        backgroundColor: props.active ? props.hitColor : theme.colors.gray[200],
    },
}));

export const DiamondInstructions = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
});

export const DiamondContainer = styled.div({
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
});

export const DiamondResultSection = styled.div({
    borderTop: `1px solid ${theme.colors.gray[200]}`,
    paddingTop: theme.spacing.lg,
});

export const DiamondResultTitle = styled.div({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
});

export const DiamondResultGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing.sm,
});

export const DiamondResultButton = styled.button<{ isOut?: boolean; disabled?: boolean }>((props) => ({
    padding: theme.spacing.sm,
    backgroundColor: props.disabled ? theme.colors.gray[100] : props.isOut ? theme.colors.red[50] : theme.colors.green[50],
    color: props.disabled ? theme.colors.gray[400] : props.isOut ? theme.colors.red[700] : theme.colors.green[700],
    border: `1px solid ${props.disabled ? theme.colors.gray[200] : props.isOut ? theme.colors.red[200] : theme.colors.green[200]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: props.disabled ? 0.6 : 1,

    '&:hover': {
        backgroundColor: props.disabled ? theme.colors.gray[100] : props.isOut ? theme.colors.red[100] : theme.colors.green[100],
    },
}));

export const OpenDiamondButton = styled.button({
    width: '100%',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,

    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const HeatZoneToggleContainer = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
});

export const HeatZoneToggleLabel = styled.span({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
    minWidth: '110px',
});

export const ToggleSwitch = styled.label({
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
    flexShrink: 0,
});

export const ToggleSwitchInput = styled.input({
    opacity: 0,
    width: 0,
    height: 0,

    '&:checked + span': {
        backgroundColor: theme.colors.primary[600],
    },

    '&:checked + span:before': {
        transform: 'translateX(20px)',
    },

    '&:focus + span': {
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },
});

export const ToggleSwitchSlider = styled.span({
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.gray[300],
    transition: '0.2s',
    borderRadius: '24px',

    '&:before': {
        position: 'absolute',
        content: '""',
        height: '18px',
        width: '18px',
        left: '3px',
        bottom: '3px',
        backgroundColor: 'white',
        transition: '0.2s',
        borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    },
});

// Pitch Flow Step Indicator
export const PitchFlowContainer = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
});

export const StepIndicator = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    boxShadow: theme.shadows.sm,
    marginBottom: theme.spacing.sm,
});

export const Step = styled.div<{ active?: boolean; completed?: boolean }>((props) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    opacity: props.active || props.completed ? 1 : 0.4,
}));

export const StepNumber = styled.div<{ active?: boolean; completed?: boolean }>((props) => ({
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    backgroundColor: props.completed ? theme.colors.green[500] : props.active ? theme.colors.primary[600] : theme.colors.gray[200],
    color: props.completed || props.active ? 'white' : theme.colors.gray[500],
    transition: 'all 0.2s',
}));

export const StepLabel = styled.span<{ active?: boolean }>((props) => ({
    fontSize: theme.fontSize.sm,
    fontWeight: props.active ? theme.fontWeight.semibold : theme.fontWeight.medium,
    color: props.active ? theme.colors.gray[900] : theme.colors.gray[600],

    [`@media (max-width: ${theme.breakpoints.md})`]: {
        display: 'none',
    },
}));

export const StepConnector = styled.div<{ completed?: boolean }>((props) => ({
    flex: 1,
    height: '2px',
    backgroundColor: props.completed ? theme.colors.green[500] : theme.colors.gray[200],
    margin: `0 ${theme.spacing.sm}`,
    transition: 'all 0.2s',
}));

// Pitch Type Selector (prominent display)
export const PitchTypeSelector = styled.div({
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    boxShadow: theme.shadows.sm,
});

export const PitchTypeSelectorTitle = styled.div({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});

export const PitchTypeGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: theme.spacing.sm,
});

export const PitchTypeButton = styled.button<{ active?: boolean }>((props) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: props.active ? theme.colors.primary[600] : theme.colors.gray[50],
    color: props.active ? 'white' : theme.colors.gray[700],
    border: `1px solid ${props.active ? theme.colors.primary[600] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.15s',

    '&:hover': {
        backgroundColor: props.active ? theme.colors.primary[700] : theme.colors.gray[100],
        borderColor: props.active ? theme.colors.primary[700] : theme.colors.gray[300],
    },
}));

// Zone instruction overlay
export const ZoneInstructionOverlay = styled.div<{ visible?: boolean }>((props) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: props.visible ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    pointerEvents: 'none',
}));

export const ZoneInstructionText = styled.div({
    color: 'white',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
    padding: theme.spacing.lg,
});

// Current step highlight card
export const CurrentStepCard = styled.div<{ stepColor?: string }>((props) => ({
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    boxShadow: theme.shadows.sm,
    borderLeft: `3px solid ${props.stepColor || theme.colors.primary[600]}`,
}));

export const CurrentStepTitle = styled.div({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    marginBottom: theme.spacing.xs,
});

export const CurrentStepDescription = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
});

// Velocity and result row (combined for space efficiency)
export const VelocityResultRow = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
    alignItems: 'flex-start',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
        flexDirection: 'column',
    },
});

export const VelocityInput = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    minWidth: '100px',
});

export const ResultSection = styled.div({
    flex: 1,
});

// Status badges for completed steps
export const CompletedBadge = styled.span({
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.green[100],
    color: theme.colors.green[700],
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
});

export const PendingBadge = styled.span({
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.gray[500],
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
});

// Pitch type filter for heat zones
export const HeatZonePitchFilter = styled.div({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
});

export const HeatZonePitchButton = styled.button<{ active?: boolean }>((props) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: props.active ? theme.colors.primary[600] : theme.colors.gray[100],
    color: props.active ? 'white' : theme.colors.gray[700],
    border: `1px solid ${props.active ? theme.colors.primary[600] : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.15s',

    '&:hover': {
        backgroundColor: props.active ? theme.colors.primary[700] : theme.colors.gray[200],
    },
}));
