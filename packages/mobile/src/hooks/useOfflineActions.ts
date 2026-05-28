import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../state';
import { logPitch, createAtBat, updateAtBat, recordPlay, addPitch, setOnlineStatus, incrementPendingCount } from '../state';
import { queueAction } from '../db/offlineQueue';
import { checkIsOnline } from '../services/networkCheck';
import { Pitch, AtBat, Play, PitchType, PitchResult, PitchCallZone, TeamSide } from '@pitch-tracker/shared';

// Offline buffer (game charting): when reception drops, pitch logs are queued to
// AsyncStorage and replayed on reconnect by offlineService. Only LOG_PITCH is
// buffered — its at_bat_id always points at a server-created at-bat because
// at-bat/inning/game transitions are gated to online (no temp→real ID remap).

interface LogPitchPayload {
    at_bat_id: string;
    game_id: string;
    pitcher_id?: string;
    batter_id?: string;
    opponent_batter_id?: string;
    pitch_type: PitchType;
    pitch_result: PitchResult;
    location_x: number;
    location_y: number;
    target_location_x?: number;
    target_location_y?: number;
    target_zone?: PitchCallZone;
    velocity?: number;
    balls_before: number;
    strikes_before: number;
    team_side?: TeamSide;
}

interface CreateAtBatPayload extends Partial<AtBat> {
    game_id: string;
    pitcher_id: string;
    inning: number;
    inning_half: 'top' | 'bottom';
    outs_before: number;
}

interface UpdateAtBatPayload {
    at_bat_id: string;
    result?: string;
    outs_after?: number;
}

interface RecordPlayPayload extends Partial<Play> {
    at_bat_id: string;
    game_id: string;
}

// Payload that gets queued + replayed (mirrors the online logPitch body).
const buildPitchData = (payload: LogPitchPayload): Partial<Pitch> & { opponent_batter_id?: string } => ({
    at_bat_id: payload.at_bat_id,
    game_id: payload.game_id,
    pitcher_id: payload.pitcher_id,
    batter_id: payload.batter_id,
    opponent_batter_id: payload.opponent_batter_id,
    pitch_type: payload.pitch_type,
    pitch_result: payload.pitch_result,
    location_x: payload.location_x,
    location_y: payload.location_y,
    target_location_x: payload.target_location_x,
    target_location_y: payload.target_location_y,
    target_zone: payload.target_zone,
    velocity: payload.velocity,
    balls_before: payload.balls_before,
    strikes_before: payload.strikes_before,
});

// Optimistic pitch for instant UI (count, strike-zone dot). The `local-` id marks
// it as not-yet-synced, so the caller suppresses the server-only EDIT affordance.
const makeLocalPitch = (data: Partial<Pitch>): Pitch => ({
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at_bat_id: data.at_bat_id ?? '',
    game_id: data.game_id ?? '',
    pitcher_id: data.pitcher_id ?? '',
    pitch_number: 0,
    pitch_type: data.pitch_type as PitchType,
    velocity: data.velocity,
    location_x: data.location_x,
    location_y: data.location_y,
    target_location_x: data.target_location_x,
    target_location_y: data.target_location_y,
    target_zone: data.target_zone,
    balls_before: data.balls_before ?? 0,
    strikes_before: data.strikes_before ?? 0,
    pitch_result: data.pitch_result as PitchResult,
    created_at: new Date().toISOString(),
});

export const useOfflineActions = () => {
    const dispatch = useAppDispatch();
    const isOnline = useAppSelector((s) => s.offline.isOnline);

    const logPitchOffline = useCallback(
        async (payload: LogPitchPayload): Promise<{ success: boolean; queued: boolean; pitch?: Pitch }> => {
            const pitchData = buildPitchData(payload);

            const bufferOffline = async () => {
                await queueAction('LOG_PITCH', pitchData);
                const pitch = makeLocalPitch(pitchData);
                dispatch(addPitch(pitch)); // optimistic — advances the count immediately
                dispatch(incrementPendingCount());
                return { success: true, queued: true, pitch };
            };

            if (!isOnline) {
                return bufferOffline();
            }

            try {
                const pitch = await dispatch(logPitch(pitchData)).unwrap();
                return { success: true, queued: false, pitch };
            } catch {
                // The thunk rejects with a plain message, so re-probe connectivity to
                // tell a dropped connection (buffer it) from a real server error (fail).
                const online = await checkIsOnline();
                if (!online) {
                    dispatch(setOnlineStatus(false));
                    return bufferOffline();
                }
                return { success: false, queued: false };
            }
        },
        [dispatch, isOnline]
    );

    const createAtBatOffline = useCallback(
        async (payload: CreateAtBatPayload): Promise<{ success: boolean; queued: boolean }> => {
            const atBatData: Partial<AtBat> = payload;
            try {
                await dispatch(createAtBat(atBatData)).unwrap();
                return { success: true, queued: false };
            } catch {
                return { success: false, queued: false };
            }
        },
        [dispatch]
    );

    const updateAtBatOffline = useCallback(
        async (payload: UpdateAtBatPayload): Promise<{ success: boolean; queued: boolean }> => {
            const { at_bat_id, ...updateData } = payload;
            try {
                await dispatch(updateAtBat({ id: at_bat_id, data: updateData })).unwrap();
                return { success: true, queued: false };
            } catch {
                return { success: false, queued: false };
            }
        },
        [dispatch]
    );

    const recordPlayOffline = useCallback(
        async (payload: RecordPlayPayload): Promise<{ success: boolean; queued: boolean }> => {
            const playData: Partial<Play> = payload;
            try {
                await dispatch(recordPlay(playData)).unwrap();
                return { success: true, queued: false };
            } catch {
                return { success: false, queued: false };
            }
        },
        [dispatch]
    );

    return {
        isOnline,
        logPitchOffline,
        createAtBatOffline,
        updateAtBatOffline,
        recordPlayOffline,
    };
};
