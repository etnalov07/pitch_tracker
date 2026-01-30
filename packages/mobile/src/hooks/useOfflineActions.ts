import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../state';
import { queueAction } from '../db/offlineQueue';
import { incrementPendingCount } from '../state/offline/offlineSlice';
import { logPitch, createAtBat, updateAtBat, recordPlay, addPitch } from '../state';
import { Pitch, AtBat, Play, PitchType, PitchResult } from '@pitch-tracker/shared';

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
    const isOnline = useAppSelector((state) => state.offline.isOnline);

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

            if (isOnline) {
                try {
                    await dispatch(logPitch(pitchData)).unwrap();
                    return { success: true, queued: false };
                } catch {
                    // Fall back to offline queue on failure
                    await queueAction('LOG_PITCH', pitchData);
                    dispatch(incrementPendingCount());

                    // Optimistically add to local state
                    const optimisticPitch: Pitch = {
                        ...pitchData,
                        id: `temp_${Date.now()}`,
                        pitch_number: 0,
                        created_at: new Date().toISOString(),
                    } as Pitch;
                    dispatch(addPitch(optimisticPitch));

                    return { success: false, queued: true };
                }
            } else {
                // Queue for later sync
                await queueAction('LOG_PITCH', pitchData);
                dispatch(incrementPendingCount());

                // Optimistically add to local state
                const optimisticPitch: Pitch = {
                    ...pitchData,
                    id: `temp_${Date.now()}`,
                    pitch_number: 0,
                    created_at: new Date().toISOString(),
                } as Pitch;
                dispatch(addPitch(optimisticPitch));

                return { success: false, queued: true };
            }
        },
        [isOnline, dispatch]
    );

    const createAtBatOffline = useCallback(
        async (payload: CreateAtBatPayload): Promise<{ success: boolean; queued: boolean }> => {
            const atBatData: Partial<AtBat> = payload;

            if (isOnline) {
                try {
                    await dispatch(createAtBat(atBatData)).unwrap();
                    return { success: true, queued: false };
                } catch {
                    await queueAction('CREATE_AT_BAT', atBatData);
                    dispatch(incrementPendingCount());
                    return { success: false, queued: true };
                }
            } else {
                await queueAction('CREATE_AT_BAT', atBatData);
                dispatch(incrementPendingCount());
                return { success: false, queued: true };
            }
        },
        [isOnline, dispatch]
    );

    const updateAtBatOffline = useCallback(
        async (payload: UpdateAtBatPayload): Promise<{ success: boolean; queued: boolean }> => {
            const { at_bat_id, ...updateData } = payload;

            if (isOnline) {
                try {
                    await dispatch(updateAtBat({ id: at_bat_id, data: updateData })).unwrap();
                    return { success: true, queued: false };
                } catch {
                    await queueAction('UPDATE_AT_BAT', payload);
                    dispatch(incrementPendingCount());
                    return { success: false, queued: true };
                }
            } else {
                await queueAction('UPDATE_AT_BAT', payload);
                dispatch(incrementPendingCount());
                return { success: false, queued: true };
            }
        },
        [isOnline, dispatch]
    );

    const recordPlayOffline = useCallback(
        async (payload: RecordPlayPayload): Promise<{ success: boolean; queued: boolean }> => {
            const playData: Partial<Play> = payload;

            if (isOnline) {
                try {
                    await dispatch(recordPlay(playData)).unwrap();
                    return { success: true, queued: false };
                } catch {
                    await queueAction('RECORD_PLAY', playData);
                    dispatch(incrementPendingCount());
                    return { success: false, queued: true };
                }
            } else {
                await queueAction('RECORD_PLAY', playData);
                dispatch(incrementPendingCount());
                return { success: false, queued: true };
            }
        },
        [isOnline, dispatch]
    );

    return {
        isOnline,
        logPitchOffline,
        createAtBatOffline,
        updateAtBatOffline,
        recordPlayOffline,
    };
};
