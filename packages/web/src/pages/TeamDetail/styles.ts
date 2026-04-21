import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

// Styled Components
export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const Header = styled.header({
    background: 'linear-gradient(135deg, var(--team-primary) 0%, var(--team-secondary) 100%)',
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

export const TeamInfo = styled.div({});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: 'white',
    margin: 0,
});

export const Subtitle = styled.p({
    fontSize: theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    margin: `${theme.spacing.xs} 0 0 0`,
});

export const AddButton = styled.button({
    backgroundColor: 'white',
    color: 'var(--team-primary)',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s',

    '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
});

export const SettingsButton = styled.button({
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginRight: theme.spacing.md,

    '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
});

export const Content = styled.main({
    maxWidth: '1000px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const FormCard = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
    marginBottom: theme.spacing.xl,
});

export const FormTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.lg} 0`,
});

export const Form = styled.form({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
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

export const Label = styled.label({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
});

export const Input = styled.input({
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    transition: 'all 0.2s',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },
});

export const Select = styled.select({
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    background: 'white',
    cursor: 'pointer',

    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 3px ${theme.colors.primary[100]}`,
    },
});

export const FormActions = styled.div({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
});

export const CancelButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.gray[300]}`,
    color: theme.colors.gray[700],
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',

    '&:hover': {
        background: theme.colors.gray[50],
    },
});

export const SubmitButton = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.primary[700],
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
    marginBottom: theme.spacing.md,
    fontSize: theme.fontSize.sm,
});

export const RosterSection = styled.section({});

export const SectionHeader = styled.div({
    marginBottom: theme.spacing.md,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: 0,
});

export const RosterTable = styled.table({
    width: '100%',
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    borderCollapse: 'collapse',
    overflow: 'hidden',
});

export const Th = styled.th({
    textAlign: 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.gray[50],
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const Td = styled.td({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    verticalAlign: 'middle',
    fontSize: theme.fontSize.sm,

    'tr:last-child &': {
        borderBottom: 'none',
    },
});

export const JerseyNumber = styled.span({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[800],
});

export const PlayerName = styled.span({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[800],
});

export const PositionBadge = styled.span<{ color: string }>((props) => ({
    display: 'inline-block',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: props.color,
    color: 'white',
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
}));

export const Handedness = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
});

export const ActionButtons = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
});

export const EditButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.primary[300]}`,
    color: theme.colors.primary[600],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',

    '&:hover': {
        background: theme.colors.primary[50],
    },
});

export const ProfileButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.green[400]}`,
    color: theme.colors.green[600],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.medium,

    '&:hover': {
        background: theme.colors.green[50],
    },
});

export const RemoveButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.red[300]}`,
    color: theme.colors.red[600],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',

    '&:hover': {
        background: theme.colors.red[50],
    },
});

export const EmptyState = styled.div({
    textAlign: 'center',
    padding: theme.spacing.xl,
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
});

export const EmptyText = styled.p({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    margin: `0 0 ${theme.spacing.lg} 0`,
});

export const AddButtonSmall = styled.button({
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

export const BackLink = styled.button({
    display: 'block',
    margin: '0 auto',
    background: 'none',
    border: 'none',
    color: theme.colors.primary[600],
    cursor: 'pointer',
    fontSize: theme.fontSize.base,

    '&:hover': {
        textDecoration: 'underline',
    },
});

// Import Roster Modal
export const ImportButton = styled.button({
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginRight: theme.spacing.md,

    '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
});

export const ModalOverlay = styled.div({
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: theme.spacing.lg,
});

export const ModalBox = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.xl,
    width: '100%',
    maxWidth: '720px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
});

export const ModalHeader = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const ModalTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: 0,
});

export const ModalCloseButton = styled.button({
    background: 'none',
    border: 'none',
    fontSize: theme.fontSize.xl,
    color: theme.colors.gray[500],
    cursor: 'pointer',
    lineHeight: 1,
    '&:hover': { color: theme.colors.gray[800] },
});

