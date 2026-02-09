import { BullpenIntensity, Player } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { bullpenService } from '../../services/bullpenService';
import {
    Container,
    Header,
    HeaderLeft,
    BackButton,
    Title,
    Content,
    Section,
    SectionTitle,
    PitcherGrid,
    PitcherButton,
    JerseyNumber,
    IntensityGroup,
    IntensityButton,
    IntensityLabel,
    StartButton,
    LoadingText,
    ErrorText,
} from './styles';

const BullpenNew: React.FC = () => {
    const navigate = useNavigate();
    const { team_id } = useParams<{ team_id: string }>();

    const [pitchers, setPitchers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPitcher, setSelectedPitcher] = useState<string | null>(null);
    const [intensity, setIntensity] = useState<BullpenIntensity | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const loadPitchers = async () => {
            if (!team_id) return;
            try {
                setLoading(true);
                const response = await api.get<{ pitchers: Player[] }>(`/players/pitchers/team/${team_id}`);
                setPitchers(response.data.pitchers || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load pitchers');
            } finally {
                setLoading(false);
            }
        };
        loadPitchers();
    }, [team_id]);

    const handleStart = async () => {
        if (!team_id || !selectedPitcher || !intensity) return;
        try {
            setCreating(true);
            const session = await bullpenService.createSession(team_id, selectedPitcher, intensity);
            navigate(`/teams/${team_id}/bullpen/${session.id}/live`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create session');
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading pitchers...</LoadingText>
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
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${team_id}/bullpen`)}>Back</BackButton>
                    <Title>New Bullpen Session</Title>
                </HeaderLeft>
            </Header>

            <Content>
                <Section>
                    <SectionTitle>Select Pitcher</SectionTitle>
                    <PitcherGrid>
                        {pitchers.map((p) => (
                            <PitcherButton key={p.id} selected={selectedPitcher === p.id} onClick={() => setSelectedPitcher(p.id)}>
                                <JerseyNumber>{p.jersey_number ?? '#'}</JerseyNumber>
                                <span>
                                    {p.first_name} {p.last_name}
                                </span>
                            </PitcherButton>
                        ))}
                    </PitcherGrid>
                    {pitchers.length === 0 && <p>No pitchers found. Add players to the team roster first.</p>}
                </Section>

                <Section>
                    <SectionTitle>Intensity</SectionTitle>
                    <IntensityGroup>
                        <IntensityButton intensity="low" selected={intensity === 'low'} onClick={() => setIntensity('low')}>
                            Low
                            <IntensityLabel>60-70%</IntensityLabel>
                        </IntensityButton>
                        <IntensityButton
                            intensity="medium"
                            selected={intensity === 'medium'}
                            onClick={() => setIntensity('medium')}
                        >
                            Medium
                            <IntensityLabel>75-85%</IntensityLabel>
                        </IntensityButton>
                        <IntensityButton intensity="high" selected={intensity === 'high'} onClick={() => setIntensity('high')}>
                            High
                            <IntensityLabel>90-100%</IntensityLabel>
                        </IntensityButton>
                    </IntensityGroup>
                </Section>

                <StartButton disabled={!selectedPitcher || !intensity || creating} onClick={handleStart}>
                    {creating ? 'Starting...' : 'Start Session'}
                </StartButton>
            </Content>
        </Container>
    );
};

export default BullpenNew;
