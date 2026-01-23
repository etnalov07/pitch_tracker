import { PitcherProfile as PitcherProfileType, PitcherGameLog } from '@pitch-tracker/shared';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HeatZoneOverlay from '../../components/live/HeatZoneOverlay';
import { GameLogTable, GameLogDetail } from '../../components/pitcher';
import useHeatZones from '../../hooks/useHeatZones';
import api from '../../services/api';
import {
    Container,
    Header,
    HeaderLeft,
    BackButton,
    ProfileInfo,
    PitcherName,
    PitcherMeta,
    JerseyNumber,
    TeamName,
    Content,
    CareerStatsCard,
    CareerStatsTitle,
    CareerStatsGrid,
    StatBox,
    StatValue,
    StatLabel,
    PitchTypesCard,
    PitchTypesTitle,
    PitchTypesList,
    PitchTypeBadge,
    GameLogsSection,
    SectionHeader,
    SectionTitle,
    LoadingText,
    ErrorText,
    ErrorContainer,
    HeatZoneCard,
    HeatZoneHeader,
    HeatZoneTitle,
    ToggleButton,
    HeatZoneContent,
    HeatZoneLegend,
    LegendItem,
    LegendColor,
    PitchTypeFilter,
    PitchTypeFilterLabel,
    PitchTypeSelect,
} from './styles';

const formatPitchType = (type: string): string => {
    const names: { [key: string]: string } = {
        fastball: 'Fastball',
        '2-seam': '2-Seam',
        '4-seam': '4-Seam',
        cutter: 'Cutter',
        sinker: 'Sinker',
        slider: 'Slider',
        curveball: 'Curveball',
        changeup: 'Changeup',
        splitter: 'Splitter',
        knuckleball: 'Knuckleball',
        screwball: 'Screwball',
        other: 'Other',
    };
    return names[type] || type;
};

