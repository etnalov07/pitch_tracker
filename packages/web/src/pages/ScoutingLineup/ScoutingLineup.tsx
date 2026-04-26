import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { opposingPitcherService } from '../../services/opposingPitcherService';
import { gamesApi } from '../../state/games/api/gamesApi';
import { Game } from '../../types';
import { buildLineupPayload, buildPitcherPayload, LineupEntry, POSITIONS, emptyLineup } from '../../utils/scoutingLineup';
import {
    BattingOrderCell,
    BackButton,
    Container,
    Content,
    FormActions,
    FormCard,
    FormGroup,
    HandednessOption,
    HandednessToggle,
    Header,
    HeaderLeft,
    HelpText,
    Input,
    Label,
    LineupTable,
    NextButton,
    PitcherRow,
    PitcherSection,
    PositionSelect,
    SaveButton,
    SavedBadge,
    SectionTitle,
    SkipButton,
    SubTitle,
    TabButton,
    TabRow,
    Td,
    Th,
    Title,
} from './styles';

type ActiveTab = 'away' | 'home';

const ScoutingLineup: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('away');

    const [awayLineup, setAwayLineup] = useState<LineupEntry[]>(emptyLineup(9));
    const [awayPitcher, setAwayPitcher] = useState('');
    const [awayPitcherJersey, setAwayPitcherJersey] = useState('');
    const [awayPitcherThrows, setAwayPitcherThrows] = useState<'R' | 'L'>('R');
    const [awaySaved, setAwaySaved] = useState(false);
    const [awayPitcherId, setAwayPitcherId] = useState<string | null>(null);
    const [awaySubmitting, setAwaySubmitting] = useState(false);

    const [homeLineup, setHomeLineup] = useState<LineupEntry[]>(emptyLineup(9));
    const [homePitcher, setHomePitcher] = useState('');
    const [homePitcherJersey, setHomePitcherJersey] = useState('');
    const [homePitcherThrows, setHomePitcherThrows] = useState<'R' | 'L'>('R');
    const [homeSaved, setHomeSaved] = useState(false);
    const [homePitcherId, setHomePitcherId] = useState<string | null>(null);
    const [homeSubmitting, setHomeSubmitting] = useState(false);

    const [error, setError] = useState('');

    useEffect(() => {
        if (!gameId) return;
        gamesApi
            .getGameById(gameId)
            .then((g) => {
                setGame(g);
                const size = g.lineup_size ?? 9;
                setAwayLineup(emptyLineup(size));
                setHomeLineup(emptyLineup(size));
            })
            .catch(() => setError('Failed to load game'))
            .finally(() => setLoading(false));
    }, [gameId]);

    const handleLineupChange = (side: ActiveTab, index: number, field: keyof LineupEntry, value: string) => {
        const setter = side === 'away' ? setAwayLineup : setHomeLineup;
        setter((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
        setError('');
    };

    const handleSave = async (side: ActiveTab) => {
        if (!gameId || !game) return;
        const lineup = side === 'away' ? awayLineup : homeLineup;
        const pitcherName = side === 'away' ? awayPitcher : homePitcher;
        const pitcherJersey = side === 'away' ? awayPitcherJersey : homePitcherJersey;
        const pitcherThrows = side === 'away' ? awayPitcherThrows : homePitcherThrows;
        const teamName = side === 'away' ? (game.opponent_name ?? 'Away') : (game.scouting_home_team ?? 'Home');

        const players = buildLineupPayload(lineup, side);

        if (players.length === 0 && !pitcherName.trim()) {
            setError('Enter at least one player or pitcher name');
            return;
        }

        const setSubmitting = side === 'away' ? setAwaySubmitting : setHomeSubmitting;
        const setSaved = side === 'away' ? setAwaySaved : setHomeSaved;
        const existingPitcherId = side === 'away' ? awayPitcherId : homePitcherId;
        const setPitcherId = side === 'away' ? setAwayPitcherId : setHomePitcherId;

        setSubmitting(true);
        setError('');
        try {
            if (players.length > 0) {
                await gamesApi.createOpponentLineupBulk(gameId, players);
            }

            const pitcherPayload = buildPitcherPayload(
                gameId,
                pitcherName,
                pitcherJersey ? parseInt(pitcherJersey, 10) : null,
                pitcherThrows,
                teamName,
                side
            );
            if (pitcherPayload) {
                if (existingPitcherId) {
                    await opposingPitcherService.update(existingPitcherId, pitcherPayload);
                } else {
                    const pitcher = await opposingPitcherService.create(pitcherPayload);
                    setPitcherId(pitcher.id);
                }
            }

            setSaved(true);
            if (side === 'away' && !homeSaved) {
                setActiveTab('home');
            }
        } catch {
            setError(`Failed to save ${side} lineup`);
        } finally {
            setSubmitting(false);
        }
    };

    const goToGame = () => navigate(`/game/${gameId}`);

    if (loading) {
        return (
            <Container>
                <Header>
                    <HeaderLeft>
                        <Title>Scouting Lineup Setup</Title>
                    </HeaderLeft>
                </Header>
            </Container>
        );
    }

    const awayName = game?.opponent_name ?? 'Away';
    const homeName = game?.scouting_home_team ?? 'Home';

    const renderLineupForm = (side: ActiveTab) => {
        const lineup = side === 'away' ? awayLineup : homeLineup;
        const pitcher = side === 'away' ? awayPitcher : homePitcher;
        const pitcherJersey = side === 'away' ? awayPitcherJersey : homePitcherJersey;
        const pitcherThrows = side === 'away' ? awayPitcherThrows : homePitcherThrows;
        const saved = side === 'away' ? awaySaved : homeSaved;
        const submitting = side === 'away' ? awaySubmitting : homeSubmitting;
        const teamName = side === 'away' ? awayName : homeName;

        return (
            <FormCard>
                <HelpText>Enter the {teamName} starting lineup. Leave rows blank for players you don&apos;t know yet.</HelpText>

                <PitcherSection>
                    <SectionTitle>Starting Pitcher</SectionTitle>
                    <PitcherRow>
                        <FormGroup style={{ flex: 2 }}>
                            <Label>Pitcher Name</Label>
                            <Input
                                type="text"
                                value={pitcher}
                                onChange={(e) =>
                                    side === 'away' ? setAwayPitcher(e.target.value) : setHomePitcher(e.target.value)
                                }
                                placeholder="Pitcher name..."
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>Jersey #</Label>
                            <Input
                                type="number"
                                value={pitcherJersey}
                                onChange={(e) =>
                                    side === 'away' ? setAwayPitcherJersey(e.target.value) : setHomePitcherJersey(e.target.value)
                                }
                                placeholder="00"
                                style={{ width: '72px' }}
                                min={0}
                                max={99}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>Throws</Label>
                            <HandednessToggle>
                                {(['R', 'L'] as const).map((hand) => (
                                    <HandednessOption
                                        key={hand}
                                        type="button"
                                        active={pitcherThrows === hand}
                                        onClick={() => (side === 'away' ? setAwayPitcherThrows(hand) : setHomePitcherThrows(hand))}
                                    >
                                        {hand}
                                    </HandednessOption>
                                ))}
                            </HandednessToggle>
                        </FormGroup>
                    </PitcherRow>
                </PitcherSection>

                <SectionTitle>Batting Order</SectionTitle>
                <LineupTable>
                    <thead>
                        <tr>
                            <Th style={{ width: '40px' }}>#</Th>
                            <Th>Name</Th>
                            <Th style={{ width: '80px' }}>Pos</Th>
                            <Th style={{ width: '100px' }}>Bats</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineup.map((entry, index) => (
                            <tr key={index} data-testid={`batting-order-${entry.batting_order}`}>
                                <BattingOrderCell>{entry.batting_order}</BattingOrderCell>
                                <Td>
                                    <Input
                                        type="text"
                                        value={entry.player_name}
                                        onChange={(e) => handleLineupChange(side, index, 'player_name', e.target.value)}
                                        placeholder={`Batter ${entry.batting_order}`}
                                        style={{ width: '100%' }}
                                    />
                                </Td>
                                <Td>
                                    <PositionSelect
                                        value={entry.position}
                                        onChange={(e) => handleLineupChange(side, index, 'position', e.target.value)}
                                    >
                                        <option value="">—</option>
                                        {POSITIONS.map((pos) => (
                                            <option key={pos} value={pos}>
                                                {pos}
                                            </option>
                                        ))}
                                    </PositionSelect>
                                </Td>
                                <Td>
                                    <HandednessToggle>
                                        {(['R', 'L', 'S'] as const).map((hand) => (
                                            <HandednessOption
                                                key={hand}
                                                type="button"
                                                active={entry.bats === hand}
                                                onClick={() => handleLineupChange(side, index, 'bats', hand)}
                                            >
                                                {hand}
                                            </HandednessOption>
                                        ))}
                                    </HandednessToggle>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </LineupTable>

                {error && <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '8px' }}>{error}</p>}

                <FormActions>
                    {saved && <SavedBadge>✓ Saved</SavedBadge>}
                    {side === 'away' && !awaySaved && (
                        <SaveButton type="button" disabled={submitting} onClick={() => handleSave('away')}>
                            {submitting ? 'Saving...' : `Save Away Lineup → Home`}
                        </SaveButton>
                    )}
                    {side === 'away' && awaySaved && (
                        <SaveButton type="button" disabled={submitting} onClick={() => handleSave('away')}>
                            {submitting ? 'Saving...' : 'Update Away Lineup'}
                        </SaveButton>
                    )}
                    {side === 'home' && (
                        <NextButton type="button" disabled={submitting} onClick={() => handleSave('home')}>
                            {submitting ? 'Saving...' : homeSaved ? 'Update Home Lineup' : 'Save & Start Game'}
                        </NextButton>
                    )}
                    {side === 'home' && homeSaved && (
                        <NextButton type="button" onClick={goToGame}>
                            Go to Game →
                        </NextButton>
                    )}
                </FormActions>
            </FormCard>
        );
    };

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(-1)}>Back</BackButton>
                    <Title>
                        Scouting Lineup Setup
                        <SubTitle>
                            {awayName} @ {homeName}
                        </SubTitle>
                    </Title>
                </HeaderLeft>
                <SkipButton type="button" onClick={goToGame}>
                    Skip Setup → Go to Game
                </SkipButton>
            </Header>

            <Content>
                <TabRow>
                    <TabButton
                        type="button"
                        active={activeTab === 'away'}
                        data-active={activeTab === 'away'}
                        onClick={() => setActiveTab('away')}
                    >
                        Away: {awayName} {awaySaved && '✓'}
                    </TabButton>
                    <TabButton
                        type="button"
                        active={activeTab === 'home'}
                        data-active={activeTab === 'home'}
                        onClick={() => setActiveTab('home')}
                    >
                        Home: {homeName} {homeSaved && '✓'}
                    </TabButton>
                </TabRow>

                {activeTab === 'away' && renderLineupForm('away')}
                {activeTab === 'home' && renderLineupForm('home')}
            </Content>
        </Container>
    );
};

export default ScoutingLineup;
