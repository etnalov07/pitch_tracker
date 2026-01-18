import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { theme } from '../../styles/theme';
import StrikeZone from '../../components/live/StrikeZone';
import BatterHistory from '../../components/live/BatterHistory';
import { PitchType, PitchResult } from '../../types';
import {
    useAppDispatch,
    useAppSelector,
    fetchGameById,
    logPitch,
    createAtBat,
    updateAtBat,
    setCurrentAtBat,
    clearPitches,
} from '../../state';
import {
    Container,
    LeftPanel,
    MainPanel,
    GameHeader,
    TeamInfo,
    TeamName,
    Score,
    GameInfo,
    Inning,
    InningHalf,
    CountDisplay,
    CountLabel,
    CountValue,
    OutsDisplay,
    PitchForm,
    FormRow,
    FormGroup,
    Label,
    Select,
    Input,
    ResultButtons,
    ResultButton,
    LogButton,
    EndAtBatButton,
    NoAtBatContainer,
    NoAtBatText,
    StartAtBatButton,
    LoadingContainer,
    ErrorContainer,
} from './styles';

const LiveGame: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const dispatch = useAppDispatch();

    const { selectedGame: game, currentAtBat, pitches, loading } = useAppSelector((state) => state.games);

    // Pitch form state
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [pitchType, setPitchType] = useState<PitchType>('fastball');
    const [velocity, setVelocity] = useState<string>('');
    const [pitchResult, setPitchResult] = useState<PitchResult>('ball');

    // Temporary IDs for demo (in real app, you'd fetch these from game state)
    const [batterId] = useState('batter-id-1');
    const [pitcherId] = useState('pitcher-id-1');

    useEffect(() => {
        if (gameId) {
            dispatch(fetchGameById(gameId));
        }
    }, [dispatch, gameId]);

    const handleLocationSelect = (x: number, y: number) => {
        setPitchLocation({ x, y });
    };

    const handleLogPitch = async () => {
        if (!currentAtBat || !pitchLocation) {
            alert('Please select a pitch location');
            return;
        }

        try {
            await dispatch(
                logPitch({
                    at_bat_id: currentAtBat.id,
                    pitch_number: pitches.length + 1,
                    pitch_type: pitchType,
                    velocity: velocity ? parseFloat(velocity) : undefined,
                    location_x: pitchLocation.x,
                    location_y: pitchLocation.y,
                    pitch_result: pitchResult,
                })
            ).unwrap();

            // Update count
            let newBalls = currentAtBat.balls;
            let newStrikes = currentAtBat.strikes;

            if (pitchResult === 'ball') {
                newBalls++;
            } else if (pitchResult === 'called_strike' || pitchResult === 'swinging_strike') {
                newStrikes++;
            } else if (pitchResult === 'foul' && newStrikes < 2) {
                newStrikes++;
            }

            dispatch(
                setCurrentAtBat({
                    ...currentAtBat,
                    balls: newBalls,
                    strikes: newStrikes,
                })
            );

            // Reset form
            setPitchLocation(null);
            setVelocity('');

            // Check for end of at-bat
            if (newBalls >= 4) {
                handleEndAtBat('walk');
            } else if (newStrikes >= 3) {
                handleEndAtBat('strikeout');
            } else if (pitchResult === 'in_play') {
                // Coach will record play details separately
            }
        } catch (error: any) {
            console.error('Failed to log pitch:', error);
            alert(error || 'Failed to log pitch');
        }
    };

    const handleEndAtBat = async (result: string) => {
        if (!currentAtBat) return;

        try {
            await dispatch(
                updateAtBat({
                    id: currentAtBat.id,
                    data: { result },
                })
            ).unwrap();
            // Reset for next at-bat
            dispatch(setCurrentAtBat(null));
            dispatch(clearPitches());
            alert(`At-bat ended: ${result}`);
        } catch (error: any) {
            console.error('Failed to end at-bat:', error);
            alert(error || 'Failed to end at-bat');
        }
    };

    const handleStartAtBat = async () => {
        if (!gameId) return;

        try {
            await dispatch(
                createAtBat({
                    game_id: gameId,
                    inning_id: 'temp-inning-id', // In real app, get from current game state
                    batter_id: batterId,
                    pitcher_id: pitcherId,
                    balls: 0,
                    strikes: 0,
                    outs_before: 0,
                })
            ).unwrap();
        } catch (error: any) {
            console.error('Failed to start at-bat:', error);
            alert(error || 'Failed to start at-bat');
        }
    };

    if (loading) {
        return <LoadingContainer>Loading game...</LoadingContainer>;
    }

    if (!game) {
        return <ErrorContainer>Game not found</ErrorContainer>;
    }

    return (
        <Container>
            {/* Left Panel - Batter History */}
            <LeftPanel>
                <BatterHistory batterId={batterId} pitcherId={pitcherId} />
            </LeftPanel>

            {/* Main Panel - Strike Zone & Pitch Entry */}
            <MainPanel>
                <GameHeader>
                    <TeamInfo>
                        <TeamName>Home Team</TeamName>
                        <Score>{game.home_score || 0}</Score>
                    </TeamInfo>
                    <GameInfo>
                        <Inning>Inning {game.current_inning || 1}</Inning>
                        <InningHalf>{game.inning_half || 'top'}</InningHalf>
                    </GameInfo>
                    <TeamInfo>
                        <TeamName>Away Team</TeamName>
                        <Score>{game.away_score || 0}</Score>
                    </TeamInfo>
                </GameHeader>

                {currentAtBat ? (
                    <>
                        <CountDisplay>
                            <CountLabel>Count</CountLabel>
                            <CountValue>
                                {currentAtBat.balls}-{currentAtBat.strikes}
                            </CountValue>
                            <OutsDisplay>{currentAtBat.outs_before} Outs</OutsDisplay>
                        </CountDisplay>

                        <StrikeZone onLocationSelect={handleLocationSelect} previousPitches={pitches} />

                        <PitchForm>
                            <FormRow>
                                <FormGroup>
                                    <Label>Pitch Type</Label>
                                    <Select value={pitchType} onChange={(e) => setPitchType(e.target.value as PitchType)}>
                                        <option value="fastball">Fastball</option>
                                        <option value="2-seam">2-Seam</option>
                                        <option value="4-seam">4-Seam</option>
                                        <option value="cutter">Cutter</option>
                                        <option value="sinker">Sinker</option>
                                        <option value="slider">Slider</option>
                                        <option value="curveball">Curveball</option>
                                        <option value="changeup">Changeup</option>
                                        <option value="splitter">Splitter</option>
                                        <option value="other">Other</option>
                                    </Select>
                                </FormGroup>

                                <FormGroup>
                                    <Label>Velocity (mph)</Label>
                                    <Input
                                        type="number"
                                        value={velocity}
                                        onChange={(e) => setVelocity(e.target.value)}
                                        placeholder="85"
                                        min="0"
                                        max="120"
                                    />
                                </FormGroup>
                            </FormRow>

                            <FormGroup>
                                <Label>Result</Label>
                                <ResultButtons>
                                    <ResultButton
                                        active={pitchResult === 'ball'}
                                        onClick={() => setPitchResult('ball')}
                                        color={theme.colors.gray[400]}
                                    >
                                        Ball
                                    </ResultButton>
                                    <ResultButton
                                        active={pitchResult === 'called_strike'}
                                        onClick={() => setPitchResult('called_strike')}
                                        color={theme.colors.green[500]}
                                    >
                                        Called Strike
                                    </ResultButton>
                                    <ResultButton
                                        active={pitchResult === 'swinging_strike'}
                                        onClick={() => setPitchResult('swinging_strike')}
                                        color={theme.colors.red[500]}
                                    >
                                        Swinging Strike
                                    </ResultButton>
                                    <ResultButton
                                        active={pitchResult === 'foul'}
                                        onClick={() => setPitchResult('foul')}
                                        color={theme.colors.yellow[500]}
                                    >
                                        Foul
                                    </ResultButton>
                                    <ResultButton
                                        active={pitchResult === 'in_play'}
                                        onClick={() => setPitchResult('in_play')}
                                        color={theme.colors.primary[600]}
                                    >
                                        In Play
                                    </ResultButton>
                                </ResultButtons>
                            </FormGroup>

                            <LogButton onClick={handleLogPitch} disabled={!pitchLocation}>
                                Log Pitch
                            </LogButton>

                            {pitchResult === 'in_play' && (
                                <EndAtBatButton onClick={() => handleEndAtBat('in_play')}>Record Play & End At-Bat</EndAtBatButton>
                            )}
                        </PitchForm>
                    </>
                ) : (
                    <NoAtBatContainer>
                        <NoAtBatText>No active at-bat</NoAtBatText>
                        <StartAtBatButton onClick={handleStartAtBat}>Start New At-Bat</StartAtBatButton>
                    </NoAtBatContainer>
                )}
            </MainPanel>
        </Container>
    );
};

export default LiveGame;
