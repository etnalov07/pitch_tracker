import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.colors.gray[100],
});

export const Header = styled.header({
    background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%)`,
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.lg,
});

export const BackButton = styled.button({
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'white',
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,

    '&:hover': {
        background: 'rgba(255, 255, 255, 0.2)',
    },
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: 'white',
    margin: 0,
});

export const Content = styled.main({
    maxWidth: '700px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const Section = styled.div({
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    marginTop: 0,
    marginBottom: theme.spacing.lg,
});

export const PitcherGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: theme.spacing.sm,
});

export const PitcherButton = styled.button<{ selected?: boolean }>((props) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: props.selected ? theme.colors.primary[50] : 'white',
    color: props.selected ? theme.colors.primary[700] : theme.colors.gray[700],
    border: `2px solid ${props.selected ? theme.colors.primary[500] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: props.selected ? theme.fontWeight.semibold : theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',

    '&:hover': {
        borderColor: props.selected ? theme.colors.primary[500] : theme.colors.gray[400],
        backgroundColor: props.selected ? theme.colors.primary[50] : theme.colors.gray[50],
    },
}));

export const JerseyNumber = styled.span({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.sm,
    flexShrink: 0,
});

export const IntensityGroup = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
});

export const IntensityButton = styled.button<{ selected?: boolean; intensity: 'low' | 'medium' | 'high' }>((props) => {
    const colors = {
        low: { bg: '#dcfce7', border: '#16a34a', text: '#16a34a' },
        medium: { bg: '#fef9c3', border: '#ca8a04', text: '#ca8a04' },
        high: { bg: '#fee2e2', border: '#dc2626', text: '#dc2626' },
    };
    const c = colors[props.intensity];
    return {
        flex: 1,
        padding: theme.spacing.md,
        backgroundColor: props.selected ? c.bg : 'white',
        color: props.selected ? c.text : theme.colors.gray[600],
        border: `2px solid ${props.selected ? c.border : theme.colors.gray[200]}`,
        borderRadius: theme.borderRadius.md,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeight.semibold,
        cursor: 'pointer',
        transition: 'all 0.15s',
        textAlign: 'center' as const,

        '&:hover': {
            borderColor: props.selected ? c.border : theme.colors.gray[400],
        },
    };
});

export const IntensityLabel = styled.div({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.normal,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.xs,
});

export const StartButton = styled.button({
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'background-color 0.2s',

    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.primary[700],
    },

    '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
});

export const LoadingText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[600],
    padding: theme.spacing.xl,
});

export const ErrorText = styled.p({
    textAlign: 'center',
    color: theme.colors.red[600],
    padding: theme.spacing.xl,
});
