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
});

export const Modal = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: theme.shadows.lg,
});

export const ModalHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
});

export const ModalTitle = styled.h2({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const CloseButton = styled.button({
    background: 'none',
    border: 'none',
    fontSize: theme.fontSize.xl,
    color: theme.colors.gray[500],
    cursor: 'pointer',

    '&:hover': {
        color: theme.colors.gray[700],
    },
});

export const BatterList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const BatterCard = styled.button<{ isNext?: boolean; isSubbed?: boolean }>((props) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    border: `2px solid ${props.isNext ? theme.colors.primary[500] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    background: props.isSubbed ? theme.colors.gray[100] : props.isNext ? theme.colors.primary[50] : 'white',
    cursor: props.isSubbed ? 'default' : 'pointer',
    textAlign: 'left',
    width: '100%',
    opacity: props.isSubbed ? 0.6 : 1,

    '&:hover': {
        borderColor: props.isSubbed ? theme.colors.gray[200] : theme.colors.primary[400],
        background: props.isSubbed ? theme.colors.gray[100] : theme.colors.primary[50],
    },
}));

export const BatterInfo = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const BattingOrderBadge = styled.div({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.base,
});

export const BatterName = styled.div({
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[900],
});

export const BatterStats = styled.div({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
});

export const NextUpBadge = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[700],
    backgroundColor: theme.colors.primary[100],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
});

export const EmptyMessage = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.lg,
});

export const AddBatterButton = styled.button({
    width: '100%',
    padding: theme.spacing.md,
    border: `2px dashed ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    background: 'white',
    color: theme.colors.gray[600],
    cursor: 'pointer',
    marginTop: theme.spacing.md,

    '&:hover': {
        borderColor: theme.colors.primary[400],
        color: theme.colors.primary[600],
    },
});
