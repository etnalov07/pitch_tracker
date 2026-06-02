import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Card = styled.div({
    background: theme.surfaces.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
    marginBottom: theme.spacing.lg,
});

export const Header = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
    flexWrap: 'wrap',
});

export const Title = styled.h3({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[800],
    margin: 0,
});

export const ControlsRow = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
});

export const WindowSelect = styled.select({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    fontSize: theme.fontSize.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    background: theme.surfaces.card,
    color: theme.colors.gray[800],
});

export const LoadingText = styled.div({
    color: theme.colors.gray[500],
    padding: theme.spacing.md,
    textAlign: 'center',
});

export const EmptyText = styled.div({
    color: theme.colors.gray[500],
    padding: theme.spacing.md,
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
});

export const Table = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
});

export const Th = styled.th({
    textAlign: 'left',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const HandHeader = styled.th({
    textAlign: 'center',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const HandSubHeader = styled.div({
    fontSize: '10px',
    fontWeight: theme.fontWeight.normal,
    color: theme.colors.gray[400],
    textTransform: 'none',
    letterSpacing: 0,
    marginTop: 2,
});

export const Row = styled.tr({
    cursor: 'pointer',
    transition: 'background 0.15s',

    '&:hover': {
        background: theme.colors.gray[50],
    },
});

export const Td = styled.td({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[800],
    verticalAlign: 'middle',
});

export const PitchCell = styled.td({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
});

export const PctCell = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
});

export const Sample = styled.span({
    fontSize: '10px',
    color: theme.colors.gray[400],
});

export const ExpandHint = styled.span({
    color: theme.colors.gray[400],
    fontSize: theme.fontSize.xs,
});

export const ExpandedRow = styled.tr({
    background: theme.colors.gray[50],
});

export const ExpandedGrid = styled.div({
    display: 'flex',
    gap: theme.spacing.xl,
    padding: theme.spacing.md,
    justifyContent: 'center',
    flexWrap: 'wrap',
});

export const ExpandedGridCol = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const ExpandedColLabel = styled.div({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});
