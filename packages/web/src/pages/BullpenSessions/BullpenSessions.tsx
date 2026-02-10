import { BullpenSessionWithDetails, BullpenSessionSummary, BullpenIntensity, Team } from '@pitch-tracker/shared';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BullpenLogDetail } from '../../components/pitcher';
import { TeamLogo } from '../../components/team';
import api from '../../services/api';
import { bullpenService } from '../../services/bullpenService';
import {
    Container,
    Header,
    HeaderLeft,
    BackButton,
    TeamInfo,
    Title,
    Subtitle,
    Content,
    FilterBar,
    FilterLabel,
    FilterSelect,
    Table,
    Th,
    Row,
    Td,
    IntensityBadge,
    ViewButton,
    EmptyState,
    NewSessionButton,
    LoadingText,
    ErrorText,
} from './styles';

const BullpenSessions: React.FC = () => {
    const navigate = useNavigate();
    const { team_id } = useParams<{ team_id: string }>();

    const [team, setTeam] = useState<Team | null>(null);
    const [sessions, setSessions] = useState<BullpenSessionWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pitcherFilter, setPitcherFilter] = useState<string>('');
    const [selectedSummary, setSelectedSummary] = useState<BullpenSessionSummary | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!team_id) return;
            try {
                setLoading(true);
                const [teamRes, sessionsRes] = await Promise.all([
                    api.get(`/teams/${team_id}`),
                    bullpenService.getTeamSessions(team_id),
                ]);
                setTeam(teamRes.data.team);
                setSessions(sessionsRes);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load bullpen sessions');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [team_id]);

    const pitchers = useMemo(() => {
        const map = new Map<string, string>();
        sessions.forEach((s) => {
            map.set(s.pitcher_id, `${s.pitcher_first_name} ${s.pitcher_last_name}`);
        });
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [sessions]);

    const filteredSessions = useMemo(() => {
        if (!pitcherFilter) return sessions;
        return sessions.filter((s) => s.pitcher_id === pitcherFilter);
    }, [sessions, pitcherFilter]);

    const handleSessionClick = async (session: BullpenSessionWithDetails) => {
        try {
            const summary = await bullpenService.getSessionSummary(session.id);
            setSelectedSummary(summary);
        } catch {
            // If summary fetch fails, build a minimal one from the session data
            const strikePercent = session.total_pitches > 0 ? Math.round((session.strikes / session.total_pitches) * 100) : 0;
            setSelectedSummary({
                session_id: session.id,
                date: session.date,
                intensity: session.intensity as BullpenIntensity,
                total_pitches: session.total_pitches,
                strikes: session.strikes,
                balls: session.balls,
                strike_percentage: strikePercent,
                target_accuracy_percentage: null,
                pitch_type_breakdown: [],
                plan_name: session.plan_name,
                notes: session.notes ?? undefined,
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading bullpen sessions...</LoadingText>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <ErrorText>{error}</ErrorText>
            </Container>
        );
    }

    return (
        <Container>
            <Header style={{ '--team-primary': '#243b53', '--team-secondary': '#0B1F3A' } as React.CSSProperties}>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${team_id}`)}>Back to Team</BackButton>
                    {team && <TeamLogo team={team} size="md" />}
                    <TeamInfo>
                        <Title>Bullpen Sessions</Title>
                        {team && <Subtitle>{team.name}</Subtitle>}
                    </TeamInfo>
                </HeaderLeft>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <NewSessionButton onClick={() => navigate(`/teams/${team_id}/bullpen/plans`)}>Plans</NewSessionButton>
                    <NewSessionButton onClick={() => navigate(`/teams/${team_id}/bullpen/new`)}>+ New Session</NewSessionButton>
                </div>
            </Header>

            <Content>
                {pitchers.length > 1 && (
                    <FilterBar>
                        <FilterLabel>Filter by pitcher:</FilterLabel>
                        <FilterSelect value={pitcherFilter} onChange={(e) => setPitcherFilter(e.target.value)}>
                            <option value="">All Pitchers</option>
                            {pitchers.map(([id, name]) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </FilterSelect>
                    </FilterBar>
                )}

                {filteredSessions.length === 0 ? (
                    <EmptyState>No bullpen sessions found</EmptyState>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Date</Th>
                                <Th>Pitcher</Th>
                                <Th align="center">Intensity</Th>
                                <Th align="center">Pitches</Th>
                                <Th align="center">B/S</Th>
                                <Th align="center">Strike %</Th>
                                <Th align="center"></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSessions.map((session) => {
                                const strikePercent =
                                    session.total_pitches > 0 ? Math.round((session.strikes / session.total_pitches) * 100) : 0;
                                return (
                                    <Row key={session.id} onClick={() => handleSessionClick(session)}>
                                        <Td>{formatDate(session.date)}</Td>
                                        <Td>
                                            {session.pitcher_first_name} {session.pitcher_last_name}
                                            {session.pitcher_jersey_number != null && ` #${session.pitcher_jersey_number}`}
                                        </Td>
                                        <Td align="center">
                                            <IntensityBadge intensity={session.intensity as 'low' | 'medium' | 'high'}>
                                                {session.intensity}
                                            </IntensityBadge>
                                        </Td>
                                        <Td align="center">{session.total_pitches}</Td>
                                        <Td align="center">
                                            {session.balls}/{session.strikes}
                                        </Td>
                                        <Td align="center" highlight>
                                            {strikePercent}%
                                        </Td>
                                        <Td align="center">
                                            <ViewButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSessionClick(session);
                                                }}
                                            >
                                                View
                                            </ViewButton>
                                        </Td>
                                    </Row>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Content>

            {selectedSummary && <BullpenLogDetail session={selectedSummary} onClose={() => setSelectedSummary(null)} />}
        </Container>
    );
};

export default BullpenSessions;
