import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HitType, HitLocation } from '../../components/live/BaseballDiamond';
import useHeatZones from '../../hooks/useHeatZones';
import api from '../../services/api';
import {
    useAppDispatch,
    useAppSelector,
    fetchGameById,
} from '../../state';
import { gamesApi } from '../../state/games/api/gamesApi';
import { PitchType, PitchResult, OpponentLineupPlayer, GamePitcherWithPlayer, Inning as InningType } from '../../types';

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
    const [targetLocation, setTargetLocation] = useState<{ x: number; y: number } | null>(null);
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

    useEffect(() => {
        if (gameId) {
            dispatch(fetchGameById(gameId));
            api.get<{ lineup: OpponentLineupPlayer[] }>(`/opponent-lineup/game/${gameId}`)
                .then((response) => {
                    const lineup = response.data.lineup || [];
                    setOpponentLineup(lineup);
                    if (lineup.length > 0) {
                        const firstBatter = lineup.find((p) => p.batting_order === 1);
                        if (firstBatter) {
                            setCurrentBatter((prev) => (prev ? prev : firstBatter));
                        }
                    }
                })
                .catch((err) => console.error('Failed to load opponent lineup:', err));
            gamesApi.getCurrentInning(gameId).then(setCurrentInning);
        }
    }, [dispatch, gameId]);

    // Load pitcher's pitch types when pitcher changes
    useEffect(() => {
        if (currentPitcher?.player_id) {
            api.get<{ pitch_types: string[] }>(`/players/${currentPitcher.player_id}/pitch-types`)
                .then((response) => {
                    const types = (response.data.pitch_types || []) as PitchType[];
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

    // Filter pitch types: use pitcher's types if available, otherwise show all
    const availablePitchTypes =
        pitcherPitchTypes.length > 0 ? ALL_PITCH_TYPES.filter((pt) => pitcherPitchTypes.includes(pt.value)) : ALL_PITCH_TYPES;

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
        pitchLocation, setPitchLocation,
        targetLocation, setTargetLocation,
        pitchType, setPitchType,
        velocity, setVelocity,
        pitchResult, setPitchResult,
        // Players
        currentPitcher, setCurrentPitcher,
        currentBatter, setCurrentBatter,
        currentBattingOrder, setCurrentBattingOrder,
        // Modals
        showPitcherSelector, setShowPitcherSelector,
        showBatterSelector, setShowBatterSelector,
        // Inning
        currentInning, setCurrentInning,
        // Stats
        statsRefreshTrigger, setStatsRefreshTrigger,
        // Pitch types
        availablePitchTypes,
        // Lineup
        opponentLineup,
        // Outs
        currentOuts, setCurrentOuts,
        // Inning change
        showInningChange, setShowInningChange,
        inningChangeInfo, setInningChangeInfo,
        teamRunsScored, setTeamRunsScored,
        // Diamond modal
        showDiamondModal, setShowDiamondModal,
        hitType, setHitType,
        hitLocation, setHitLocation,
        // Heat zones
        showHeatZones, setShowHeatZones,
        heatZones,
    };
}

export type LiveGameState = ReturnType<typeof useLiveGameState>;
