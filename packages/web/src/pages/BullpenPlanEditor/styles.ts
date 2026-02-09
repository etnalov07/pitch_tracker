import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const Header = styled.header({
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.lg,
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

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: 'white',
    margin: 0,
});

export const SaveButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover:not(:disabled)': {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },

    '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
});

export const Content = styled.main({
    maxWidth: '800px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const Section = styled.div({
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    marginTop: 0,
    marginBottom: theme.spacing.lg,
});

export const FormGroup = styled.div({
    marginBottom: theme.spacing.md,
});

export const Label = styled.label({
    display: 'block',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.xs,
});

export const Input = styled.input({
    width: '100%',
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[800],
    boxSizing: 'border-box',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },

    '&::placeholder': {
        color: theme.colors.gray[400],
    },
});

export const Textarea = styled.textarea({
    width: '100%',
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[800],
    resize: 'vertical',
    minHeight: '60px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },

    '&::placeholder': {
        color: theme.colors.gray[400],
    },
});

export const NumberInput = styled.input({
    width: '100px',
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[800],
    textAlign: 'center',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },

    '&::placeholder': {
        color: theme.colors.gray[400],
    },
});

export const PitchRow = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
});

export const SequenceNumber = styled.span({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.sm,
    flexShrink: 0,
});

export const PitchTypeSelect = styled.select({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[800],
    backgroundColor: 'white',
    cursor: 'pointer',
    minWidth: '120px',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
    },
});

export const InstructionInput = styled.input({
    flex: 1,
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[800],

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
    },

    '&::placeholder': {
        color: theme.colors.gray[400],
    },
});

export const TargetButton = styled.button<{ hasTarget?: boolean }>((props) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: props.hasTarget ? theme.colors.primary[50] : 'white',
    color: props.hasTarget ? theme.colors.primary[700] : theme.colors.gray[500],
    border: `1px solid ${props.hasTarget ? theme.colors.primary[400] : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.medium,
    whiteSpace: 'nowrap',

    '&:hover': {
        borderColor: theme.colors.primary[400],
        backgroundColor: theme.colors.primary[50],
    },
}));

export const ActionButton = styled.button({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'none',
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.gray[500],
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
    flexShrink: 0,

    '&:hover': {
        backgroundColor: theme.colors.gray[100],
        color: theme.colors.gray[700],
    },

    '&:disabled': {
        opacity: 0.3,
        cursor: 'not-allowed',
    },
});

export const RemoveButton = styled(ActionButton)({
    '&:hover': {
        backgroundColor: theme.colors.red[50],
        borderColor: theme.colors.red[300],
        color: theme.colors.red[600],
    },
});

export const AddPitchButton = styled.button({
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: 'white',
    color: theme.colors.primary[600],
    border: `2px dashed ${theme.colors.primary[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.15s',

    '&:hover': {
        backgroundColor: theme.colors.primary[50],
        borderColor: theme.colors.primary[500],
    },
});

export const StrikeZoneWrapper = styled.div({
    maxWidth: '300px',
    margin: `${theme.spacing.md} auto`,
    padding: theme.spacing.md,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.primary[200]}`,
});

export const StrikeZoneLabel = styled.p({
    textAlign: 'center',
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    margin: `0 0 ${theme.spacing.sm} 0`,
});

export const AssignmentGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: theme.spacing.sm,
});

export const AssignmentCheckbox = styled.label({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
    transition: 'background-color 0.15s',

    '&:hover': {
        backgroundColor: theme.colors.gray[100],
    },

    'input[type="checkbox"]': {
        cursor: 'pointer',
    },
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
