import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { opposingPitcherService } from '../../services/opposingPitcherService';
import { gamesApi } from '../../state/games/api/gamesApi';
import { Game, OpponentLineupPlayer, OpponentRosterPlayer } from '../../types';
import {
    Container,
    Header,
    HeaderLeft,
    BackButton,
    Title,
    SubTitle,
    Content,
    FormCard,
    SectionTitle,
    LineupTable,
    Th,
    Td,
    BattingOrderCell,
    Input,
    HandednessSelect,
    PositionSelect,
    FormActions,
    CancelButton,
    SubmitButton,
    SkipButton,
    ErrorMessage,
    LoadingText,
    GameInfo,
    GameInfoText,
    GameInfoSubtext,
    HelpText,
    PrefillBar,
    PrefillButton,
} from './styles';

interface LineupEntry {
    player_name: string;
    batting_order: number;
    position: string;
    bats: 'R' | 'L' | 'S';
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'PH'];

const OpponentLineup: React.FC = () => {
    const navigate = useNavigate();
    const { gameId } = useParams<{ gameId: string }>();

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [startingPitcherName, setStartingPitcherName] = useState('');
    const [knownPlayers, setKnownPlayers] = useState<OpponentRosterPlayer[]>([]);
    const [lastLineup, setLastLineup] = useState<OpponentLineupPlayer[]>([]);
    const [prefillNote, setPrefillNote] = useState('');

    const [lineup, setLineup] = useState<LineupEntry[]>(
        Array.from({ length: 9 }, (_, i) => ({
            player_name: '',
            batting_order: i + 1,
            position: '',
            bats: 'R' as const,
        }))
    );

    useEffect(() => {
        const fetchGame = async () => {
            if (!gameId) return;
            try {
                const g = await gamesApi.getGameById(gameId);
                setGame(g);
                const size = g.lineup_size ?? 9;
                setLineup(
                    Array.from({ length: size }, (_, i) => ({
                        player_name: '',
                        batting_order: i + 1,
                        position: '',
                        bats: 'R' as const,
                    }))
                );
                const [roster, last] = await Promise.all([
                    gamesApi.getOpponentRoster(gameId),
                    gamesApi.getLastLineupVsOpponent(gameId).catch(() => [] as OpponentLineupPlayer[]),
                ]);
                setKnownPlayers(roster.players);
                setLastLineup(last);
            } catch {
                setError('Failed to load game');
            } finally {
                setLoading(false);
            }
        };
        fetchGame();
    }, [gameId]);

    const handleUseLastLineup = () => {
        if (lastLineup.length === 0) return;
        const size = game?.lineup_size ?? 9;
        const slots: LineupEntry[] = Array.from({ length: size }, (_, i) => {
            const prior = lastLineup.find((p) => p.batting_order === i + 1);
            if (!prior) {
                return { player_name: '', batting_order: i + 1, position: '', bats: 'R' as const };
            }
            const bats = prior.bats === 'L' || prior.bats === 'S' ? prior.bats : 'R';
            return {
                player_name: prior.player_name,
                batting_order: i + 1,
                position: prior.position ?? '',
                bats: bats as 'R' | 'L' | 'S',
            };
        });
        setLineup(slots);
        setPrefillNote('Last game’s lineup loaded — edit any rows below before saving.');
        setError('');
    };

    const handlePlayerChange = (index: number, field: keyof LineupEntry, value: string) => {
        setLineup((prev) => {
            const updated = [...prev];
            if (field === 'player_name') {
                // Match against the unified roster (batter profiles + pitcher profiles
                // deduped by normalized name) so two-way players auto-fill bats even
                // if their only known profile is on the pitching side.
                const known = knownPlayers.find((p) => p.name === value);
                updated[index] = {
                    ...updated[index],
                    player_name: value,
                    bats: known?.bats ? (known.bats as 'R' | 'L' | 'S') : updated[index].bats,
                };
            } else {
                updated[index] = { ...updated[index], [field]: value };
            }
            return updated;
        });
        setError('');
    };

    const proceed = () => navigate(`/game/${gameId}`);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const filledEntries = lineup.filter((entry) => entry.player_name.trim());

        if (filledEntries.length === 0) {
            setError('Please enter at least one player');
            return;
        }

        try {
            setSubmitting(true);

            const players = filledEntries.map((entry) => ({
                player_name: entry.player_name.trim(),
                batting_order: entry.batting_order,
                position: entry.position || undefined,
                bats: entry.bats,
                is_starter: true,
            }));

            await gamesApi.createOpponentLineupBulk(gameId!, players);

            if (startingPitcherName.trim()) {
                await opposingPitcherService.create({
                    game_id: gameId!,
                    pitcher_name: startingPitcherName.trim(),
                    team_name: game?.opponent_name ?? '',
                    throws: 'R',
                });
            }

            proceed();
        } catch {
            setError('Failed to save lineup');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading game...</LoadingText>
            </Container>
        );
    }

    if (!game) {
        return (
            <Container>
                <Content>
                    <ErrorMessage>Game not found</ErrorMessage>
                    <BackButton onClick={() => navigate('/')}>Go to Dashboard</BackButton>
                </Content>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(-1)}>Back</BackButton>
                    <Title>
                        Opponent Lineup
                        <SubTitle>vs {game.opponent_name}</SubTitle>
                    </Title>
                </HeaderLeft>
            </Header>

            <Content>
                <FormCard>
                    <GameInfo>
                        <div>
                            <GameInfoText>{game.opponent_name} @ Your Team</GameInfoText>
                            <GameInfoSubtext>
                                {new Date(game.game_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                                {game.location && ` • ${game.location}`}
                            </GameInfoSubtext>
                        </div>
                    </GameInfo>

                    {lastLineup.length > 0 && (
                        <PrefillBar>
                            <span>
                                {prefillNote ||
                                    `Last game’s starting lineup vs ${game.opponent_name} is on file (${lastLineup.length} batters).`}
                            </span>
                            <PrefillButton type="button" onClick={handleUseLastLineup}>
                                Use last game’s lineup
                            </PrefillButton>
                        </PrefillBar>
                    )}

                    {error && <ErrorMessage>{error}</ErrorMessage>}

                    <form onSubmit={handleSubmit}>
                        {knownPlayers.length > 0 && (
                            <datalist id="known-players-list">
                                {knownPlayers.map((p) => (
                                    <option key={p.normalized_name} value={p.name} />
                                ))}
                            </datalist>
                        )}
                        <SectionTitle>Starting Pitcher</SectionTitle>
                        <HelpText>
                            Enter the opponent's starting pitcher name.
                            {knownPlayers.length > 0 &&
                                ` ${knownPlayers.length} known player${knownPlayers.length === 1 ? '' : 's'} available — start typing to pick from the roster.`}
                        </HelpText>
                        <Input
                            type="text"
                            value={startingPitcherName}
                            onChange={(e) => setStartingPitcherName(e.target.value)}
                            placeholder="e.g. Smith"
                            list={knownPlayers.length > 0 ? 'known-players-list' : undefined}
                            style={{ marginBottom: '24px' }}
                        />

                        <SectionTitle>Batting Order</SectionTitle>
                        <HelpText>
                            Enter the names of opposing batters in their batting order. You can add or change players during the
                            game.
                        </HelpText>

                        <LineupTable>
                            <thead>
                                <tr>
                                    <Th style={{ width: '60px' }}>#</Th>
                                    <Th>Player Name</Th>
                                    <Th style={{ width: '120px' }}>Position</Th>
                                    <Th style={{ width: '100px' }}>Bats</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineup.map((entry, index) => (
                                    <tr key={index}>
                                        <Td>
                                            <BattingOrderCell>{entry.batting_order}</BattingOrderCell>
                                        </Td>
                                        <Td>
                                            <Input
                                                type="text"
                                                value={entry.player_name}
                                                onChange={(e) => handlePlayerChange(index, 'player_name', e.target.value)}
                                                placeholder={`Batter ${entry.batting_order}`}
                                                list={knownPlayers.length > 0 ? 'known-players-list' : undefined}
                                            />
                                        </Td>
                                        <Td>
                                            <PositionSelect
                                                value={entry.position}
                                                onChange={(e) => handlePlayerChange(index, 'position', e.target.value)}
                                            >
                                                <option value="">--</option>
                                                {POSITIONS.map((pos) => (
                                                    <option key={pos} value={pos}>
                                                        {pos}
                                                    </option>
                                                ))}
                                            </PositionSelect>
                                        </Td>
                                        <Td>
                                            <HandednessSelect
                                                value={entry.bats}
                                                onChange={(e) => handlePlayerChange(index, 'bats', e.target.value)}
                                            >
                                                <option value="R">R</option>
                                                <option value="L">L</option>
                                                <option value="S">S</option>
                                            </HandednessSelect>
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </LineupTable>

                        <FormActions>
                            <div>
                                <CancelButton type="button" onClick={() => navigate('/')}>
                                    Cancel
                                </CancelButton>
                                <SkipButton type="button" onClick={proceed} style={{ marginLeft: '16px' }}>
                                    Skip for now
                                </SkipButton>
                            </div>
                            <SubmitButton type="submit" disabled={submitting}>
                                {submitting ? 'Saving...' : 'Save & Start Game'}
                            </SubmitButton>
                        </FormActions>
                    </form>
                </FormCard>
            </Content>
        </Container>
    );
};

export default OpponentLineup;
