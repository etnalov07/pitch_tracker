import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

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
    gap: theme.spacing.md,
    flexWrap: 'wrap',
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
});

export const HeaderRight = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
});

export const BackButton = styled.button({
    background: 'none',
    border: 'none',
    color: theme.colors.primary[600],
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    '&:hover': { background: theme.colors.gray[100] },
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const Subtitle = styled.div({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.xs,
});

export const PrimaryButton = styled.button({
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    '&:hover': { backgroundColor: theme.colors.primary[700] },
    '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
});

export const DangerButton = styled.button({
    background: 'white',
    color: theme.colors.red[600],
    border: `1px solid ${theme.colors.red[300]}`,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    '&:hover': { background: theme.colors.red[50] },
});

export const GhostButton = styled.button({
    background: 'white',
    color: theme.colors.gray[700],
    border: `1px solid ${theme.colors.gray[300]}`,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    '&:hover': { background: theme.colors.gray[100] },
});

export const Content = styled.main({
    maxWidth: '1100px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const Section = styled.section({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
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

export const FormRow = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
    '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
});

export const FormGroup = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const Label = styled.label({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[700],
});

export const Input = styled.input({
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
});

export const Select = styled.select({
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    background: 'white',
});

export const Textarea = styled.textarea({
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    minHeight: 80,
    fontFamily: 'inherit',
    resize: 'vertical',
});

export const BatterTable = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
});

export const Th = styled.th({
    textAlign: 'left',
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    color: theme.colors.gray[700],
    fontWeight: theme.fontWeight.semibold,
});

export const Td = styled.td({
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    verticalAlign: 'top',
});

export const BatterNameBtn = styled.button({
    background: 'none',
    border: 'none',
    color: theme.colors.primary[600],
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    padding: 0,
    fontSize: theme.fontSize.sm,
});

export const AddBatterRow = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    flexWrap: 'wrap',
});

export const SmallInput = styled(Input)({
    maxWidth: 140,
});

export const ZoneGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 56px)',
    gridTemplateRows: 'repeat(3, 56px)',
    gap: 2,
    border: `2px solid ${theme.colors.gray[700]}`,
    padding: 2,
    width: 'fit-content',
});

export const ZoneCell = styled.button<{ state: 'hot' | 'cold' | 'neutral' }>(({ state }) => ({
    border: `1px solid ${theme.colors.gray[300]}`,
    background: state === 'hot' ? theme.colors.red[400] : state === 'cold' ? theme.colors.green[400] : theme.colors.gray[100],
    color: state === 'neutral' ? theme.colors.gray[500] : 'white',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background 0.15s',
}));

export const ZoneLegend = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.sm,
});

export const ModalOverlay = styled.div({
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: theme.spacing.lg,
});

export const Modal = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    maxWidth: 600,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: theme.shadows.xl,
});

export const ErrorText = styled.div({
    color: theme.colors.red[600],
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
});

export const LoadingText = styled.div({
    textAlign: 'center',
    padding: theme.spacing['2xl'],
    color: theme.colors.gray[500],
});

export const TagChip = styled.span({
    display: 'inline-block',
    background: theme.colors.primary[50],
    color: theme.colors.primary[700],
    padding: `2px ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.fontSize.xs,
    marginRight: 4,
    marginBottom: 4,
});
