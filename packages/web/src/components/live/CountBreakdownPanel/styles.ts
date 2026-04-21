import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Panel = styled.div({
    background: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    boxShadow: theme.shadows.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const PanelTitle = styled.h4({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    margin: `0 0 ${theme.spacing.md} 0`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});

export const Grid = styled.div({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
});

export const BucketCard = styled.div({
    background: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const BucketLabel = styled.div({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.xs,
});

export const BucketTotal = styled.div({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
});

export const BucketStrike = styled.div<{ pct: number }>((props) => ({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: props.pct >= 60 ? theme.colors.green[600] : props.pct >= 45 ? theme.colors.yellow[600] : theme.colors.red[600],
}));

export const TypeList = styled.div({
    marginTop: theme.spacing.xs,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
});

export const TypeRow = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
});

export const EmptyText = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
    textAlign: 'center',
    margin: `${theme.spacing.md} 0`,
});
