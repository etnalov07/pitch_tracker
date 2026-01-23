import { HeatZoneData } from '@pitch-tracker/shared';
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

interface UseHeatZonesResult {
    zones: HeatZoneData[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useHeatZones(pitcherId: string | undefined, gameId?: string, pitchType?: string): UseHeatZonesResult {
    const [zones, setZones] = useState<HeatZoneData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHeatZones = useCallback(async () => {
        if (!pitcherId) {
            setZones([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (gameId) {
                params.append('gameId', gameId);
            }
            if (pitchType) {
                params.append('pitchType', pitchType);
            }

            const queryString = params.toString();
            const url = `/analytics/pitcher/${pitcherId}/heat-zones${queryString ? `?${queryString}` : ''}`;

            const response = await api.get<{ heatZones: HeatZoneData[] }>(url);
            setZones(response.data.heatZones);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load heat zones');
            setZones([]);
        } finally {
            setLoading(false);
        }
    }, [pitcherId, gameId, pitchType]);

    useEffect(() => {
        fetchHeatZones();
    }, [fetchHeatZones]);

    return {
        zones,
        loading,
        error,
        refetch: fetchHeatZones,
    };
}

export default useHeatZones;
