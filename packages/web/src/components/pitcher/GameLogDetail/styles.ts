import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Overlay = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: theme.spacing.lg,
});

export const Modal = styled.div({
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.shadows.xl,
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
});

export const ModalHeader = styled.div({
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    position: 'relative',
});

export const ModalTitle = styled.h2({
    fontSize: theme.fontSize['xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
    paddingRight: theme.spacing.xl,
});

export const ModalDate = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    margin: `${theme.spacing.xs} 0 0 0`,
});

export const CloseButton = styled.button({
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: theme.colors.gray[400],
    cursor: 'pointer',
    lineHeight: 1,
    padding: theme.spacing.xs,

    '&:hover': {
        color: theme.colors.gray[600],
    },
});

export const SummaryGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.gray[50],
});

export const SummaryItem = styled.div({
    textAlign: 'center',
});

export const SummaryValue = styled.div<{ highlight?: boolean }>((props) => ({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: props.highlight ? theme.colors.green[600] : theme.colors.gray[900],
}));

export const SummaryLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});

export const BreakdownSection = styled.div({
    padding: theme.spacing.lg,
});

export const BreakdownTitle = styled.h3({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: `0 0 ${theme.spacing.md} 0`,
});

export const BreakdownTable = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
});

export const BTh = styled.th<{ align?: string }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.gray[100],
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',

    '&:first-of-type': {
        borderTopLeftRadius: theme.borderRadius.md,
    },
    '&:last-child': {
        borderTopRightRadius: theme.borderRadius.md,
    },
}));

export const BTd = styled.td<{ align?: string; highlight?: boolean; velocity?: boolean }>((props) => ({
    textAlign: (props.align as 'left' | 'center' | 'right') || 'left',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    color: props.highlight ? theme.colors.green[600] : props.velocity ? theme.colors.primary[600] : theme.colors.gray[800],
    fontWeight: props.highlight || props.velocity ? theme.fontWeight.semibold : theme.fontWeight.normal,

    'tr:last-child &': {
        borderBottom: 'none',
    },
}));

export const PitchTypeBadge = styled.span({
    display: 'inline-block',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
});

export const NoDataText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.lg,
});

export const ModalFooter = styled.div({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTop: `1px solid ${theme.colors.gray[200]}`,
});

export const ViewGameButton = styled.button({
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

export const CloseButtonAlt = styled.button({
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
