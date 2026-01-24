import styled from '@emotion/styled';
import React, { useEffect, useState, useCallback } from 'react';
import { scoutingService } from '../../services/pitchService';
import { theme } from '../../styles/theme';
import { BatterScoutingReport, TendencyConfidence } from '../../types';

interface BatterScoutingNotesProps {
    batterId: string;
    collapsed?: boolean;
}

const BatterScoutingNotes: React.FC<BatterScoutingNotesProps> = ({ batterId, collapsed = true }) => {
    const [report, setReport] = useState<BatterScoutingReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(!collapsed);
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    const loadReport = useCallback(async () => {
        if (!batterId) return;
        try {
            setLoading(true);
            const data = await scoutingService.getScoutingReport(batterId);
            setReport(data);
        } catch (error) {
            console.error('Failed to load scouting report:', error);
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, [batterId]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const handleAddNote = async () => {
        if (!newNote.trim() || !batterId) return;
        try {
            setAddingNote(true);
            await scoutingService.addNote(batterId, newNote.trim());
            setNewNote('');
            await loadReport();
        } catch (error) {
            console.error('Failed to add note:', error);
        } finally {
            setAddingNote(false);
        }
    };

    const handleUpdateNote = async (noteId: string) => {
        if (!editingText.trim()) return;
        try {
            await scoutingService.updateNote(batterId, noteId, editingText.trim());
            setEditingNoteId(null);
            setEditingText('');
            await loadReport();
        } catch (error) {
            console.error('Failed to update note:', error);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await scoutingService.deleteNote(batterId, noteId);
            await loadReport();
        } catch (error) {
            console.error('Failed to delete note:', error);
        }
    };

    const formatPercentage = (value: number | null): string => {
        if (value === null) return '--';
        return `${Math.round(value * 100)}%`;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getConfidenceColor = (confidence: TendencyConfidence): string => {
        switch (confidence) {
            case 'high':
                return theme.colors.green[600];
            case 'medium':
                return theme.colors.yellow[600];
            case 'low':
                return theme.colors.gray[500];
        }
    };

    const getTendencyIcon = (type: string): string => {
        switch (type) {
            case 'chase':
                return '🎯';
            case 'takes':
                return '👀';
            case 'aggressive':
                return '⚡';
            case 'passive':
                return '🧘';
            case 'first_pitch':
                return '1️⃣';
            default:
                return '📊';
        }
    };

    if (!batterId) return null;

    const noteCount = report?.notes?.length || 0;
    const tendencyCount = report?.auto_detected?.length || 0;
    const totalCount = noteCount + tendencyCount;

    return (
        <Container>
            <Header onClick={() => setIsExpanded(!isExpanded)}>
                <HeaderTitle>
                    {isExpanded ? '▼' : '▶'} Scouting Notes ({totalCount})
                </HeaderTitle>
                {report && report.games_faced > 0 && (
                    <GamesCount>
                        {report.games_faced} game{report.games_faced > 1 ? 's' : ''}
                    </GamesCount>
                )}
            </Header>

            {isExpanded && (
                <Content>
                    {loading ? (
                        <LoadingText>Loading scouting data...</LoadingText>
                    ) : report ? (
                        <>
                            {/* Auto-Detected Tendencies */}
                            {report.auto_detected.length > 0 && (
                                <Section>
                                    <SectionTitle>Auto-Detected</SectionTitle>
                                    <TendencyList>
                                        {report.auto_detected.map((tendency, idx) => (
                                            <TendencyItem key={idx}>
                                                <TendencyIcon>{getTendencyIcon(tendency.type)}</TendencyIcon>
                                                <TendencyText>
                                                    <TendencyDescription>{tendency.description}</TendencyDescription>
                                                    <TendencyMeta>
                                                        <TendencyValue>{formatPercentage(tendency.value)}</TendencyValue>
                                                        <TendencyConfidenceText color={getConfidenceColor(tendency.confidence)}>
                                                            ({tendency.sample_size} pitches)
                                                        </TendencyConfidenceText>
                                                    </TendencyMeta>
                                                </TendencyText>
                                            </TendencyItem>
                                        ))}
                                    </TendencyList>
                                </Section>
                            )}

                            {/* Metrics Summary */}
                            {report.tendencies && report.tendencies.total_pitches_seen > 0 && (
                                <Section>
                                    <SectionTitle>Quick Stats</SectionTitle>
                                    <MetricsGrid>
                                        <MetricCard>
                                            <MetricLabel>Chase</MetricLabel>
                                            <MetricValue>{formatPercentage(report.tendencies.chase_rate)}</MetricValue>
                                        </MetricCard>
                                        <MetricCard>
                                            <MetricLabel>Watch</MetricLabel>
                                            <MetricValue>{formatPercentage(report.tendencies.watch_rate)}</MetricValue>
                                        </MetricCard>
                                        <MetricCard>
                                            <MetricLabel>1st Pitch</MetricLabel>
                                            <MetricValue>{formatPercentage(report.tendencies.first_pitch_take_rate)}</MetricValue>
                                        </MetricCard>
                                        <MetricCard>
                                            <MetricLabel>Early Swing</MetricLabel>
                                            <MetricValue>{formatPercentage(report.tendencies.early_count_rate)}</MetricValue>
                                        </MetricCard>
                                    </MetricsGrid>
                                </Section>
                            )}

                            {/* Manual Notes */}
                            <Section>
                                <SectionTitle>Manual Notes</SectionTitle>

                                <AddNoteForm>
                                    <NoteInput
                                        placeholder="Add a note..."
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddNote();
                                            }
                                        }}
                                    />
                                    <AddNoteButton onClick={handleAddNote} disabled={!newNote.trim() || addingNote}>
                                        {addingNote ? '...' : '+'}
                                    </AddNoteButton>
                                </AddNoteForm>

                                {report.notes.length > 0 ? (
                                    <NotesList>
                                        {report.notes.map((note) => (
                                            <NoteItem key={note.id}>
                                                {editingNoteId === note.id ? (
                                                    <EditNoteForm>
                                                        <EditNoteInput
                                                            value={editingText}
                                                            onChange={(e) => setEditingText(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <EditNoteActions>
                                                            <SaveButton onClick={() => handleUpdateNote(note.id)}>Save</SaveButton>
                                                            <CancelButton onClick={() => setEditingNoteId(null)}>
                                                                Cancel
                                                            </CancelButton>
                                                        </EditNoteActions>
                                                    </EditNoteForm>
                                                ) : (
                                                    <>
                                                        <NoteText>{note.note_text}</NoteText>
                                                        <NoteMeta>
                                                            {note.created_by_name && (
                                                                <NoteAuthor>{note.created_by_name}</NoteAuthor>
                                                            )}
                                                            <NoteDate>{formatDate(note.created_at)}</NoteDate>
                                                            <NoteActions>
                                                                <ActionButton
                                                                    onClick={() => {
                                                                        setEditingNoteId(note.id);
                                                                        setEditingText(note.note_text);
                                                                    }}
                                                                >
                                                                    Edit
                                                                </ActionButton>
                                                                <ActionButton danger onClick={() => handleDeleteNote(note.id)}>
                                                                    Delete
                                                                </ActionButton>
                                                            </NoteActions>
                                                        </NoteMeta>
                                                    </>
                                                )}
                                            </NoteItem>
                                        ))}
                                    </NotesList>
                                ) : (
                                    <EmptyNotes>No notes yet</EmptyNotes>
                                )}
                            </Section>
                        </>
                    ) : (
                        <EmptyState>No scouting data available</EmptyState>
                    )}
                </Content>
            )}
        </Container>
    );
};

// Styled Components
const Container = styled.div({
    backgroundColor: theme.colors.gray[50],
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
});

const Header = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    cursor: 'pointer',
    '&:hover': {
        backgroundColor: theme.colors.gray[100],
    },
});

const HeaderTitle = styled.span({
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[800],
    fontSize: theme.fontSize.sm,
});

const GamesCount = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

const Content = styled.div({
    padding: `0 ${theme.spacing.md} ${theme.spacing.md}`,
});

const Section = styled.div({
    marginBottom: theme.spacing.md,
});

const SectionTitle = styled.h4({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
});

const TendencyList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

const TendencyItem = styled.div({
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

const TendencyIcon = styled.span({
    fontSize: theme.fontSize.base,
    flexShrink: 0,
});

const TendencyText = styled.div({
    flex: 1,
    minWidth: 0,
});

const TendencyDescription = styled.span({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[900],
    display: 'block',
});

const TendencyMeta = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
    marginTop: '2px',
});

const TendencyValue = styled.span({
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary[600],
});

const TendencyConfidenceText = styled.span<{ color: string }>((props) => ({
    fontSize: theme.fontSize.xs,
    color: props.color,
}));

const MetricsGrid = styled.div({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing.xs,
});

const MetricCard = styled.div({
    backgroundColor: 'white',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
    textAlign: 'center',
});

const MetricLabel = styled.div({
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

const MetricValue = styled.div({
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.gray[900],
});

const AddNoteForm = styled.div({
    display: 'flex',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
});

const NoteInput = styled.input({
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

const AddNoteButton = styled.button({
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

const NotesList = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
});

const NoteItem = styled.div({
    backgroundColor: 'white',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    border: `1px solid ${theme.colors.gray[200]}`,
});

const NoteText = styled.p({
    margin: `0 0 ${theme.spacing.xs}`,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[900],
    whiteSpace: 'pre-wrap',
});

const NoteMeta = styled.div({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
});

const NoteAuthor = styled.span({});
const NoteDate = styled.span({});

const NoteActions = styled.div({
    marginLeft: 'auto',
    display: 'flex',
    gap: theme.spacing.xs,
});

const ActionButton = styled.button<{ danger?: boolean }>((props) => ({
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

const EditNoteForm = styled.div({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
});

const EditNoteInput = styled.textarea({
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

const EditNoteActions = styled.div({
    display: 'flex',
    gap: theme.spacing.sm,
});

const SaveButton = styled.button({
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

const CancelButton = styled.button({
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

const LoadingText = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.md,
    fontSize: theme.fontSize.sm,
});

const EmptyNotes = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[400],
    fontStyle: 'italic',
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.xs,
});

const EmptyState = styled.p({
    textAlign: 'center',
    color: theme.colors.gray[500],
    padding: theme.spacing.md,
    fontSize: theme.fontSize.sm,
});

export default BatterScoutingNotes;
