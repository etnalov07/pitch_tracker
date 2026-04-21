import { Game, Player } from '@pitch-tracker/shared';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { myTeamLineupService } from '../../services/myTeamLineupService';
import { teamService } from '../../services/teamService';
import { gamesApi } from '../../state/games/api/gamesApi';
import {
    BackButton,
    BattingOrderCell,
    CancelButton,
    Container,
    ErrorMessage,
    FormActions,
    FormCard,
    GameInfo,
    GameInfoSubtext,
    GameInfoText,
    Header,
    HeaderLeft,
    HelpText,
    LineupTable,
    LoadingText,
    PositionSelect,
    SectionTitle,
    SkipButton,
    SubmitButton,
    Td,
    Th,
    Title,
} from '../OpponentLineup/styles';

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'];

interface LineupEntry {
    player_id: string;
    batting_order: number;
    position: string;
}

const MyTeamLineup: React.FC = () => {
    const navigate = useNavigate();
    const { gameId } = useParams<{ gameId: string }>();

    const [game, setGame] = useState<Game | null>(null);
    const [roster, setRoster] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [lineup, setLineup] = useState<LineupEntry[]>(
        Array.from({ length: 9 }, (_, i) => ({
            player_id: '',
            batting_order: i + 1,
            position: '',
        }))
    );

    useEffect(() => {
        if (!gameId) return;
        Promise.all([gamesApi.getGameById(gameId), null])
            .then(async ([g]) => {
                setGame(g);
                const size = g.lineup_size ?? 9;
                setLineup(
                    Array.from({ length: size }, (_, i) => ({
                        player_id: '',
                        batting_order: i + 1,
                        position: '',
                    }))
                );
                const players = await teamService.getTeamRoster(g.home_team_id);
                setRoster(players || []);
            })
            .catch(() => setError('Failed to load game'))
            .finally(() => setLoading(false));
    }, [gameId]);

    const handlePlayerChange = (index: number, field: keyof LineupEntry, value: string) => {
        setLineup((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            if (field === 'player_id' && value) {
                const player = roster.find((p) => p.id === value);
                if (player && !updated[index].position) {
                    updated[index].position = player.primary_position;
                }
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gameId) return;

        const filledEntries = lineup.filter((entry) => entry.player_id);
        if (filledEntries.length === 0) {
            setError('Please select at least one player');
            return;
        }

        try {
            setSubmitting(true);
            await myTeamLineupService.bulkCreate(
                gameId,
                filledEntries.map((entry) => ({
                    player_id: entry.player_id,
                    batting_order: entry.batting_order,
                    position: entry.position || undefined,
                    is_starter: true,
                }))
            );
            navigate(`/game/${gameId}`);
        } catch {
            setError('Failed to save lineup');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading)
        return (
            <Container>
                <LoadingText>Loading...</LoadingText>
            </Container>
        );

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/game/${gameId}`)}>Back</BackButton>
                    <Title>My Team Lineup</Title>
                    {game?.opponent_name && (
                        <GameInfo>
                            <GameInfoText>vs {game.opponent_name}</GameInfoText>
                            <GameInfoSubtext>{game.game_date?.slice(0, 10)}</GameInfoSubtext>
                        </GameInfo>
                    )}
                </HeaderLeft>
            </Header>

            <FormCard>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                <SectionTitle>Batting Order</SectionTitle>
                <HelpText>Select your team's batting order. Batter handedness comes from player profiles.</HelpText>

                <form onSubmit={handleSubmit}>
                    <LineupTable>
                        <thead>
                            <tr>
                                <Th>#</Th>
                                <Th>Player</Th>
                                <Th>Position</Th>
                                <Th>Bats</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineup.map((entry, index) => {
                                const selectedPlayer = roster.find((p) => p.id === entry.player_id);
                                return (
                                    <tr key={index}>
                                        <BattingOrderCell>{entry.batting_order}</BattingOrderCell>
                                        <Td>
                                            <select
                                                value={entry.player_id}
                                                onChange={(e) => handlePlayerChange(index, 'player_id', e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '4px',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                <option value="">-- Select Player --</option>
                                                {roster.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.jersey_number ? `#${p.jersey_number} ` : ''}
                                                        {p.first_name} {p.last_name}
                                                    </option>
                                                ))}
                                            </select>
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
                                        <Td>{selectedPlayer ? selectedPlayer.bats : '—'}</Td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </LineupTable>

                    <FormActions>
                        <CancelButton type="button" onClick={() => navigate(`/game/${gameId}`)}>
                            Cancel
                        </CancelButton>
                        <SkipButton type="button" onClick={() => navigate(`/game/${gameId}`)}>
                            Skip for Now
                        </SkipButton>
                        <SubmitButton type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Lineup'}
                        </SubmitButton>
                    </FormActions>
                </form>
            </FormCard>
        </Container>
    );
};

export default MyTeamLineup;
