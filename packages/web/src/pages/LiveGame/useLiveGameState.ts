import {
    deriveGameMode,
    GameMode,
    GameRole,
    MyTeamLineupPlayer,
    OpposingPitcher,
    PitchCall,
    PitchCallZone,
    Player,
} from '@pitch-tracker/shared';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HitType, HitLocation } from '../../components/live/BaseballDiamond';
import useHeatZones from '../../hooks/useHeatZones';
import { gameRoleService } from '../../services/gameRoleService';
import { myTeamLineupService } from '../../services/myTeamLineupService';
import { opposingPitcherService } from '../../services/opposingPitcherService';
import { teamService } from '../../services/teamService';
import { useAppDispatch, useAppSelector, fetchGameById } from '../../state';
import { gamesApi } from '../../state/games/api/gamesApi';
import {
    PitchType,
    PitchResult,
    OpponentLineupPlayer,
    GamePitcherWithPlayer,
    Inning as InningType,
    BaseRunners,
} from '../../types';

export const ALL_PITCH_TYPES: { value: PitchType; label: string }[] = [
    { value: 'fastball', label: 'Fastball' },
    { value: '4-seam', label: '4-Seam' },
    { value: '2-seam', label: '2-Seam' },
    { value: 'cutter', label: 'Cutter' },
    { value: 'sinker', label: 'Sinker' },
    { value: 'slider', label: 'Slider' },
    { value: 'curveball', label: 'Curveball' },
    { value: 'changeup', label: 'Changeup' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'knuckleball', label: 'Knuckleball' },
    { value: 'other', label: 'Other' },
];

