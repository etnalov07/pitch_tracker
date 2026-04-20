import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import scoutingReportService from '../../services/scoutingReportService';
import { ScoutingReport } from '../../types';
import {
    BackButton,
    CancelButton,
    Container,
    Content,
    EmptyState,
    ErrorText,
    FormActions,
    FormCard,
    FormGroup,
    FormRow,
    Header,
    HeaderLeft,
    Input,
    Label,
    LoadingText,
    PrimaryButton,
    ReportCard,
    ReportGrid,
    ReportMeta,
    ReportOpponent,
    Title,
} from './styles';

const ScoutingReports: React.FC = () => {
    const navigate = useNavigate();
    const { team_id: teamId } = useParams<{ team_id: string }>();

    const [reports, setReports] = useState<ScoutingReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [opponentName, setOpponentName] = useState('');
    const [gameDate, setGameDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        if (!teamId) return;
        setLoading(true);
        try {
            const data = await scoutingReportService.listByTeam(teamId);
            setReports(data);
            setError('');
        } catch {
            setError('Failed to load scouting reports.');
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleCreate = async () => {
        if (!teamId || !opponentName.trim()) return;
        setSubmitting(true);
        try {
            const created = await scoutingReportService.create(teamId, {
                opponent_name: opponentName.trim(),
                game_date: gameDate || null,
            });
            setShowCreate(false);
            setOpponentName('');
            setGameDate('');
            navigate(`/teams/${teamId}/scouting/${created.id}`);
        } catch {
            setError('Failed to create scouting report.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${teamId}`)}>Back to Team</BackButton>
                    <Title>Scouting Reports</Title>
                </HeaderLeft>
                {!showCreate && <PrimaryButton onClick={() => setShowCreate(true)}>+ New Report</PrimaryButton>}
            </Header>

            <Content>
                {showCreate && (
                    <FormCard>
                        <FormRow>
                            <FormGroup>
                                <Label>Opponent name</Label>
                                <Input
                                    value={opponentName}
                                    onChange={(e) => setOpponentName(e.target.value)}
                                    placeholder="Lions Den 16U"
                                    autoFocus
                                />
                            </FormGroup>
                            <FormGroup>
                                <Label>Game date (optional)</Label>
                                <Input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
                            </FormGroup>
                        </FormRow>
                        <FormActions>
                            <CancelButton onClick={() => setShowCreate(false)}>Cancel</CancelButton>
                            <PrimaryButton onClick={handleCreate} disabled={submitting || !opponentName.trim()}>
                                {submitting ? 'Creating…' : 'Create'}
                            </PrimaryButton>
                        </FormActions>
                        {error && <ErrorText>{error}</ErrorText>}
                    </FormCard>
                )}

                {loading ? (
                    <LoadingText>Loading…</LoadingText>
                ) : reports.length === 0 ? (
                    <EmptyState>No scouting reports yet. Create one to pre-fill opponent batter tendencies.</EmptyState>
                ) : (
                    <ReportGrid>
                        {reports.map((r) => (
                            <ReportCard key={r.id} onClick={() => navigate(`/teams/${teamId}/scouting/${r.id}`)}>
                                <ReportOpponent>{r.opponent_name}</ReportOpponent>
                                <ReportMeta>
                                    {r.game_date ? new Date(r.game_date).toLocaleDateString() : 'No game linked'}
                                    {r.created_by_name ? ` · ${r.created_by_name}` : ''}
                                </ReportMeta>
                            </ReportCard>
                        ))}
                    </ReportGrid>
                )}
            </Content>
        </Container>
    );
};

export default ScoutingReports;
