import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { theme } from '../styles/theme';
import StrikeZone from '../components/live/StrikeZone';
import BatterHistory from '../components/live/BatterHistory';
import { Game, AtBat, Pitch, PitchType, PitchResult } from '../types';
import { gameService } from '../services/gameService';
import { pitchService } from '../services/pitchService';

const LiveGame: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [currentAtBat, setCurrentAtBat] = useState<AtBat | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);

  // Pitch form state
  const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
  const [pitchType, setPitchType] = useState<PitchType>('fastball');
  const [velocity, setVelocity] = useState<string>('');
  const [pitchResult, setPitchResult] = useState<PitchResult>('ball');

  // Temporary IDs for demo (in real app, you'd fetch these from game state)
  const [batterId] = useState('batter-id-1');
  const [pitcherId] = useState('pitcher-id-1');

  const loadGameData = useCallback(async () => {
    try {
      setLoading(true);
      const gameData = await gameService.getGameById(gameId!);
      setGame(gameData);
    } catch (error) {
      console.error('Failed to load game:', error);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId) {
      loadGameData();
    }
  }, [gameId, loadGameData]);

  const handleLocationSelect = (x: number, y: number) => {
    setPitchLocation({ x, y });
  };

  const handleLogPitch = async () => {
    if (!currentAtBat || !pitchLocation) {
      alert('Please select a pitch location');
      return;
    }

    try {
      const newPitch = await pitchService.logPitch({
        atBatId: currentAtBat.id,
        pitchNumber: pitches.length + 1,
        pitchType,
        velocity: velocity ? parseFloat(velocity) : undefined,
        locationX: pitchLocation.x,
        locationY: pitchLocation.y,
        result: pitchResult,
      });

      setPitches([...pitches, newPitch]);

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

      setCurrentAtBat({
        ...currentAtBat,
        balls: newBalls,
        strikes: newStrikes,
      });

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
    } catch (error) {
      console.error('Failed to log pitch:', error);
      alert('Failed to log pitch');
    }
  };

  const handleEndAtBat = async (result: string) => {
    if (!currentAtBat) return;

    try {
      await pitchService.endAtBat(currentAtBat.id, result);
      // Reset for next at-bat
      setCurrentAtBat(null);
      setPitches([]);
      alert(`At-bat ended: ${result}`);
    } catch (error) {
      console.error('Failed to end at-bat:', error);
    }
  };

  const handleStartAtBat = async () => {
    if (!gameId) return;

    try {
      const newAtBat = await pitchService.createAtBat({
        gameId,
        inningId: 'temp-inning-id', // In real app, get from current game state
        batterId,
        pitcherId,
        balls: 0,
        strikes: 0,
        outs: 0,
      });
      setCurrentAtBat(newAtBat);
      setPitches([]);
    } catch (error) {
      console.error('Failed to start at-bat:', error);
      alert('Failed to start at-bat');
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
            <Score>{game.homeScore || 0}</Score>
          </TeamInfo>
          <GameInfo>
            <Inning>Inning {game.currentInning || 1}</Inning>
            <InningHalf>{game.inningHalf || 'top'}</InningHalf>
          </GameInfo>
          <TeamInfo>
            <TeamName>Away Team</TeamName>
            <Score>{game.awayScore || 0}</Score>
          </TeamInfo>
        </GameHeader>

        {currentAtBat ? (
          <>
            <CountDisplay>
              <CountLabel>Count</CountLabel>
              <CountValue>
                {currentAtBat.balls}-{currentAtBat.strikes}
              </CountValue>
              <OutsDisplay>{currentAtBat.outs} Outs</OutsDisplay>
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
                <EndAtBatButton onClick={() => handleEndAtBat('in_play')}>
                  Record Play & End At-Bat
                </EndAtBatButton>
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

// Styled Components
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  min-height: 100vh;
  background-color: ${theme.colors.gray[100]};

  @media (min-width: ${theme.breakpoints.lg}) {
    grid-template-columns: 400px 1fr;
  }
`;

const LeftPanel = styled.div`
  background-color: white;
  border-right: 1px solid ${theme.colors.gray[200]};
  overflow-y: auto;
`;

const MainPanel = styled.div`
  padding: ${theme.spacing.xl};
  overflow-y: auto;
`;

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.xl};
  background: linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[800]} 100%);
  border-radius: ${theme.borderRadius.xl};
  margin-bottom: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.lg};
`;

const TeamInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const TeamName = styled.div`
  color: white;
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.semibold};
`;

const Score = styled.div`
  color: white;
  font-size: ${theme.fontSize['4xl']};
  font-weight: ${theme.fontWeight.bold};
`;

const GameInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const Inning = styled.div`
  color: white;
  font-size: ${theme.fontSize.xl};
  font-weight: ${theme.fontWeight.semibold};
`;

const InningHalf = styled.div`
  color: ${theme.colors.primary[100]};
  font-size: ${theme.fontSize.sm};
  text-transform: uppercase;
`;

const CountDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background-color: white;
  border-radius: ${theme.borderRadius.lg};
  margin-bottom: ${theme.spacing.lg};
  box-shadow: ${theme.shadows.md};
`;

const CountLabel = styled.span`
  font-size: ${theme.fontSize.base};
  color: ${theme.colors.gray[600]};
  font-weight: ${theme.fontWeight.medium};
`;

const CountValue = styled.span`
  font-size: ${theme.fontSize['3xl']};
  font-weight: ${theme.fontWeight.bold};
  color: ${theme.colors.primary[600]};
`;

const OutsDisplay = styled.span`
  font-size: ${theme.fontSize.base};
  color: ${theme.colors.gray[700]};
  font-weight: ${theme.fontWeight.medium};
`;

const PitchForm = styled.div`
  margin-top: ${theme.spacing.xl};
  padding: ${theme.spacing.xl};
  background-color: white;
  border-radius: ${theme.borderRadius.xl};
  box-shadow: ${theme.shadows.md};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const Label = styled.label`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.gray[700]};
`;

const Select = styled.select`
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${theme.colors.primary[100]};
  }
`;

const Input = styled.input`
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${theme.colors.primary[100]};
  }
`;

const ResultButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const ResultButton = styled.button<{ active: boolean; color: string }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${props => props.active ? props.color : theme.colors.gray[100]};
  color: ${props => props.active ? 'white' : theme.colors.gray[700]};
  border: 2px solid ${props => props.active ? props.color : theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${props => props.active ? props.color : theme.colors.gray[200]};
  }
`;

const LogButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.primary[600]};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.semibold};
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: ${theme.spacing.lg};

  &:hover:not(:disabled) {
    background-color: ${theme.colors.primary[700]};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EndAtBatButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.green[600]};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: ${theme.spacing.md};

  &:hover {
    background-color: ${theme.colors.green[700]};
  }
`;

const NoAtBatContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing['3xl']};
  background-color: white;
  border-radius: ${theme.borderRadius.xl};
  box-shadow: ${theme.shadows.md};
`;

const NoAtBatText = styled.p`
  font-size: ${theme.fontSize.xl};
  color: ${theme.colors.gray[600]};
  margin-bottom: ${theme.spacing.lg};
`;

const StartAtBatButton = styled.button`
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background-color: ${theme.colors.primary[600]};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.semibold};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${theme.colors.primary[700]};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: ${theme.fontSize.xl};
  color: ${theme.colors.gray[600]};
`;

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: ${theme.fontSize.xl};
  color: ${theme.colors.red[600]};
`;

export default LiveGame;
