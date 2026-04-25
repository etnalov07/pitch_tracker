import { OpponentPitcherProfile, OpponentPitcherTendencies, OpponentTeamWithRoster } from '@pitch-tracker/shared';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { opponentPitcherProfileService, opponentTeamService } from '../../services/opponentTeamService';
import {
    BackButton,
    Container,
    Content,
    EmptyState,
    ErrorText,
    Header,
    HeaderLeft,
    HeaderRight,
    LoadingText,
    PrimaryButton,
    RosterList,
    RosterMeta,
    RosterName,
    RosterRow,
    SecondaryButton,
    Section,
    SectionTitle,
    StatBox,
    StatGrid,
    StatLabel,
    StatValue,
    Subtitle,
    Title,
} from './styles';

function fmt(n: number | null | undefined, suffix = '%'): string {
    if (n == null) return '—';
    return `${n}${suffix}`;
}

function PitcherTendenciesPanel({ pitcher }: { pitcher: OpponentPitcherProfile }) {
    const [tendencies, setTendencies] = useState<OpponentPitcherTendencies | null | 'loading'>('loading');
    const [recalcing, setRecalcing] = useState(false);

    useEffect(() => {
        opponentPitcherProfileService
            .getById(pitcher.id)
            .then(({ tendencies: t }) => setTendencies(t))
            .catch(() => setTendencies(null));
    }, [pitcher.id]);

    const handleRecalc = async () => {
        setRecalcing(true);
        try {
            const updated = await opponentPitcherProfileService.recalculate(pitcher.id);
            setTendencies(updated);
        } finally {
            setRecalcing(false);
        }
    };

    return (
        <Section>
            <SectionTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                    {pitcher.pitcher_name}
                    <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, color: '#6b7280' }}>
                        {pitcher.throws}HP · {pitcher.games_pitched}G
                    </span>
                </span>
                <SecondaryButton onClick={handleRecalc} disabled={recalcing} style={{ fontSize: 11, padding: '4px 10px' }}>
                    {recalcing ? 'Updating…' : 'Recalc'}
                </SecondaryButton>
            </SectionTitle>
            {tendencies === 'loading' ? (
                <EmptyState>Loading…</EmptyState>
            ) : !tendencies || tendencies.total_pitches === 0 ? (
                <EmptyState>No pitch data yet. Data accumulates as you chart games vs. this pitcher.</EmptyState>
            ) : (
                <>
                    <StatGrid>
                        <StatBox>
                            <StatValue>{tendencies.total_pitches}</StatValue>
                            <StatLabel>Pitches</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.strike_percentage)}</StatValue>
                            <StatLabel>Strike%</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.first_pitch_strike_pct)}</StatValue>
                            <StatLabel>F-Strike%</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.fastball_pct)}</StatValue>
                            <StatLabel>FB%</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.breaking_pct)}</StatValue>
                            <StatLabel>Break%</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{fmt(tendencies.offspeed_pct)}</StatValue>
                            <StatLabel>OS%</StatLabel>
                        </StatBox>
                    </StatGrid>
                    {tendencies.early_count_fastball_pct != null && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            <strong>Early count (0 strikes):</strong> {fmt(tendencies.early_count_fastball_pct)} fastball
                        </div>
                    )}
                    {tendencies.two_strike_offspeed_pct != null && (
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                            <strong>Two-strike:</strong> {fmt(tendencies.two_strike_offspeed_pct)} offspeed
                        </div>
                    )}
                </>
            )}
        </Section>
    );
}

const OpponentDetail: React.FC = () => {
    const navigate = useNavigate();
    const { team_id: teamId, id } = useParams<{ team_id: string; id: string }>();
    const [opponent, setOpponent] = useState<OpponentTeamWithRoster | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPitcher, setSelectedPitcher] = useState<OpponentPitcherProfile | null>(null);

    const load = useCallback(async () => {
        if (!teamId || !id) return;
        setLoading(true);
        try {
            const data = await opponentTeamService.getById(teamId, id);
            setOpponent(data);
        } catch {
            setError('Opponent team not found.');
        } finally {
            setLoading(false);
        }
    }, [teamId, id]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <LoadingText>Loading…</LoadingText>;
    if (error || !opponent) return <ErrorText>{error || 'Not found'}</ErrorText>;

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${teamId}/opponents`)}>Opponents</BackButton>
                    <div>
                        <Title>{opponent.name}</Title>
                        <Subtitle>
                            {[opponent.city, opponent.level].filter(Boolean).join(' · ')}
                            {opponent.games_played > 0 &&
                                ` · ${opponent.games_played} charted game${opponent.games_played !== 1 ? 's' : ''}`}
                        </Subtitle>
                    </div>
                </HeaderLeft>
                <HeaderRight>
                    <SecondaryButton onClick={() => navigate(`/teams/${teamId}/opponents`)}>Back</SecondaryButton>
                </HeaderRight>
            </Header>

            <Content>
                {/* Pitchers column */}
                <div>
                    <Section style={{ marginBottom: 20 }}>
                        <SectionTitle>Pitcher Roster</SectionTitle>
                        {opponent.pitchers.length === 0 ? (
                            <EmptyState>No pitchers yet. They appear automatically when you chart games vs. this team.</EmptyState>
                        ) : (
                            <RosterList>
                                {opponent.pitchers.map((p) => (
                                    <RosterRow key={p.id} onClick={() => setSelectedPitcher(p === selectedPitcher ? null : p)}>
                                        <RosterName>{p.pitcher_name}</RosterName>
                                        <RosterMeta>
                                            {p.throws}HP · {p.games_pitched}G
                                        </RosterMeta>
                                    </RosterRow>
                                ))}
                            </RosterList>
                        )}
                    </Section>

                    {selectedPitcher && <PitcherTendenciesPanel pitcher={selectedPitcher} />}
                </div>

                {/* Batters column */}
                <Section>
                    <SectionTitle>Batter Roster</SectionTitle>
                    {opponent.batters.length === 0 ? (
                        <EmptyState>No batters yet. They appear automatically when you chart opponent lineups.</EmptyState>
                    ) : (
                        <RosterList>
                            {opponent.batters.map((b) => (
                                <RosterRow key={b.id}>
                                    <RosterName>{b.player_name}</RosterName>
                                    <RosterMeta>{b.bats}HH</RosterMeta>
                                </RosterRow>
                            ))}
                        </RosterList>
                    )}
                    {opponent.batters.length > 0 && (
                        <PrimaryButton
                            style={{ marginTop: 16, width: '100%' }}
                            onClick={() => navigate(`/teams/${teamId}/scouting`)}
                        >
                            View Scouting Reports
                        </PrimaryButton>
                    )}
                </Section>
            </Content>
        </Container>
    );
};

export default OpponentDetail;