const PitcherProfile: React.FC = () => {
    const navigate = useNavigate();
    const { team_id, pitcher_id } = useParams<{ team_id: string; pitcher_id: string }>();

    const [profile, setProfile] = useState<PitcherProfileType | null>(null);
    const [selectedGame, setSelectedGame] = useState<PitcherGameLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showHeatZones, setShowHeatZones] = useState(true);
    const [heatZonePitchType, setHeatZonePitchType] = useState<string | undefined>(undefined);

    // Fetch heat zones for career stats (no gameId = all games, optional pitch type filter)
    const { zones: heatZones } = useHeatZones(pitcher_id, undefined, heatZonePitchType);

    useEffect(() => {
        const loadProfile = async () => {
            if (!pitcher_id) return;

            try {
                setLoading(true);
                const response = await api.get<{ profile: PitcherProfileType }>(`/analytics/pitcher/${pitcher_id}/profile`);
                setProfile(response.data.profile);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load pitcher profile');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [pitcher_id]);

    const handleGameSelect = (gameLog: PitcherGameLog) => {
        setSelectedGame(gameLog);
    };

    const handleCloseDetail = () => {
        setSelectedGame(null);
    };

    const handleViewGame = (gameId: string) => {
        navigate(`/game/${gameId}`);
    };

    if (loading) {
        return (
            <Container>
                <LoadingText>Loading pitcher profile...</LoadingText>
            </Container>
        );
    }

    if (error || !profile) {
        return (
            <Container>
                <ErrorContainer>
                    <ErrorText>{error || 'Pitcher not found'}</ErrorText>
                    <BackButton onClick={() => navigate(`/teams/${team_id}`)}>Back to Team</BackButton>
                </ErrorContainer>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <BackButton onClick={() => navigate(`/teams/${team_id}`)}>&larr; Back to Team</BackButton>
                    <ProfileInfo>
                        <PitcherName>
                            {profile.first_name} {profile.last_name}
                        </PitcherName>
                        <PitcherMeta>
                            <JerseyNumber>#{profile.jersey_number || '-'}</JerseyNumber>
                            <span>|</span>
                            <TeamName>{profile.team_name}</TeamName>
                            <span>|</span>
                            <span>Throws: {profile.throws === 'R' ? 'Right' : 'Left'}</span>
                        </PitcherMeta>
                    </ProfileInfo>
                </HeaderLeft>
            </Header>

            <Content>
                <CareerStatsCard>
                    <CareerStatsTitle>Career Stats</CareerStatsTitle>
                    <CareerStatsGrid>
                        <StatBox>
                            <StatValue>{profile.career_stats.total_games}</StatValue>
                            <StatLabel>Games</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{profile.career_stats.total_pitches}</StatValue>
                            <StatLabel>Total Pitches</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>{profile.career_stats.total_batters_faced}</StatValue>
                            <StatLabel>Batters Faced</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue highlight>{profile.career_stats.overall_strike_percentage}%</StatValue>
                            <StatLabel>Strike %</StatLabel>
                        </StatBox>
                        <StatBox>
                            <StatValue>
                                {profile.career_stats.overall_target_accuracy !== null
                                    ? `${profile.career_stats.overall_target_accuracy}%`
                                    : '-'}
                            </StatValue>
                            <StatLabel>Target Accuracy</StatLabel>
                        </StatBox>
                    </CareerStatsGrid>
                </CareerStatsCard>

                {profile.pitch_types.length > 0 && (
                    <PitchTypesCard>
                        <PitchTypesTitle>Pitch Arsenal</PitchTypesTitle>
                        <PitchTypesList>
                            {profile.pitch_types.map((type) => (
                                <PitchTypeBadge key={type}>{formatPitchType(type)}</PitchTypeBadge>
                            ))}
                        </PitchTypesList>
                    </PitchTypesCard>
                )}

                <HeatZoneCard>
                    <HeatZoneHeader>
                        <HeatZoneTitle>Strike Zone Heat Map</HeatZoneTitle>
                        <ToggleButton active={showHeatZones} onClick={() => setShowHeatZones(!showHeatZones)}>
                            {showHeatZones ? 'Hide' : 'Show'} Heat Zones
                        </ToggleButton>
                    </HeatZoneHeader>
                    {profile.pitch_types.length > 0 && (
                        <PitchTypeFilter>
                            <PitchTypeFilterLabel>Filter by pitch:</PitchTypeFilterLabel>
                            <PitchTypeSelect
                                value={heatZonePitchType || ''}
                                onChange={(e) => setHeatZonePitchType(e.target.value || undefined)}
                            >
                                <option value="">All Pitches</option>
                                {profile.pitch_types.map((type) => (
                                    <option key={type} value={type}>
                                        {formatPitchType(type)}
                                    </option>
                                ))}
                            </PitchTypeSelect>
                        </PitchTypeFilter>
                    )}
                    <HeatZoneContent>
                        <svg viewBox="0 0 300 280" style={{ width: '100%', maxWidth: '350px' }}>
                            {/* Background */}
                            <rect x="0" y="0" width="300" height="280" fill="#f5f5f0" />
                            {/* Strike zone grid */}
                            <g transform="translate(85, 30)">
                                <rect x="0" y="0" width="130" height="150" fill="rgba(255,255,255,0.85)" />
                                {[0, 1, 2].map((row) =>
                                    [0, 1, 2].map((col) => (
                                        <rect
                                            key={`cell-${row}-${col}`}
                                            x={col * (130 / 3)}
                                            y={row * (150 / 3)}
                                            width={130 / 3}
                                            height={150 / 3}
                                            fill="rgba(230, 230, 225, 0.6)"
                                            stroke="#a0a0a0"
                                            strokeWidth="1"
                                        />
                                    ))
                                )}
                                <rect x="0" y="0" width="130" height="150" fill="none" stroke="#808080" strokeWidth="2" />
                            </g>
                            {/* Heat zone overlay */}
                            <HeatZoneOverlay zones={heatZones} visible={showHeatZones} />
                        </svg>
                    </HeatZoneContent>
                    <HeatZoneLegend>
                        <LegendItem>
                            <LegendColor color="#ef4444" />
                            <span>Low Strike %</span>
                        </LegendItem>
                        <LegendItem>
                            <LegendColor color="#eab308" />
                            <span>50%</span>
                        </LegendItem>
                        <LegendItem>
                            <LegendColor color="#22c55e" />
                            <span>High Strike %</span>
                        </LegendItem>
                    </HeatZoneLegend>
                </HeatZoneCard>

                <GameLogsSection>
                    <SectionHeader>
                        <SectionTitle>Game Logs</SectionTitle>
                    </SectionHeader>
                    <GameLogTable gameLogs={profile.game_logs} onGameSelect={handleGameSelect} />
                </GameLogsSection>
            </Content>
            {selectedGame && <GameLogDetail gameLog={selectedGame} onClose={handleCloseDetail} onViewGame={handleViewGame} />}
        </Container>
    );
};

export default PitcherProfile;
