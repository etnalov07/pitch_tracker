import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

export const Container = styled.div({
    minHeight: '100vh',
    backgroundColor: theme.surfaces.body,
});

export const Header = styled.header({
    background: 'linear-gradient(135deg, var(--header-bg-start) 0%, var(--header-bg-end) 100%)',
    color: 'white',
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const HeaderLeft = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const Title = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    margin: 0,
});

export const BackButton = styled.button({
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
    transition: 'all 0.2s',

    '&:hover': {
        background: 'rgba(255, 255, 255, 0.3)',
    },
});

export const MainContent = styled.main({
    maxWidth: '720px',
    margin: '0 auto',
    padding: theme.spacing.xl,
});

export const Section = styled.section({
    backgroundColor: theme.colors.gray[50],
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
    marginBottom: theme.spacing.sm,
});

export const SectionDescription = styled.p({
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[600],
    margin: 0,
    marginBottom: theme.spacing['2xl'],
});

export const ChoiceGroup = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.md,
});

export const ChoiceButton = styled.button<{ active: boolean }>(({ active }) => ({
    appearance: 'none',
    cursor: 'pointer',
    padding: `${theme.spacing.lg} ${theme.spacing.md}`,
    border: `2px solid ${active ? theme.colors.primary[600] : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    backgroundColor: active ? theme.colors.primary[50] : theme.colors.gray[50],
    color: active ? theme.colors.primary[700] : theme.colors.gray[700],
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.sm,
    transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',

    '&:hover': {
        borderColor: theme.colors.primary[500],
    },
}));

export const ChoiceIcon = styled.span({
    fontSize: theme.fontSize['3xl'],
    lineHeight: 1,
});

export const ChoiceLabel = styled.span({});
