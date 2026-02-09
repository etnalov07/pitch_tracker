import {
    BullpenIntensity,
    BullpenPitch,
    BullpenPlanWithPitches,
    BullpenSessionWithDetails,
    Pitch,
    PitchResult,
    PitchType,
} from '@pitch-tracker/shared';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StrikeZone from '../../components/live/StrikeZone';
import { bullpenService } from '../../services/bullpenService';
import {
    Container,
    SessionHeader,
    HeaderLeft,
    BackButton,
    PitcherInfo,
    PitcherName,
    IntensityBadge,
    StatsRow,
    StatBox,
    StatValue,
    StatLabel,
    EndSessionButton,
    Content,
    StepIndicator,
    Step,
    StepNumber,
    StepLabel,
    StepConnector,
    PitchTypeSection,
    PitchTypeSectionTitle,
    PitchTypeGrid,
    PitchTypeButton,
    StrikeZoneRow,
    StrikeZoneContainer,
    PitchForm,
    FormGroup,
    Label,
    Input,
    LogButton,
    ModalOverlay,
    Modal,
    ModalTitle,
    NotesTextarea,
    ModalActions,
    ModalCancelButton,
    ModalConfirmButton,
    PlanGuidanceCard,
    PlanPitchNumber,
    PlanPitchType,
    PlanInstruction,
    PlanProgress,
    PlanCompleteCard,
    PitchLimitReached,
    LoadingText,
    ErrorText,
} from './styles';

const ALL_PITCH_TYPES: { value: PitchType; label: string }[] = [
    { value: 'fastball', label: 'Fastball' },
    { value: '4-seam', label: '4-Seam' },
    { value: '2-seam', label: '2-Seam' },
    { value: 'cutter', label: 'Cutter' },
    { value: 'sinker', label: 'Sinker' },
    { value: 'slider', label: 'Slider' },
    { value: 'curveball', label: 'Curve' },
    { value: 'changeup', label: 'Change' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'knuckleball', label: 'Knuckle' },
    { value: 'other', label: 'Other' },
];

