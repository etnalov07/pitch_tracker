import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../state';
import {
    GattEntry,
    RADAR_FEATURE_ENABLED,
    RadarDevice,
    RadarStatus,
    RawPacket,
    stalkerRadarService,
} from '../utils/stalkerRadar/stalkerRadarService';

const MAX_RAW_PACKETS = 25;

export interface UseStalkerRadar {
    status: RadarStatus;
    /** Most recent velocity reading (mph), or null if none this session. */
    lastVelocity: number | null;
    /** Timestamp of the last reading — watch this to react to repeat readings of the same value. */
    lastReadingAt: number | null;
    /** Devices discovered by the most recent scan. */
    devices: RadarDevice[];
    scan: () => Promise<void>;
    /** Diagnostic: unfiltered scan that lists every nearby BLE peripheral with its advertised services. */
    scanAll: () => Promise<void>;
    /** Distinct raw payloads captured by startRawCapture (newest first, consecutive duplicates collapsed). */
    rawPackets: RawPacket[];
    /** GATT table from the last capture: every characteristic and its properties. */
    gatt: GattEntry[];
    /** Diagnostic: discover the GATT table, subscribe to notify chars, and read readable chars. */
    startRawCapture: () => Promise<void>;
    /** Re-read every readable characteristic — call after a pitch to sample poll-only data. */
    refreshReads: () => Promise<void>;
    /** Serialize the last raw-capture session (GATT + all frames) as shareable text. */
    getCaptureText: () => string;
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
    const [rawPackets, setRawPackets] = useState<RawPacket[]>([]);
    const [gatt, setGatt] = useState<GattEntry[]>([]);

    useEffect(() => {
        const offStatus = stalkerRadarService.onStatus(setStatus);
        const offVelocity = stalkerRadarService.onVelocity((velocity) => {
            setLastVelocity(velocity);
            setLastReadingAt(Date.now());
        });
        const offRaw = stalkerRadarService.onRaw((packet) => {
            setRawPackets((prev) => {
                // Collapse consecutive identical frames so a steady idle-frame
                // stream can't flush a transient pitch frame out of the buffer.
                if (prev[0] && prev[0].hex === packet.hex && prev[0].charUuid === packet.charUuid) return prev;
                return [packet, ...prev].slice(0, MAX_RAW_PACKETS);
            });
        });
        const offGatt = stalkerRadarService.onGatt(setGatt);
        return () => {
            offStatus();
            offVelocity();
            offRaw();
            offGatt();
        };
    }, []);

    // Auto-connect to the remembered radar when enabled and currently idle.
    useEffect(() => {
        if (!RADAR_FEATURE_ENABLED) return;
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

    const scanAll = useCallback(async () => {
        setDevices([]);
        await stalkerRadarService.scanAll((device) => {
            setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
        });
    }, []);

    const startRawCapture = useCallback(async () => {
        setRawPackets([]);
        await stalkerRadarService.startRawCapture();
    }, []);

    const refreshReads = useCallback(() => stalkerRadarService.refreshReads(), []);

    const getCaptureText = useCallback(() => stalkerRadarService.buildCaptureText(), []);

    const connect = useCallback((deviceId: string) => stalkerRadarService.connect(deviceId), []);
    const disconnect = useCallback(() => stalkerRadarService.disconnect(), []);

    return {
        status,
        lastVelocity,
        lastReadingAt,
        devices,
        scan,
        scanAll,
        rawPackets,
        gatt,
        startRawCapture,
        refreshReads,
        getCaptureText,
        connect,
        disconnect,
    };
}
