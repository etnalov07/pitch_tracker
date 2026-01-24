import styled from '@emotion/styled';
import { theme } from '../../../styles/theme';

export const Container = styled.div({
    backgroundColor: theme.colors.gray[50],
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
});

export const Header = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    cursor: 'pointer',
    '&:hover': {
        backgroundColor: theme.colors.gray[100],
    },
});

export const HeaderTitle = styled.span({
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    fontSize: theme.fontSize.sm,
});

export const GamesCount = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

export const Content = styled.div({
    padding: `0 ${theme.spacing.md} ${theme.spacing.md}`,
});

export const Section = styled.div({
    marginBottom: theme.spacing.md,
});

export const SectionTitle = styled.h4({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});

export const TendencyList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const TendencyItem = styled.div({
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const TendencyIcon = styled.span({
    fontSize: theme.fontSize.base,
    flexShrink: 0,
});

export const TendencyText = styled.div({
    flex: 1,
    minWidth: 0,
});

export const TendencyDescription = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[900],
    display: 'block',
});

export const TendencyMeta = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginTop: '2px',
});

export const TendencyValue = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[600],
});

export const TendencyConfidenceText = styled.span<{ color: string }>((props) => ({
    fontSize: theme.fontSize.xs,
    color: props.color,
}));

export const MetricsGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing.xs,
});

export const MetricCard = styled.div({
    backgroundColor: 'white',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
    textAlign: 'center',
});

export const MetricLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

export const MetricValue = styled.div({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
});

export const AddNoteForm = styled.div({
    display: 'flex',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
});

export const NoteInput = styled.input({
    flex: 1,
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
    },
});

export const AddNoteButton = styled.button({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontWeight: theme.fontWeight.semibold,
    '&:disabled': {
        backgroundColor: theme.colors.gray[300],
        cursor: 'not-allowed',
    },
    '&:hover:not(:disabled)': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const NotesList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

export const NoteItem = styled.div({
    backgroundColor: 'white',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

export const NoteText = styled.p({
    margin: `0 0 ${theme.spacing.xs}`,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[900],
    whiteSpace: 'pre-wrap',
});

export const NoteMeta = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

export const NoteAuthor = styled.span({});

export const NoteDate = styled.span({});

export const NoteActions = styled.div({
    marginLeft: 'auto',
    display: 'flex',
    gap: theme.spacing.xs,
});

export const ActionButton = styled.button<{ danger?: boolean }>((props) => ({
    padding: `2px ${theme.spacing.xs}`,
    background: 'none',
    border: 'none',
    color: props.danger ? theme.colors.red[500] : theme.colors.primary[600],
    cursor: 'pointer',
    fontSize: theme.fontSize.xs,
    '&:hover': {
        textDecoration: 'underline',
    },
}));

export const EditNoteForm = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

export const EditNoteInput = styled.textarea({
    width: '100%',
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.primary[300]}`,
    borderRadius: theme.borderRadius.sm,
    resize: 'vertical',
    minHeight: '60px',
    fontSize: theme.fontSize.sm,
    '&:focus': {
        outline: 'none',
        borderColor: theme.colors.primary[500],
    },
});

export const EditNoteActions = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
});

export const SaveButton = styled.button({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.primary[600],
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: theme.fontSize.xs,
    '&:hover': {
        backgroundColor: theme.colors.primary[700],
    },
});

export const CancelButton = styled.button({
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.gray[200],
    color: theme.colors.gray[700],
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: theme.fontSize.xs,
    '&:hover': {
        backgroundColor: theme.colors.gray[300],
    },
});

export const LoadingText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.md,
    fontSize: theme.fontSize.sm,
});

export const EmptyNotes = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[400],
    fontStyle: 'italic',
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.xs,
});

export const EmptyState = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.md,
    fontSize: theme.fontSize.sm,
});
