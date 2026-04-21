import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Panel = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    boxShadow: theme.shadows.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const PanelHeader = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
});

export const PanelTitle = styled.h4({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});

export const CurrentPitcher = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.primary[200]}`,
    marginBottom: theme.spacing.sm,
});

export const PitcherName = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[800],
});

export const PitcherMeta = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary[600],
});

export const NoPitcherText = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
    margin: `${theme.spacing.sm} 0`,
    textAlign: 'center',
});

export const PitcherList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    maxHeight: '120px',
    overflowY: 'auto',
});

export const PitcherRow = styled.button<{ isActive?: boolean }>((props) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    background: props.isActive ? theme.colors.primary[100] : theme.colors.gray[50],
    border: `1px solid ${props.isActive ? theme.colors.primary[300] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontSize: theme.fontSize.sm,
    color: props.isActive ? theme.colors.primary[800] : theme.colors.gray[700],
    '&:hover': {
        background: props.isActive ? theme.colors.primary[100] : theme.colors.gray[100],
    },
}));

export const AddButton = styled.button({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    background: 'none',
    border: `1px dashed ${theme.colors.primary[400]}`,
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary[600],
    width: '100%',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
    '&:hover': {
        background: theme.colors.primary[50],
    },
});

export const FormRow = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.sm,
});

export const Input = styled.input({
    width: '100%',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    boxSizing: 'border-box',
    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[400],
    },
});

export const Select = styled.select({
    width: '100%',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    background: 'white',
    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[400],
    },
});

export const SaveButton = styled.button({
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    background: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.semibold,
    '&:hover': { background: theme.colors.primary[700] },
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
});

export const CancelButton = styled.button({
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    background: 'none',
    color: theme.colors.gray[600],
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    '&:hover': { background: theme.colors.gray[100] },
});

export const FormActions = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
    marginTop: theme.spacing.sm,
});