export function useLiveGameState() {
    const { gameId } = useParams<{ gameId: string }>();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { selectedGame: game, currentAtBat, pitches, loading } = useAppSelector((state) => state.games);

    // Pitch form state
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [targetZone, setTargetZone] = useState<PitchCallZone | null>(null);
    const [pitchType, setPitchType] = useState<PitchType>('fastball');
    const [velocity, setVelocity] = useState<string>('');
    const [pitchResult, setPitchResult] = useState<PitchResult>('ball');

    // Current pitcher and batter
    const [currentPitcher, setCurrentPitcher] = useState<GamePitcherWithPlayer | null>(null);
    const [currentBatter, setCurrentBatter] = useState<OpponentLineupPlayer | null>(null);
    const [currentBattingOrder, setCurrentBattingOrder] = useState(1);

    // Modal visibility
    const [showPitcherSelector, setShowPitcherSelector] = useState(false);
    const [showBatterSelector, setShowBatterSelector] = useState(false);

    // Current inning
    const [currentInning, setCurrentInning] = useState<InningType | null>(null);

    // Trigger to refresh pitcher stats after each pitch
    const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

    // Pitcher's available pitch types
    const [pitcherPitchTypes, setPitcherPitchTypes] = useState<PitchType[]>([]);

    // Opponent lineup for auto-advancing batters
    const [opponentLineup, setOpponentLineup] = useState<OpponentLineupPlayer[]>([]);

    // Out tracking
    const [currentOuts, setCurrentOuts] = useState(0);

    // Inning change notification and runs input
    const [showInningChange, setShowInningChange] = useState(false);
    const [inningChangeInfo, setInningChangeInfo] = useState<{ inning: number; half: string } | null>(null);
    const [teamRunsScored, setTeamRunsScored] = useState<string>('0');

    // Baseball diamond modal for in-play recording
    const [showDiamondModal, setShowDiamondModal] = useState(false);
    const [hitType, setHitType] = useState<HitType>('line_drive');
    const [hitLocation, setHitLocation] = useState<HitLocation | null>(null);

    // Heat zones - automatically filter by currently selected pitch type
    const [showHeatZones, setShowHeatZones] = useState(false);
    const { zones: heatZones } = useHeatZones(currentPitcher?.player_id, gameId, pitchType);

    // Base runners state
    const [baseRunners, setBaseRunners] = useState<BaseRunners>({ first: false, second: false, third: false });

    // Base runner modals
    const [showRunnerEventModal, setShowRunnerEventModal] = useState(false);
    const [runnerEventDefaultTab, setRunnerEventDefaultTab] = useState<'advance' | 'out'>('advance');
    const [showRunnerAdvancementModal, setShowRunnerAdvancementModal] = useState(false);
    const [pendingHitResult, setPendingHitResult] = useState<string | null>(null);
    const [showDroppedThirdModal, setShowDroppedThirdModal] = useState(false);
    const [showDoublePlayModal, setShowDoublePlayModal] = useState(false);

    // Pitch call state
    const [activeCall, setActiveCall] = useState<PitchCall | null>(null);
    const [sendingCall, setSendingCall] = useState(false);

    // Tendencies panels
    const [showPitcherTendencies, setShowPitcherTendencies] = useState(false);
    const [showHitterTendencies, setShowHitterTendencies] = useState(false);

    // Local shake count (mirrors game.shake_count, incremented optimistically)
    const [localShakeCount, setLocalShakeCount] = useState(0);

    // Team at bat modal (visitor games)
    const [showTeamAtBat, setShowTeamAtBat] = useState(false);
    const [teamAtBatRuns, setTeamAtBatRuns] = useState<string>('0');

    // Opposing pitcher charting
    const [opposingPitchers, setOpposingPitchers] = useState<OpposingPitcher[]>([]);
    const [currentOpposingPitcher, setCurrentOpposingPitcher] = useState<OpposingPitcher | null>(null);
    const [showCountBreakdown, setShowCountBreakdown] = useState(false);

    // My team lineup (for opp_pitcher / both charting modes)
    const [myTeamLineup, setMyTeamLineup] = useState<MyTeamLineupPlayer[]>([]);
    const [currentMyBatter, setCurrentMyBatter] = useState<MyTeamLineupPlayer | null>(null);
    const [teamRosterPlayers, setTeamRosterPlayers] = useState<Player[]>([]);

    // Game role (charter or viewer)
    const [gameRole, setGameRole] = useState<GameRole | null>(null);

    const gameMode: GameMode = useMemo(() => {
        if (!game) return 'our_pitcher';
        return deriveGameMode(game.is_home_game ?? true, game.inning_half);
    }, [game]);

    // Auto-show TeamAtBat modal when user's team is batting (visitor games),
    // but not when charting_mode is 'both' — in that mode we chart at-bats directly.
    const isUserBatting = game && game.status === 'in_progress' && !game.is_home_game && game.inning_half === 'top';
    useEffect(() => {
        if (isUserBatting && !showInningChange && game?.charting_mode !== 'both') {
            setShowTeamAtBat(true);
        }
    }, [isUserBatting, game?.current_inning, game?.inning_half, game?.charting_mode, showInningChange]);

    useEffect(() => {
        if (gameId) {
            dispatch(fetchGameById(gameId));
            gamesApi
                .getOpponentLineup(gameId)
                .then((lineup) => {
                    setOpponentLineup(lineup || []);
                    if (lineup && lineup.length > 0) {
                        const firstBatter = lineup.find((p) => p.batting_order === 1);
                        if (firstBatter) {
                            setCurrentBatter((prev) => (prev ? prev : firstBatter));
                        }
                    }
                })
                .catch((err) => console.error('Failed to load opponent lineup:', err));
            gamesApi.getCurrentInning(gameId).then(setCurrentInning);
            gamesApi
                .getBaseRunners(gameId)
                .then(setBaseRunners)
                .catch(() => {});
            opposingPitcherService
                .getByGame(gameId)
                .then((pitchers) => {
                    setOpposingPitchers(pitchers);
                    if (pitchers.length > 0) setCurrentOpposingPitcher(pitchers[pitchers.length - 1]);
                })
                .catch(() => {});
            gameRoleService
                .getRole(gameId)
                .then(setGameRole)
                .catch(() => {});
            myTeamLineupService
                .getByGame(gameId)
                .then((lineup) => {
                    setMyTeamLineup(lineup || []);
                    if (lineup && lineup.length > 0) {
                        const first = lineup.find((p) => p.batting_order === 1 && p.is_starter);
                        if (first) setCurrentMyBatter((prev) => (prev ? prev : first));
                    }
                })
                .catch(() => {});
        }
    }, [dispatch, gameId]);

    // Load team roster when game team is known
    useEffect(() => {
        if (game?.home_team_id) {
            teamService
                .getTeamRoster(game.home_team_id)
                .then(setTeamRosterPlayers)
                .catch(() => {});
        }
    }, [game?.home_team_id]);

    // Load pitcher's pitch types when pitcher changes
    useEffect(() => {
        if (currentPitcher?.player_id) {
            gamesApi
                .getPitcherPitchTypes(currentPitcher.player_id)
                .then((pitchTypes) => {
                    const types = (pitchTypes || []) as PitchType[];
                    setPitcherPitchTypes(types);
                    if (types.length > 0) {
                        setPitchType((prev) => (types.includes(prev) ? prev : types[0]));
                    }
                })
                .catch(() => setPitcherPitchTypes([]));
        } else {
            setPitcherPitchTypes([]);
        }
    }, [currentPitcher?.player_id]);

    // Filter pitch types: only apply pitcher's configured types when we are the pitcher.
    // In opp_pitcher mode the opposing pitcher can throw anything.
    const availablePitchTypes =
        gameMode !== 'opp_pitcher' && pitcherPitchTypes.length > 0
            ? ALL_PITCH_TYPES.filter((pt) => pitcherPitchTypes.includes(pt.value))
            : ALL_PITCH_TYPES;

    return {
        // Router
        gameId,
        dispatch,
        navigate,
        // Redux state
        game,
        currentAtBat,
        pitches,
        loading,
        // Pitch form
        pitchLocation,
        setPitchLocation,
        targetZone,
        setTargetZone,
        pitchType,
        setPitchType,
        velocity,
        setVelocity,
        pitchResult,
        setPitchResult,
        // Players
        currentPitcher,
        setCurrentPitcher,
        currentBatter,
        setCurrentBatter,
        currentBattingOrder,
        setCurrentBattingOrder,
        // Modals
        showPitcherSelector,
        setShowPitcherSelector,
        showBatterSelector,
        setShowBatterSelector,
        // Inning
        currentInning,
        setCurrentInning,
        // Stats
        statsRefreshTrigger,
        setStatsRefreshTrigger,
        // Pitch types
        availablePitchTypes,
        // Lineup
        opponentLineup,
        // Outs
        currentOuts,
        setCurrentOuts,
        // Inning change
        showInningChange,
        setShowInningChange,
        inningChangeInfo,
        setInningChangeInfo,
        teamRunsScored,
        setTeamRunsScored,
        // Diamond modal
        showDiamondModal,
        setShowDiamondModal,
        hitType,
        setHitType,
        hitLocation,
        setHitLocation,
        // Heat zones
        showHeatZones,
        setShowHeatZones,
        heatZones,
        // Base runners
        baseRunners,
        setBaseRunners,
        showRunnerEventModal,
        setShowRunnerEventModal,
        runnerEventDefaultTab,
        setRunnerEventDefaultTab,
        showRunnerAdvancementModal,
        setShowRunnerAdvancementModal,
        pendingHitResult,
        setPendingHitResult,
        showDroppedThirdModal,
        setShowDroppedThirdModal,
        showDoublePlayModal,
        setShowDoublePlayModal,
        // Pitch call
        activeCall,
        setActiveCall,
        sendingCall,
        setSendingCall,
        // Tendencies panels
        showPitcherTendencies,
        setShowPitcherTendencies,
        showHitterTendencies,
        setShowHitterTendencies,
        // Shake count
        localShakeCount,
        setLocalShakeCount,
        // Team at bat (visitor games)
        showTeamAtBat,
        setShowTeamAtBat,
        teamAtBatRuns,
        setTeamAtBatRuns,
        // Opposing pitcher charting
        opposingPitchers,
        setOpposingPitchers,
        currentOpposingPitcher,
        setCurrentOpposingPitcher,
        showCountBreakdown,
        setShowCountBreakdown,
        gameMode,
        gameRole,
        setGameRole,
        // My team lineup
        myTeamLineup,
        setMyTeamLineup,
        currentMyBatter,
        setCurrentMyBatter,
        teamRosterPlayers,
    };
}

export type LiveGameState = ReturnType<typeof useLiveGameState>;
