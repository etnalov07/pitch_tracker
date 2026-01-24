import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Container = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.md,
    maxHeight: '100%',
    overflowY: 'auto',
});

export const Header = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

export const Title = styled.h2({
    fontSize: theme.fontSize['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
    margin: 0,
});

export const ToggleButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const StatsGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: theme.spacing.sm,
});

export const StatCard = styled.div<{ highlighted?: boolean }>((props) => ({
    padding: theme.spacing.md,
    backgroundColor: props.highlighted ? theme.colors.primary[50] : theme.colors.gray[50],
    border: `2px solid ${props.highlighted ? theme.colors.primary[200] : theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    textAlign: 'center',
}));

export const StatLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
    fontWeight: theme.fontWeight.medium,
    marginBottom: theme.spacing.xs,
});

export const StatValue = styled.div({
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
});

export const AtBatsSection = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
});

export const SectionTitle = styled.h3({
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    margin: 0,
});

export const AtBatsList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
});

export const AtBatCard = styled.div({
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray[50],
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
});

export const AtBatHeader = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
});

export const AtBatNumber = styled.span({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
});

const getAtBatResultBgColor = (result?: string): string => {
    if (!result) return theme.colors.gray[200];
    if (result.includes('single') || result.includes('double') || result.includes('triple') || result.includes('home_run')) {
        return theme.colors.green[100];
    }
    if (result.includes('strikeout')) return theme.colors.red[100];
    if (result.includes('walk')) return theme.colors.yellow[100];
    return theme.colors.gray[200];
};

const getAtBatResultColor = (result?: string): string => {
    if (!result) return theme.colors.gray[700];
    if (result.includes('single') || result.includes('double') || result.includes('triple') || result.includes('home_run')) {
        return theme.colors.green[700];
    }
    if (result.includes('strikeout')) return theme.colors.red[700];
    if (result.includes('walk')) return theme.colors.yellow[700];
    return theme.colors.gray[700];
};

export const AtBatResult = styled.span<{ result?: string }>((props) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: getAtBatResultBgColor(props.result),
    color: getAtBatResultColor(props.result),
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    borderRadius: theme.borderRadius.sm,
    textTransform: 'uppercase',
}));

export const AtBatDetails = styled.div({
    display: 'flex',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
});

export const Detail = styled.div({
    display: 'flex',
    gap: theme.spacing.xs,
    alignItems: 'baseline',
});

export const DetailLabel = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[600],
});

export const DetailValue = styled.span<{ highlight?: boolean }>((props) => ({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: props.highlight ? theme.colors.green[600] : theme.colors.gray[900],
}));

export const PitchSequence = styled.div({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
});

const getPitchBadgeBgColor = (result: string): string => {
    switch (result) {
        case 'ball':
            return theme.colors.gray[300];
        case 'called_strike':
            return theme.colors.green[200];
        case 'swinging_strike':
            return theme.colors.red[200];
        case 'foul':
            return theme.colors.yellow[200];
        case 'in_play':
            return theme.colors.primary[200];
        default:
            return theme.colors.gray[200];
    }
};

const getPitchBadgeColor = (result: string): string => {
    switch (result) {
        case 'ball':
            return theme.colors.gray[800];
        case 'called_strike':
            return theme.colors.green[800];
        case 'swinging_strike':
            return theme.colors.red[800];
        case 'foul':
            return theme.colors.yellow[800];
        case 'in_play':
            return theme.colors.primary[800];
        default:
            return theme.colors.gray[800];
    }
};

export const PitchBadge = styled.span<{ result: string }>((props) => ({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: getPitchBadgeBgColor(props.result),
    color: getPitchBadgeColor(props.result),
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    borderRadius: theme.borderRadius.sm,
}));

export const LoadingText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[600],
    fontSize: theme.fontSize.base,
    padding: theme.spacing.xl,
});

export const EmptyText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    fontSize: theme.fontSize.sm,
    fontStyle: 'italic',
    padding: theme.spacing.lg,
});
