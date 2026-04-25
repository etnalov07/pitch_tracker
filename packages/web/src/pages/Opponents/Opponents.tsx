import { OpponentTeam } from '@pitch-tracker/shared';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { opponentTeamService } from '../../services/opponentTeamService';
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
    OpponentCard,
    OpponentGrid,
    OpponentMeta,
    OpponentName,
    PrimaryButton,
    Title,
} from './styles';

const Opponents: React.FC = () => {
    const navigate = useNavigate();
    const { team_id: teamId } = useParams<{ team_id: string }>();

    const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [level, setLevel] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        if (!teamId) return;
        setLoading(true);
        try {
            const data = await opponentTeamService.list(teamId);
            setOpponents(data);
            setError('');
        } catch {
            setError('Failed to load opponents.');
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleCreate = async () => {
        if (!teamId || !name.trim()) return;
        setSubmitting(true);
        try {
            const created = await opponentTeamService.create(teamId, {
                name: name.trim(),
                city: city.trim() || null,
                level: level.trim() || null,
            });
            setShowCreate(false);
            setName('');
            setCity('');
            setLevel('');
            navigate(`/teams/${teamId}/opponents/${created.id}`);
        } catch {
            setError('Failed to create opponent.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${teamId}`)}>Back to Team</BackButton>
                    <Title>Opponent Teams</Title>
                </HeaderLeft>
                {!showCreate && <PrimaryButton onClick={() => setShowCreate(true)}>+ Add Opponent</PrimaryButton>}
            </Header>

            <Content>
                {showCreate && (
                    <FormCard>
                        <FormRow>
                            <FormGroup>
                                <Label>Team name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Johnson High School"
                                    autoFocus
                                />
                            </FormGroup>
                            <FormGroup>
                                <Label>City (optional)</Label>
                                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Houston" />
                            </FormGroup>
                            <FormGroup>
                                <Label>Level (optional)</Label>
                                <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="High School" />
                            </FormGroup>
                        </FormRow>
                        <FormActions>
                            <CancelButton onClick={() => setShowCreate(false)}>Cancel</CancelButton>
                            <PrimaryButton onClick={handleCreate} disabled={submitting || !name.trim()}>
                                {submitting ? 'Saving…' : 'Add Opponent'}
                            </PrimaryButton>
                        </FormActions>
                        {error && <ErrorText>{error}</ErrorText>}
                    </FormCard>
                )}

                {loading ? (
                    <LoadingText>Loading…</LoadingText>
                ) : opponents.length === 0 ? (
                    <EmptyState>
                        No opponents tracked yet. Add an opponent team to start building a scouting database across games.
                    </EmptyState>
                ) : (
                    <OpponentGrid>
                        {opponents.map((o) => (
                            <OpponentCard key={o.id} onClick={() => navigate(`/teams/${teamId}/opponents/${o.id}`)}>
                                <OpponentName>{o.name}</OpponentName>
                                <OpponentMeta>
                                    {[o.city, o.level].filter(Boolean).join(' · ')}
                                    {o.games_played > 0 && ` · ${o.games_played} game${o.games_played !== 1 ? 's' : ''}`}
                                    {o.last_game_date && ` · Last: ${new Date(o.last_game_date).toLocaleDateString()}`}
                                </OpponentMeta>
                            </OpponentCard>
                        ))}
                    </OpponentGrid>
                )}
            </Content>
        </Container>
    );
};

export default Opponents;
