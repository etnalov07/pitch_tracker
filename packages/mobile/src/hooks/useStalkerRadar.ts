import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../state';
import { RadarDevice, RadarStatus, stalkerRadarService } from '../utils/stalkerRadar/stalkerRadarService';

export interface UseStalkerRadar {
    status: RadarStatus;
    /** Most recent velocity reading (mph), or null if none this session. */
    lastVelocity: number | null;
    /** Timestamp of the last reading — watch this to react to repeat readings of the same value. */
    lastReadingAt: number | null;
    /** Devices discovered by the most recent scan. */
    devices: RadarDevice[];
    scan: () => Promise<void>;
    connect: (deviceId: string) => Promise<void>;
    disconnect: () => Promise<void>;
}

/**
 * Drives the shared StalkerRadarService. The service is a singleton, so every
 * screen calling this hook observes the same connection; auto-connects to the
 * remembered device when radar is enabled in settings.
 */
export function useStalkerRadar(): UseStalkerRadar {
    const radarEnabled = useAppSelector((s) => s.settings.radarEnabled);
    const radarDeviceId = useAppSelector((s) => s.settings.radarDeviceId);

    const [status, setStatus] = useState<RadarStatus>(stalkerRadarService.getStatus());
    const [lastVelocity, setLastVelocity] = useState<number | null>(null);
    const [lastReadingAt, setLastReadingAt] = useState<number | null>(null);
    const [devices, setDevices] = useState<RadarDevice[]>([]);

    useEffect(() => {
        const offStatus = stalkerRadarService.onStatus(setStatus);
        const offVelocity = stalkerRadarService.onVelocity((velocity) => {
            setLastVelocity(velocity);
            setLastReadingAt(Date.now());
        });
        return () => {
            offStatus();
            offVelocity();
        };
    }, []);

    // Auto-connect to the remembered radar when enabled and currently idle.
    useEffect(() => {
        if (radarEnabled && radarDeviceId && stalkerRadarService.getStatus() === 'idle') {
            stalkerRadarService.connect(radarDeviceId).catch(() => {
                /* status surfaces the failure */
            });
        }
    }, [radarEnabled, radarDeviceId]);

    const scan = useCallback(async () => {
        setDevices([]);
        await stalkerRadarService.scan((device) => {
            setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
        });
    }, []);

    const connect = useCallback((deviceId: string) => stalkerRadarService.connect(deviceId), []);
    const disconnect = useCallback(() => stalkerRadarService.disconnect(), []);

    return { status, lastVelocity, lastReadingAt, devices, scan, connect, disconnect };
}