const BullpenLive: React.FC = () => {
    const navigate = useNavigate();
    const { team_id, session_id } = useParams<{ team_id: string; session_id: string }>();

    const [session, setSession] = useState<BullpenSessionWithDetails | null>(null);
    const [pitches, setPitches] = useState<BullpenPitch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pitch form state
    const [pitchType, setPitchType] = useState<PitchType>('fastball');
    const [targetLocation, setTargetLocation] = useState<{ x: number; y: number } | null>(null);
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [velocity, setVelocity] = useState<string>('');
    const [logging, setLogging] = useState(false);

    // End session modal
    const [showEndModal, setShowEndModal] = useState(false);
    const [notes, setNotes] = useState('');
    const [ending, setEnding] = useState(false);

    // Plan guidance
    const [plan, setPlan] = useState<BullpenPlanWithPitches | null>(null);

    // Load session and pitches
    useEffect(() => {
        const loadData = async () => {
            if (!session_id) return;
            try {
                setLoading(true);
                const [sessionData, pitchesData] = await Promise.all([
                    bullpenService.getSession(session_id),
                    bullpenService.getSessionPitches(session_id),
                ]);
                setSession(sessionData);
                setPitches(pitchesData);

                // Load plan if session has one
                if (sessionData.plan_id) {
                    try {
                        const planData = await bullpenService.getPlan(sessionData.plan_id);
                        setPlan(planData);
                    } catch {
                        // Plan load failure is non-critical
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load session');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [session_id]);

    // Computed stats
    const stats = useMemo(() => {
        const total = pitches.length;
        const strikes = pitches.filter((p) => p.result && ['called_strike', 'swinging_strike', 'foul'].includes(p.result)).length;
        const balls = pitches.filter((p) => p.result === 'ball').length;
        const strikePct = total > 0 ? Math.round((strikes / total) * 100) : 0;
        return { total, strikes, balls, strikePct };
    }, [pitches]);

    // Plan guidance computations
    const planPitches = plan?.pitches || [];
    const hasSequencePlan = planPitches.length > 0;
    const maxPitches = plan?.max_pitches ?? (hasSequencePlan ? planPitches.length : null);
    const pitchLimitReached = maxPitches !== null && pitches.length >= maxPitches;
    const currentPlanPitch = hasSequencePlan && pitches.length < planPitches.length ? planPitches[pitches.length] : null;
    const planComplete = hasSequencePlan && pitches.length >= planPitches.length;

    // Auto-populate pitch type and target from plan when moving to next pitch
    useEffect(() => {
        if (currentPlanPitch) {
            setPitchType(currentPlanPitch.pitch_type);
            if (currentPlanPitch.target_x != null && currentPlanPitch.target_y != null) {
                setTargetLocation({ x: Number(currentPlanPitch.target_x), y: Number(currentPlanPitch.target_y) });
            } else {
                setTargetLocation(null);
            }
        }
    }, [currentPlanPitch]);

    // Map BullpenPitch[] → Pitch[] for StrikeZone component
    const mappedPitches: Pitch[] = useMemo(
        () =>
            pitches.map((bp) => ({
                id: bp.id,
                at_bat_id: '',
                game_id: '',
                pitcher_id: '',
                pitch_number: bp.pitch_number,
                pitch_type: bp.pitch_type,
                velocity: bp.velocity,
                location_x: bp.actual_x,
                location_y: bp.actual_y,
                target_location_x: bp.target_x,
                target_location_y: bp.target_y,
                balls_before: 0,
                strikes_before: 0,
                pitch_result: (bp.result as PitchResult) || ('called_strike' as PitchResult),
                created_at: bp.created_at,
            })),
        [pitches]
    );

    const handleLocationSelect = useCallback((x: number, y: number) => {
        setPitchLocation({ x, y });
    }, []);

    const handleTargetSelect = useCallback((x: number, y: number) => {
        setTargetLocation({ x, y });
    }, []);

    const handleTargetClear = useCallback(() => {
        setTargetLocation(null);
    }, []);

    const handleLogPitch = async () => {
        if (!session_id || !pitchLocation) return;
        try {
            setLogging(true);
            const newPitch = await bullpenService.logPitch({
                session_id,
                pitch_type: pitchType,
                actual_x: pitchLocation.x,
                actual_y: pitchLocation.y,
                target_x: targetLocation?.x,
                target_y: targetLocation?.y,
                velocity: velocity ? Number(velocity) : undefined,
            });
            setPitches((prev) => [...prev, newPitch]);
            // Reset form for next pitch
            setPitchLocation(null);
            setVelocity('');
            // Plan auto-populate is handled by the useEffect on currentPlanPitch
            if (!hasSequencePlan) {
                setTargetLocation(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to log pitch');
        } finally {
            setLogging(false);
        }
    };

    const handleEndSession = async () => {
        if (!session_id) return;
        try {
            setEnding(true);
            await bullpenService.endSession(session_id, notes || undefined);
            navigate(`/teams/${team_id}/bullpen`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to end session');
            setEnding(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading session...</LoadingText>
            </Container>
        );
    }

    if (error || !session) {
        return (
            <Container>
                <ErrorText>{error || 'Session not found'}</ErrorText>
            </Container>
        );
    }

    return (
        <Container>
            <SessionHeader>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${team_id}/bullpen`)}>Back</BackButton>
                    <PitcherInfo>
                        <PitcherName>
                            {session.pitcher_first_name} {session.pitcher_last_name}
                            {session.pitcher_jersey_number != null && ` #${session.pitcher_jersey_number}`}
                        </PitcherName>
                        <IntensityBadge intensity={session.intensity as BullpenIntensity}>{session.intensity}</IntensityBadge>
                    </PitcherInfo>
                </HeaderLeft>

                <StatsRow>
                    <StatBox>
                        <StatValue>{maxPitches !== null ? `${stats.total}/${maxPitches}` : stats.total}</StatValue>
                        <StatLabel>Pitches</StatLabel>
                    </StatBox>
                    <StatBox>
                        <StatValue>
                            {stats.balls}/{stats.strikes}
                        </StatValue>
                        <StatLabel>B/S</StatLabel>
                    </StatBox>
                    <StatBox>
                        <StatValue>{stats.strikePct}%</StatValue>
                        <StatLabel>Strike %</StatLabel>
                    </StatBox>
                    <EndSessionButton onClick={() => setShowEndModal(true)}>End Session</EndSessionButton>
                </StatsRow>
            </SessionHeader>

            <Content>
                <StepIndicator>
                    <Step completed={!!pitchType} active={!pitchType}>
                        <StepNumber completed={!!pitchType} active={!pitchType}>
                            {pitchType ? '\u2713' : '1'}
                        </StepNumber>
                        <StepLabel active={!pitchType}>Type</StepLabel>
                    </Step>
                    <StepConnector completed={!!pitchType} />
                    <Step completed={!!targetLocation} active={!!pitchType && !targetLocation && !pitchLocation}>
                        <StepNumber completed={!!targetLocation} active={!!pitchType && !targetLocation && !pitchLocation}>
                            {targetLocation ? '\u2713' : '2'}
                        </StepNumber>
                        <StepLabel active={!!pitchType && !targetLocation && !pitchLocation}>Target</StepLabel>
                    </Step>
                    <StepConnector completed={!!targetLocation || !!pitchLocation} />
                    <Step completed={!!pitchLocation} active={!!pitchType && !pitchLocation}>
                        <StepNumber completed={!!pitchLocation} active={!!pitchType && !pitchLocation}>
                            {pitchLocation ? '\u2713' : '3'}
                        </StepNumber>
                        <StepLabel active={!!pitchType && !pitchLocation}>Location</StepLabel>
                    </Step>
                </StepIndicator>

                {pitchLimitReached && (
                    <PitchLimitReached>
                        Pitch limit reached ({maxPitches} pitches). End session or continue freestyle.
                    </PitchLimitReached>
                )}

                {plan && !pitchLimitReached && currentPlanPitch && (
                    <PlanGuidanceCard>
                        <PlanPitchNumber>
                            Pitch #{pitches.length + 1}
                            {maxPitches !== null ? ` of ${maxPitches}` : ''}
                        </PlanPitchNumber>
                        <PlanPitchType>
                            {ALL_PITCH_TYPES.find((t) => t.value === currentPlanPitch.pitch_type)?.label ||
                                currentPlanPitch.pitch_type}
                        </PlanPitchType>
                        {currentPlanPitch.instruction && <PlanInstruction>{currentPlanPitch.instruction}</PlanInstruction>}
                        <PlanProgress>
                            {pitches.length}/{planPitches.length} complete
                        </PlanProgress>
                    </PlanGuidanceCard>
                )}

                {plan && !pitchLimitReached && planComplete && (
                    <PlanCompleteCard>Plan complete! Continue throwing freestyle or end session.</PlanCompleteCard>
                )}

                {plan && !hasSequencePlan && !pitchLimitReached && maxPitches !== null && (
                    <PlanGuidanceCard>
                        <PlanProgress>
                            {pitches.length}/{maxPitches} pitches
                        </PlanProgress>
                    </PlanGuidanceCard>
                )}

                <PitchTypeSection>
                    <PitchTypeSectionTitle>Step 1: Select Pitch Type</PitchTypeSectionTitle>
                    <PitchTypeGrid>
                        {ALL_PITCH_TYPES.map(({ value, label }) => (
                            <PitchTypeButton key={value} active={pitchType === value} onClick={() => setPitchType(value)}>
                                {label}
                            </PitchTypeButton>
                        ))}
                    </PitchTypeGrid>
                </PitchTypeSection>

                <StrikeZoneRow>
                    <StrikeZoneContainer>
                        <StrikeZone
                            onLocationSelect={handleLocationSelect}
                            onTargetSelect={handleTargetSelect}
                            onTargetClear={handleTargetClear}
                            targetLocation={targetLocation}
                            previousPitches={mappedPitches}
                        />
                    </StrikeZoneContainer>

                    <PitchForm>
                        <FormGroup>
                            <Label>Velocity (mph) - Optional</Label>
                            <Input
                                type="number"
                                value={velocity}
                                onChange={(e) => setVelocity(e.target.value)}
                                placeholder="85"
                                min="0"
                                max="120"
                            />
                        </FormGroup>

                        <LogButton onClick={handleLogPitch} disabled={!pitchLocation || logging || pitchLimitReached}>
                            {logging ? 'Logging...' : pitchLimitReached ? 'Limit Reached' : 'Log Pitch'}
                        </LogButton>
                    </PitchForm>
                </StrikeZoneRow>
            </Content>

            {showEndModal && (
                <ModalOverlay onClick={() => setShowEndModal(false)}>
                    <Modal onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>End Bullpen Session</ModalTitle>
                        <FormGroup>
                            <Label>Notes (optional)</Label>
                            <NotesTextarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Session notes..."
                            />
                        </FormGroup>
                        <ModalActions>
                            <ModalCancelButton onClick={() => setShowEndModal(false)}>Cancel</ModalCancelButton>
                            <ModalConfirmButton onClick={handleEndSession} disabled={ending}>
                                {ending ? 'Ending...' : 'End Session'}
                            </ModalConfirmButton>
                        </ModalActions>
                    </Modal>
                </ModalOverlay>
            )}
        </Container>
    );
};

export default BullpenLive;
