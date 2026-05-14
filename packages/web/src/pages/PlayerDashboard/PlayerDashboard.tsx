import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playerService, type MyPlayerRecord } from '../../services/playerService';
import { logout, useAppDispatch, useAppSelector } from '../../state';
import {
    Container,
    Header,
    HeaderLeft,
    HeaderRight,
    TeamName,
    SubLine,
    TeamSwitcher,
    LogoutButton,
    MainContent,
    Section,
    SectionTitle,
    StatsPlaceholder,
    EmptyState,
    EmptyTitle,
    EmptyText,
} from './styles';

const PlayerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);

    const [records, setRecords] = useState<MyPlayerRecord[] | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        playerService
            .getMyPlayers()
            .then((rows) => {
                if (!cancelled) setRecords(rows);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : 'Failed to load your teams';
                setError(msg);
                setRecords([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    if (records === null) {
        return (
            <Container>
                <Header>
                    <HeaderLeft>
                        <TeamName>Loading…</TeamName>
                    </HeaderLeft>
                </Header>
            </Container>
        );
    }

    // No team membership yet — redirect to onboarding screen
    if (records.length === 0) {
        return (
            <Container>
                <Header>
                    <HeaderLeft>
                        <TeamName>Hi {user?.first_name || 'there'}</TeamName>
                    </HeaderLeft>
                    <HeaderRight>
                        <LogoutButton onClick={handleLogout}>Sign Out</LogoutButton>
                    </HeaderRight>
                </Header>
                <MainContent>
                    <EmptyState>
                        <EmptyTitle>Waiting for your coach</EmptyTitle>
                        <EmptyText>
                            {error || 'No team yet. Ask your coach to add you, or paste your invite link below to get connected.'}
                        </EmptyText>
                        <p style={{ marginTop: 16 }}>
                            <button onClick={() => navigate('/onboarding/player')}>Paste invite link</button>
                        </p>
                    </EmptyState>
                </MainContent>
            </Container>
        );
    }

    const active = records[Math.min(activeIdx, records.length - 1)];

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <TeamName>{active.team_name || 'My Team'}</TeamName>
                    <SubLine>
                        {user?.first_name} {user?.last_name}
                        {active.jersey_number !== undefined && active.jersey_number !== null ? ` · #${active.jersey_number}` : ''}
                        {active.primary_position ? ` · ${active.primary_position}` : ''}
                    </SubLine>
                </HeaderLeft>
                <HeaderRight>
                    {records.length > 1 && (
                        <TeamSwitcher value={activeIdx} onChange={(e) => setActiveIdx(parseInt(e.target.value, 10))}>
                            {records.map((r, i) => (
                                <option key={r.id} value={i}>
                                    {r.team_name || 'Team'}
                                </option>
                            ))}
                        </TeamSwitcher>
                    )}
                    <LogoutButton onClick={handleLogout}>Sign Out</LogoutButton>
                </HeaderRight>
            </Header>
            <MainContent>
                <Section>
                    <SectionTitle>My Stats</SectionTitle>
                    <StatsPlaceholder>
                        Per-player stats view is coming in the next slice. For now your coach can pull up your pitcher / batter
                        profile from the team page.
                    </StatsPlaceholder>
                </Section>
                <Section>
                    <SectionTitle>Recent Games</SectionTitle>
                    <StatsPlaceholder>Recent-games scoreboard ships with the stats endpoint follow-up.</StatsPlaceholder>
                </Section>
            </MainContent>
        </Container>
    );
};

export default PlayerDashboard;
