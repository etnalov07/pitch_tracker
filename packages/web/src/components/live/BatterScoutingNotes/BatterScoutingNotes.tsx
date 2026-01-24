import React, { useEffect, useState, useCallback } from 'react';
import { scoutingService } from '../../../services/pitchService';
import { theme } from '../../../styles/theme';
import { BatterScoutingReport, TendencyConfidence } from '../../../types';
import {
    Container,
    Header,
    HeaderTitle,
    GamesCount,
    Content,
    Section,
    SectionTitle,
    TendencyList,
    TendencyItem,
    TendencyIcon,
    TendencyText,
    TendencyDescription,
    TendencyMeta,
    TendencyValue,
    TendencyConfidenceText,
    MetricsGrid,
    MetricCard,
    MetricLabel,
    MetricValue,
    AddNoteForm,
    NoteInput,
    AddNoteButton,
    NotesList,
    NoteItem,
    NoteText,
    NoteMeta,
    NoteAuthor,
    NoteDate,
    NoteActions,
    ActionButton,
    EditNoteForm,
    EditNoteInput,
    EditNoteActions,
    SaveButton,
    CancelButton,
    LoadingText,
    EmptyNotes,
    EmptyState,
} from './styles';

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

export default BatterScoutingNotes;
