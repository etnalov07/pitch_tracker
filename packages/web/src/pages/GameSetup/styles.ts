import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

// Styled Components
export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.surfaces.body,
});

export const Header = styled.header({
    background: theme.surfaces.card,
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

export const Content = styled.main({
    maxWidth: '640px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const FormCard = styled.div({
    background: theme.surfaces.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
});

export const Form = styled.form({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xl,
});

// ─── Segmented chip row (lineup size, innings, opponents) ────────────────────

export const ChipRow = styled.div({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
});

export const Chip = styled.button<{ active?: boolean }>((props) => ({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    border: `1px solid ${props.active ? theme.colors.primary[600] : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.full,
    background: props.active ? theme.colors.primary[50] : theme.surfaces.card,
    color: props.active ? theme.colors.primary[700] : theme.colors.gray[700],
    fontSize: theme.fontSize.sm,
    fontWeight: props.active ? theme.fontWeight.semibold : theme.fontWeight.normal,
    cursor: 'pointer',
    transition: 'all 0.15s ease',

    '&:hover': {
        borderColor: theme.colors.primary[400],
    },
}));

// ─── Section titles ────────────────────────────────────────────────────────────

export const TeamSelectionSection = styled.div({});

export const GameDetailsSection = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.lg} 0`,
});

export const SectionSubtitle = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    margin: `-${theme.spacing.md} 0 ${theme.spacing.lg}`,
});

// ─── Teams ─────────────────────────────────────────────────────────────────────

export const TeamsRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: theme.spacing.lg,
    alignItems: 'start',
});

export const TeamSelectGroup = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const VsText = styled.span({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[400],
    paddingTop: theme.spacing.xl,
});

export const Label = styled.label({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
});

export const TeamSelect = styled.select({
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    background: theme.surfaces.card,
    cursor: 'pointer',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },
});

export const SelectedTeamPreview = styled.div({
    marginTop: theme.spacing.sm,
});

export const TeamBadge = styled.div<{ isHome?: boolean }>((props) => ({
    display: 'inline-block',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: props.isHome ? theme.colors.primary[100] : theme.colors.gray[100],
    color: props.isHome ? theme.colors.primary[700] : theme.colors.gray[700],
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
}));

export const HomeAwayToggle = styled.div({
    display: 'flex',
    justifyContent: 'center',
    gap: 0,
    marginTop: theme.spacing.md,
});

export const ToggleOption = styled.button<{ active?: boolean }>((props) => ({
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    border: `1px solid ${theme.colors.primary[300]}`,
    background: props.active ? theme.colors.primary[600] : theme.surfaces.card,
    color: props.active ? 'white' : theme.colors.primary[600],
    transition: 'all 0.15s ease',

    '&:first-of-type': {
        borderRadius: `${theme.borderRadius.md} 0 0 ${theme.borderRadius.md}`,
        borderRight: 'none',
    },

    '&:last-of-type': {
        borderRadius: `0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0`,
    },

    '&:hover': {
        background: props.active ? theme.colors.primary[700] : theme.colors.primary[50],
    },
}));

// ─── Charting mode cards ───────────────────────────────────────────────────────

export const ModeGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
});

export const ModeCard = styled.button<{ active?: boolean }>((props) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.lg,
    border: `2px solid ${props.active ? theme.colors.primary[500] : theme.colors.gray[200]}`,
    background: props.active ? theme.colors.primary[50] : theme.surfaces.card,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',

    '&:hover': {
        borderColor: theme.colors.primary[400],
        background: props.active ? theme.colors.primary[50] : theme.colors.gray[50],
    },
}));

export const ModeCardTitle = styled.div<{ active?: boolean }>((props) => ({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: props.active ? theme.colors.primary[700] : theme.colors.gray[800],
}));

export const ModeCardDesc = styled.div({
    fontSize: '11px',
    color: theme.colors.gray[500],
    lineHeight: 1.4,
});

// ─── Form fields ───────────────────────────────────────────────────────────────

export const Divider = styled.hr({
    border: 'none',
    borderTop: `1px solid ${theme.colors.gray[200]}`,
    margin: 0,
});

export const FormRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.lg,
});

export const FormGroup = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
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

// ─── Actions ───────────────────────────────────────────────────────────────────

export const FormActions = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
});

export const CancelButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.gray[300]}`,
    color: theme.colors.gray[700],
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    cursor: 'pointer',

    '&:hover': {
        background: theme.colors.gray[50],
    },
});

export const SubmitButton = styled.button({
    backgroundColor: theme.colors.green[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.md} ${theme.spacing['2xl']}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    cursor: 'pointer',
    letterSpacing: '0.02em',

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.green[700],
    },

    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

export const ErrorMessage = styled.div({
    backgroundColor: theme.colors.red[50],
    border: `1px solid ${theme.colors.red[200]}`,
    color: theme.colors.red[700],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
});

export const WarningCard = styled.div({
    background: theme.surfaces.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['2xl'],
    boxShadow: theme.shadows.sm,
    textAlign: 'center',
});

export const WarningIcon = styled.div({
    fontSize: '48px',
    marginBottom: theme.spacing.lg,
});

export const WarningTitle = styled.h2({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.sm} 0`,
});

export const WarningText = styled.p({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    margin: `0 0 ${theme.spacing.xl} 0`,
});

export const CreateTeamButton = styled.button({
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
