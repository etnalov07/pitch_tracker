import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Container = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.sm,
});

export const DiamondSvg = styled.svg({
    width: '100%',
    maxWidth: '300px',
    height: 'auto',
    cursor: 'crosshair',
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.green[50],
});

export const Legend = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
});

export const LegendItem = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
});

export const LegendLine = styled.div({
    width: '16px',
    height: '3px',
    borderRadius: '2px',
});