export const ModalBody = styled.div({
    padding: theme.spacing.xl,
    overflowY: 'auto',
    flex: 1,
});

export const ModalFooter = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
    gap: theme.spacing.md,
});

export const DropZone = styled.div<{ active: boolean }>((props) => ({
    border: `2px dashed ${props.active ? theme.colors.primary[400] : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['3xl'],
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: props.active ? theme.colors.primary[50] : theme.colors.gray[50],
    transition: 'all 0.2s',
    '&:hover': {
        borderColor: theme.colors.primary[400],
        backgroundColor: theme.colors.primary[50],
    },
}));

export const DropZoneText = styled.p({
    color: theme.colors.gray[600],
    fontSize: theme.fontSize.base,
    margin: `0 0 ${theme.spacing.sm} 0`,
});

export const DropZoneSubtext = styled.p({
    color: theme.colors.gray[400],
    fontSize: theme.fontSize.sm,
    margin: 0,
});

export const MappingTable = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
});

export const MappingTh = styled.th({
    textAlign: 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.gray[50],
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    fontSize: theme.fontSize.xs,
});

export const MappingTd = styled.td({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    verticalAlign: 'middle',
});

export const MappingSelect = styled.select({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    background: 'white',
    width: '100%',
});

export const PreviewTable = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
});

export const PreviewTh = styled.th({
    textAlign: 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.gray[50],
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    fontSize: theme.fontSize.xs,
    whiteSpace: 'nowrap',
});

export const PreviewTd = styled.td<{ hasError?: boolean }>((props) => ({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    color: props.hasError ? theme.colors.red[600] : theme.colors.gray[700],
    verticalAlign: 'middle',
}));

export const ErrorBadge = styled.span({
    display: 'inline-block',
    padding: `2px ${theme.spacing.sm}`,
    backgroundColor: theme.colors.red[50],
    color: theme.colors.red[700],
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
});

export const SuccessBadge = styled.span({
    display: 'inline-block',
    padding: `2px ${theme.spacing.sm}`,
    backgroundColor: theme.colors.green[50],
    color: theme.colors.green[700],
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
});

export const ImportModeRow = styled.div({
    display: 'flex',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
});

export const ImportModeOption = styled.label<{ selected: boolean }>((props) => ({
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    border: `2px solid ${props.selected ? theme.colors.primary[500] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    backgroundColor: props.selected ? theme.colors.primary[50] : 'white',
    transition: 'all 0.15s',
    input: { marginTop: '2px' },
}));

export const ImportModeTitle = styled.span({
    display: 'block',
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[800],
});

export const ImportModeDesc = styled.span({
    display: 'block',
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: '2px',
});

export const StepIndicator = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
});

export const Step = styled.div<{ active: boolean; done: boolean }>((props) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    backgroundColor: props.done ? theme.colors.green[100] : props.active ? theme.colors.primary[100] : theme.colors.gray[100],
    color: props.done ? theme.colors.green[700] : props.active ? theme.colors.primary[700] : theme.colors.gray[400],
}));

export const StepDivider = styled.div({
    flex: 1,
    height: '1px',
    backgroundColor: theme.colors.gray[200],
});

// Pitch Type Selection for Pitchers
export const PitchTypesSection = styled.div({
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const PitchTypesLabel = styled.label({
    display: 'block',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
});

export const PitchTypesGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: theme.spacing.sm,
});

export const PitchTypeCheckbox = styled.label<{ checked: boolean }>((props) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: props.checked ? theme.colors.primary[50] : 'white',
    border: `2px solid ${props.checked ? theme.colors.primary[500] : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
    fontWeight: props.checked ? theme.fontWeight.semibold : theme.fontWeight.normal,
    color: props.checked ? theme.colors.primary[700] : theme.colors.gray[700],
    transition: 'all 0.15s',

    '&:hover': {
        borderColor: theme.colors.primary[400],
        backgroundColor: theme.colors.primary[50],
    },

    input: {
        display: 'none',
    },
}));
