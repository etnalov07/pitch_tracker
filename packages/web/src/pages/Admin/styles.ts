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

export const HeaderRight = styled.div({
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
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
});

export const DestructiveToggle = styled.label<{ enabled: boolean }>(({ enabled }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: enabled ? theme.colors.red[700] : 'rgba(255,255,255,0.15)',
    color: 'white',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
}));

export const MainContent = styled.main({
    padding: theme.spacing.xl,
    maxWidth: 1200,
    margin: '0 auto',
});

export const TabBar = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.gray[300]}`,
    marginBottom: theme.spacing.lg,
});

export const Tab = styled.button<{ active: boolean }>(({ active }) => ({
    background: 'none',
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.fontSize.base,
    fontWeight: active ? theme.fontWeight.semibold : theme.fontWeight.normal,
    color: active ? theme.colors.primary[700] : theme.colors.gray[700],
    borderBottom: active ? `3px solid ${theme.colors.primary[600]}` : '3px solid transparent',
    cursor: 'pointer',
    marginBottom: -1,
}));

export const SearchRow = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
});

export const SearchInput = styled.input({
    flex: 1,
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    backgroundColor: theme.surfaces.card,
    color: theme.colors.gray[900],
});

export const Table = styled.table({
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: theme.surfaces.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    boxShadow: theme.shadows.sm,
});

export const Th = styled.th({
    textAlign: 'left',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.gray[100],
    color: theme.colors.gray[700],
    fontSize: theme.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: theme.fontWeight.semibold,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const Td = styled.td({
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.gray[100]}`,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[900],
});

export const ActionButton = styled.button<{ destructive?: boolean }>(({ destructive }) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    border: 'none',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    color: 'white',
    backgroundColor: destructive ? theme.colors.red[600] : theme.colors.primary[600],
    marginRight: theme.spacing.xs,
}));

export const Pager = styled.div({
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    color: theme.colors.gray[700],
    fontSize: theme.fontSize.sm,
});

export const LoadingText = styled.p({
    color: theme.colors.gray[600],
    fontStyle: 'italic',
});

export const ErrorText = styled.p({
    color: theme.colors.red[700],
    backgroundColor: theme.colors.red[50],
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
});
