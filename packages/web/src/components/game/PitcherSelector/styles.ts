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
    background: theme.surfaces.card,
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

export const PitcherList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const PitcherCard = styled.button<{ isActive?: boolean; disabled?: boolean }>((props) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    border: `2px solid ${props.isActive ? theme.colors.primary[500] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    background: props.isActive ? theme.colors.primary[50] : 'white',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.45 : 1,
    textAlign: 'left',
    width: '100%',

    '&:hover': {
        borderColor: props.disabled ? theme.colors.gray[200] : theme.colors.primary[400],
        background: props.disabled ? 'white' : theme.colors.primary[50],
    },
}));

export const PitcherInfo = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const JerseyNumber = styled.div({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.lg,
});

export const PitcherName = styled.div({
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[900],
});

export const PitcherStats = styled.div({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
});

export const ActiveBadge = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.green[700],
    backgroundColor: theme.colors.green[100],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
});

export const SectionTitle = styled.h3({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
});

export const EmptyMessage = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.lg,
});

// Rule violation text shown under the player name on ineligible cards.
export const IneligibleReason = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.red[700],
    marginTop: theme.spacing.xs,
});

// 'Unknown division/rules' is not a hard block — render a caveat chip instead.
export const CaveatChip = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.yellow[800],
    backgroundColor: theme.colors.yellow[100],
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.borderRadius.full,
    display: 'inline-block',
    marginTop: theme.spacing.xs,
});
