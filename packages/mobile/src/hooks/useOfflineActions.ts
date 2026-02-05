import { useCallback } from 'react';
import { useAppDispatch } from '../state';
import { logPitch, createAtBat, updateAtBat, recordPlay, addPitch } from '../state';
import { Pitch, AtBat, Play, PitchType, PitchResult } from '@pitch-tracker/shared';

// Offline support disabled for iOS 26.2 beta testing (TurboModule crash)
// This hook now always performs online operations directly

interface LogPitchPayload {
    at_bat_id: string;
    game_id: string;
    pitcher_id?: string;
    pitch_type: PitchType;
    pitch_result: PitchResult;
    location_x: number;
    location_y: number;
    target_location_x?: number;
    target_location_y?: number;
    velocity?: number;
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

export const useOfflineActions = () => {
    const dispatch = useAppDispatch();
    // Always report as online since offline support is disabled
    const isOnline = true;

    const logPitchOffline = useCallback(
        async (payload: LogPitchPayload): Promise<{ success: boolean; queued: boolean }> => {
            const pitchData: Partial<Pitch> = {
                at_bat_id: payload.at_bat_id,
                game_id: payload.game_id,
                pitcher_id: payload.pitcher_id,
                pitch_type: payload.pitch_type,
                pitch_result: payload.pitch_result,
                location_x: payload.location_x,
                location_y: payload.location_y,
                target_location_x: payload.target_location_x,
                target_location_y: payload.target_location_y,
                velocity: payload.velocity,
            };

            try {
                await dispatch(logPitch(pitchData)).unwrap();
                return { success: true, queued: false };
            } catch {
                // No offline queue - just fail
                return { success: false, queued: false };
            }
        },
        [dispatch]
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
