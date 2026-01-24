import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Container = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
});

export const Title = styled.h3({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const ZoneWrapper = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    alignItems: 'center',
});

export const MainSvg = styled.svg({
    width: '100%',
    maxWidth: '350px',
    height: 'auto',
    cursor: 'crosshair',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.md,
});

export const ClearTargetButton = styled.button({
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.gray[700],
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
        backgroundColor: theme.colors.gray[200],
        borderColor: theme.colors.gray[400],
    },
});

export const Legend = styled.div({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    borderRadius: theme.borderRadius.md,
});

export const LegendItem = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
});

export const LegendDot = styled.div<{ color: string }>((props) => ({
    width: '12px',
    height: '12px',
    backgroundColor: props.color,
    borderRadius: '50%',
    border: '1px solid white',
    boxShadow: theme.shadows.sm,
}));

export const TargetIcon = styled.div({
    width: '14px',
    height: '14px',
    border: `2px dashed ${theme.colors.primary[500]}`,
    borderRadius: '50%',
});

export const Instructions = styled.p({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    textAlign: 'center',
    margin: 0,
    fontStyle: 'italic',
});
