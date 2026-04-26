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
    '&:hover': { background: theme.colors.gray[100] },
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const SubTitle = styled.span({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[500],
    marginLeft: theme.spacing.md,
});

export const SkipButton = styled.button({
    background: 'none',
    border: `1px solid ${theme.colors.gray[300]}`,
    color: theme.colors.gray[600],
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    '&:hover': { background: theme.colors.gray[100] },
});

export const Content = styled.main({
    maxWidth: '960px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const TabRow = styled.div({
    display: 'flex',
    gap: 0,
    marginBottom: theme.spacing.xl,
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.gray[200]}`,
    overflow: 'hidden',
});

export const TabButton = styled.button<{ active: boolean }>(({ active }) => ({
    flex: 1,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    background: active ? theme.colors.primary[700] : 'white',
    color: active ? 'white' : theme.colors.gray[600],
    border: 'none',
    fontSize: theme.fontSize.base,
    fontWeight: active ? theme.fontWeight.semibold : theme.fontWeight.normal,
    cursor: 'pointer',
    transition: 'all 0.15s',
    '&:hover': {
        background: active ? theme.colors.primary[700] : theme.colors.gray[50],
    },
}));

export const FormCard = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
});

export const SectionTitle = styled.h3({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    margin: `0 0 ${theme.spacing.md} 0`,
    paddingBottom: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const PitcherSection = styled.div({
    background: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const PitcherRow = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
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
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[900],
    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
        boxShadow: `0 0 0 2px ${theme.colors.primary[100]}`,
    },
});

export const HandednessToggle = styled.div({
    display: 'flex',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    border: `1px solid ${theme.colors.gray[300]}`,
});

export const HandednessOption = styled.button<{ active: boolean }>(({ active }) => ({
    flex: 1,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: active ? theme.colors.primary[600] : 'white',
    color: active ? 'white' : theme.colors.gray[600],
    border: 'none',
    fontSize: theme.fontSize.sm,
    fontWeight: active ? theme.fontWeight.semibold : theme.fontWeight.normal,
    cursor: 'pointer',
    minWidth: '36px',
}));

export const LineupTable = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
});

export const Th = styled.th({
    textAlign: 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const Td = styled.td({
    padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
    verticalAlign: 'middle',
});

export const BattingOrderCell = styled.td({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[500],
    fontSize: theme.fontSize.sm,
    width: '32px',
    textAlign: 'center',
    verticalAlign: 'middle',
});

export const PositionSelect = styled.select({
    padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    width: '70px',
    color: theme.colors.gray[900],
    background: 'white',
    cursor: 'pointer',
});

export const FormActions = styled.div({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
});

export const SaveButton = styled.button({
    background: theme.colors.primary[700],
    color: 'white',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
    '&:hover:not(:disabled)': { background: theme.colors.primary[800] },
});

export const NextButton = styled(SaveButton)({
    background: theme.colors.green[600],
    '&:hover:not(:disabled)': { background: theme.colors.green[700] },
});

export const HelpText = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    margin: `0 0 ${theme.spacing.lg} 0`,
});

export const SavedBadge = styled.span({
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    fontSize: theme.fontSize.xs,
    color: theme.colors.green[600],
    fontWeight: theme.fontWeight.medium,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    background: theme.colors.green[50],
    borderRadius: theme.borderRadius.full,
    border: `1px solid ${theme.colors.green[200]}`,
});
