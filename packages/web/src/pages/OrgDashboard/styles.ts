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
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const HeaderRight = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const OrgName = styled.h1({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    margin: 0,
});

export const SubLine = styled.p({
    margin: 0,
    opacity: 0.9,
    fontSize: theme.fontSize.sm,
});

export const OrgSwitcher = styled.select({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: '1px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: 'white',
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
});

export const LogoutButton = styled.button({
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: theme.fontSize.sm,
});

export const MainContent = styled.main({
    padding: theme.spacing.xl,
    maxWidth: 800,
    margin: '0 auto',
});

export const TabContainer = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
});

export const TabButton = styled.button<{ active: boolean }>(({ active }) => ({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    border: `1px solid ${active ? theme.colors.primary[600] : theme.colors.gray[300]}`,
    backgroundColor: active ? theme.colors.primary[600] : theme.surfaces.card,
    color: active ? 'white' : theme.colors.gray[700],
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
}));

export const Section = styled.section({
    backgroundColor: theme.surfaces.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    boxShadow: theme.shadows.sm,
});

export const SectionTitle = styled.h2({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
    marginBottom: theme.spacing.md,
});

export const TeamGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: theme.spacing.md,
});

export const TeamCard = styled.div({
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    cursor: 'pointer',
    backgroundColor: theme.surfaces.card,
    ':hover': {
        borderColor: theme.colors.primary[400],
    },
});

export const TeamCardName = styled.div({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
});

export const TeamCardMeta = styled.div({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginTop: theme.spacing.xs,
});

export const MemberRow = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${theme.spacing.md} 0`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
});

export const MemberInfo = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const MemberName = styled.span({
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.gray[900],
});

export const MemberEmail = styled.span({
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
});

export const MemberRight = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
});

export const RoleBadge = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase',
    color: theme.colors.primary[700],
    backgroundColor: theme.colors.primary[100],
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
});

export const InlineForm = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    flexWrap: 'wrap',
});

export const TextInput = styled.input({
    flex: 1,
    minWidth: 160,
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
});

export const RoleSelect = styled.select({
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    cursor: 'pointer',
});

export const PrimaryButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    cursor: 'pointer',
    ':disabled': {
        opacity: 0.6,
        cursor: 'default',
    },
});

export const RemoveButton = styled.button({
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    color: theme.colors.red[700],
    border: `1px solid ${theme.colors.red[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
});

export const ResendButton = styled.button({
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    color: theme.colors.primary[700],
    border: `1px solid ${theme.colors.primary[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    cursor: 'pointer',
    ':disabled': {
        opacity: 0.6,
        cursor: 'default',
    },
});

export const MemberStatus = styled.span<{ tone: 'muted' | 'ok' }>(({ tone }) => ({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: tone === 'ok' ? theme.colors.green[700] : theme.colors.gray[500],
}));

export const ErrorText = styled.p({
    color: theme.colors.red[700],
    fontSize: theme.fontSize.sm,
    margin: `${theme.spacing.sm} 0 0`,
});

export const HelperText = styled.p({
    color: theme.colors.gray[600],
    fontSize: theme.fontSize.sm,
    margin: 0,
});

export const EmptyState = styled.div({
    textAlign: 'center',
    padding: theme.spacing['3xl'],
    color: theme.colors.gray[600],
});

export const EmptyTitle = styled.h2({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[900],
    margin: 0,
    marginBottom: theme.spacing.sm,
});

export const EmptyText = styled.p({
    margin: 0,
    marginBottom: theme.spacing.lg,
    color: theme.colors.gray[600],
});
