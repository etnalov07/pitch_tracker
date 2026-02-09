import { BullpenIntensity, BullpenPlan, BullpenPlanWithPitches, Player } from '@pitch-tracker/shared';
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

    // Plan selection
    const [teamPlans, setTeamPlans] = useState<BullpenPlan[]>([]);
    const [pitcherPlans, setPitcherPlans] = useState<BullpenPlanWithPitches[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!team_id) return;
            try {
                setLoading(true);
                const [pitchersRes, plansRes] = await Promise.all([
                    api.get<{ pitchers: Player[] }>(`/players/pitchers/team/${team_id}`),
                    bullpenService.getTeamPlans(team_id),
                ]);
                setPitchers(pitchersRes.data.pitchers || []);
                setTeamPlans(plansRes);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load pitchers');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [team_id]);

    // When pitcher is selected, fetch their assignments
    useEffect(() => {
        if (!selectedPitcher) {
            setPitcherPlans([]);
            return;
        }
        const loadAssignments = async () => {
            try {
                const plans = await bullpenService.getPitcherAssignments(selectedPitcher);
                setPitcherPlans(plans);
                // Auto-select the first assigned plan
                if (plans.length > 0) {
                    setSelectedPlanId(plans[0].id);
                } else {
                    setSelectedPlanId(null);
                }
            } catch {
                // Non-critical — plan selection is optional
            }
        };
        loadAssignments();
    }, [selectedPitcher]);

    const handleStart = async () => {
        if (!team_id || !selectedPitcher || !intensity) return;
        try {
            setCreating(true);
            const session = await bullpenService.createSession(
                team_id,
                selectedPitcher,
                intensity,
                undefined,
                selectedPlanId || undefined
            );
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

                {selectedPitcher && (teamPlans.length > 0 || pitcherPlans.length > 0) && (
                    <Section>
                        <SectionTitle>
                            Bullpen Plan (Optional)
                            {pitcherPlans.length > 0 && (
                                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '8px' }}>
                                    {pitcherPlans.length} assigned
                                </span>
                            )}
                        </SectionTitle>
                        <PitcherGrid>
                            <PitcherButton selected={selectedPlanId === null} onClick={() => setSelectedPlanId(null)}>
                                <span>No Plan (Freestyle)</span>
                            </PitcherButton>
                            {pitcherPlans.map((plan) => (
                                <PitcherButton
                                    key={plan.id}
                                    selected={selectedPlanId === plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                >
                                    <span>
                                        {plan.name}
                                        {plan.max_pitches
                                            ? ` (${plan.max_pitches}p)`
                                            : plan.pitches.length > 0
                                              ? ` (${plan.pitches.length}p)`
                                              : ''}
                                    </span>
                                </PitcherButton>
                            ))}
                            {teamPlans
                                .filter((tp) => !pitcherPlans.some((pp) => pp.id === tp.id))
                                .map((plan) => (
                                    <PitcherButton
                                        key={plan.id}
                                        selected={selectedPlanId === plan.id}
                                        onClick={() => setSelectedPlanId(plan.id)}
                                    >
                                        <span>
                                            {plan.name}
                                            {plan.max_pitches ? ` (${plan.max_pitches}p)` : ''}
                                        </span>
                                    </PitcherButton>
                                ))}
                        </PitcherGrid>
                    </Section>
                )}

                <StartButton disabled={!selectedPitcher || !intensity || creating} onClick={handleStart}>
                    {creating ? 'Starting...' : 'Start Session'}
                </StartButton>
            </Content>
        </Container>
    );
};

export default BullpenNew;
