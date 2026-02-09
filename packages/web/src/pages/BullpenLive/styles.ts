import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const SessionHeader = styled.header({
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const BackButton = styled.button({
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'white',
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,

    '&:hover': {
        background: 'rgba(255, 255, 255, 0.2)',
    },
});

export const PitcherInfo = styled.div({});

export const PitcherName = styled.h1({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: 'white',
    margin: 0,
});

export const IntensityBadge = styled.span<{ intensity: 'low' | 'medium' | 'high' }>((props) => {
    const colors = {
        low: { bg: 'rgba(34, 197, 94, 0.2)', text: '#86efac' },
        medium: { bg: 'rgba(234, 179, 8, 0.2)', text: '#fde68a' },
        high: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5' },
    };
    const c = colors[props.intensity];
    return {
        display: 'inline-block',
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        backgroundColor: c.bg,
        color: c.text,
        borderRadius: theme.borderRadius.sm,
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        textTransform: 'capitalize' as const,
        marginTop: theme.spacing.xs,
    };
});

export const StatsRow = styled.div({
    display: 'flex',
    gap: theme.spacing.lg,
    alignItems: 'center',
});

export const StatBox = styled.div({
    textAlign: 'center',
});

export const StatValue = styled.div({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: 'white',
});

export const StatLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
});

export const EndSessionButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
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

export const Content = styled.main({
    maxWidth: '1100px',
    margin: '0 auto',
    padding: theme.spacing.lg,
});

// Step Indicator (adapted from LiveGame)
export const StepIndicator = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    boxShadow: theme.shadows.sm,
    marginBottom: theme.spacing.sm,
    overflowX: 'auto',

    [`@media (min-width: ${theme.breakpoints.sm})`]: {
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    },
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
    flexShrink: 0,
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
    minWidth: '16px',
    transition: 'all 0.2s',
}));

// Pitch Type Grid
export const PitchTypeSection = styled.div({
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    boxShadow: theme.shadows.sm,
    marginBottom: theme.spacing.sm,
});

export const PitchTypeSectionTitle = styled.div({
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

// Strike Zone + Form Row
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
    gap: theme.spacing.sm,
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

// End Session Modal
export const ModalOverlay = styled.div({
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

export const Modal = styled.div({
    backgroundColor: 'white',
    padding: theme.spacing['2xl'],
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.xl,
    maxWidth: '450px',
    width: '90%',
});

export const ModalTitle = styled.h3({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: `0 0 ${theme.spacing.lg} 0`,
});

export const NotesTextarea = styled.textarea({
    width: '100%',
    minHeight: '100px',
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    resize: 'vertical',
    boxSizing: 'border-box',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 2px ${theme.colors.primary[100]}`,
    },
});

export const ModalActions = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
});

export const ModalCancelButton = styled.button({
    flex: 1,
    padding: theme.spacing.sm,
    backgroundColor: 'white',
    color: theme.colors.gray[700],
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.gray[50],
    },
});

export const ModalConfirmButton = styled.button({
    flex: 1,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.red[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: theme.colors.red[700],
    },
});

// Plan Guidance
export const PlanGuidanceCard = styled.div({
    backgroundColor: theme.colors.primary[50],
    border: `1px solid ${theme.colors.primary[200]}`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
});

export const PlanPitchNumber = styled.div({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary[700],
    backgroundColor: theme.colors.primary[100],
    borderRadius: theme.borderRadius.sm,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    whiteSpace: 'nowrap',
});

export const PlanPitchType = styled.div({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
});

export const PlanInstruction = styled.div({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    fontStyle: 'italic',
    flex: 1,
    minWidth: '120px',
});

export const PlanProgress = styled.div({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[700],
    whiteSpace: 'nowrap',
});

export const PlanCompleteCard = styled.div({
    backgroundColor: theme.colors.green[50],
    border: `1px solid ${theme.colors.green[200]}`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.green[700],
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.sm,
});

export const PitchLimitReached = styled.div({
    backgroundColor: theme.colors.red[50],
    border: `1px solid ${theme.colors.red[200]}`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.red[700],
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.sm,
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
