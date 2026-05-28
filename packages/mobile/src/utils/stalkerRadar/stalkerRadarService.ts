import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { parseVelocityFromPacket } from './stalkerPacket';

// Reverse-engineered Stalker radar BLE identifiers.
export const STALKER_SERVICE_UUID = '4880C12C-FDCB-4077-8920-A450D7F9B907';
export const STALKER_CHARACTERISTIC_UUID = 'FEC26EC4-6D71-4442-9F81-55BC21D658D6';

export type RadarStatus = 'idle' | 'scanning' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RadarDevice {
    id: string;
    name: string | null;
    // Only populated by scanAll() — used by the Settings "Diagnose" affordance to
    // surface what nearby BLE peripherals are actually advertising, so we can
    // confirm whether a given Pro3S unit matches STALKER_SERVICE_UUID.
    localName?: string | null;
    serviceUUIDs?: string[] | null;
}

/** A single raw BLE notification, captured for protocol reverse-engineering. */
export interface RawPacket {
    serviceUuid: string;
    charUuid: string;
    bytes: number[];
    /** Space-separated 2-digit hex, e.g. "37 32 0d". */
    hex: string;
    /** Printable ASCII rendering; non-printable bytes shown as ".". */
    ascii: string;
    at: number;
}

type StatusListener = (status: RadarStatus) => void;
type VelocityListener = (velocity: number) => void;
type RawListener = (packet: RawPacket) => void;

const SCAN_DURATION_MS = 12000;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1500;

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Characteristic values from react-native-ble-plx arrive base64-encoded. Decode
// inline to avoid pulling in a Buffer polyfill.
function base64ToBytes(b64: string): Uint8Array {
    const clean = b64.replace(/=+$/, '');
    const out: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (const ch of clean) {
        const idx = B64_ALPHABET.indexOf(ch);
        if (idx === -1) continue;
        buffer = (buffer << 6) | idx;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out.push((buffer >> bits) & 0xff);
        }
    }
    return Uint8Array.from(out);
}

function bytesToHex(bytes: number[]): string {
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

function bytesToAscii(bytes: number[]): string {
    return bytes.map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')).join('');
}

class StalkerRadarService {
    private manager: BleManager | null = null;
    private device: Device | null = null;
    private monitorSub: Subscription | null = null;
    private disconnectSub: Subscription | null = null;
    private status: RadarStatus = 'idle';
    private statusListeners = new Set<StatusListener>();
    private velocityListeners = new Set<VelocityListener>();
    private rawListeners = new Set<RawListener>();
    private rawSubs: Subscription[] = [];
    private intentionalDisconnect = false;
    private reconnectAttempts = 0;

    // Lazy so merely importing this module doesn't construct the native manager
    // (it would throw before the dev client is rebuilt with the BLE module).
    private getManager(): BleManager {
        if (!this.manager) this.manager = new BleManager();
        return this.manager;
    }

    getStatus(): RadarStatus {
        return this.status;
    }

    onStatus(listener: StatusListener): () => void {
        this.statusListeners.add(listener);
        return () => this.statusListeners.delete(listener);
    }

    onVelocity(listener: VelocityListener): () => void {
        this.velocityListeners.add(listener);
        return () => this.velocityListeners.delete(listener);
    }

    onRaw(listener: RawListener): () => void {
        this.rawListeners.add(listener);
        return () => this.rawListeners.delete(listener);
    }

    private setStatus(status: RadarStatus): void {
        this.status = status;
        this.statusListeners.forEach((l) => l(status));
    }

    private emitVelocity(velocity: number): void {
        this.velocityListeners.forEach((l) => l(velocity));
    }

    private emitRaw(packet: RawPacket): void {
        this.rawListeners.forEach((l) => l(packet));
    }

    /** Android runtime permissions. iOS prompts automatically on first scan. */
    async requestPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;
        const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
        const perms =
            apiLevel >= 31
                ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
                : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        const result = await PermissionsAndroid.requestMultiple(perms);
        return perms.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
    }

    /** Scans for devices advertising the Stalker service. Auto-stops after SCAN_DURATION_MS. */
    async scan(onFound: (device: RadarDevice) => void): Promise<void> {
        const granted = await this.requestPermissions();
        if (!granted) {
            this.setStatus('error');
            throw new Error('Bluetooth permission denied');
        }
        const manager = this.getManager();
        this.setStatus('scanning');
        const seen = new Set<string>();
        manager.startDeviceScan([STALKER_SERVICE_UUID], null, (error, device) => {
            if (error) {
                this.setStatus('error');
                return;
            }
            if (device && !seen.has(device.id)) {
                seen.add(device.id);
                onFound({ id: device.id, name: device.name ?? device.localName ?? null });
            }
        });
        setTimeout(() => this.stopScan(), SCAN_DURATION_MS);
    }

    stopScan(): void {
        this.manager?.stopDeviceScan();
        if (this.status === 'scanning') this.setStatus(this.device ? 'connected' : 'idle');
    }

    /**
     * Diagnostic: scan with NO service-UUID filter and surface every nearby BLE
     * peripheral, including its advertised serviceUUIDs and localName. Lets us
     * tell whether a Pro3S unit is broadcasting at all (and under what UUID)
     * when the production-path scan() — which filters by STALKER_SERVICE_UUID —
     * comes back empty.
     */
    async scanAll(onFound: (device: RadarDevice) => void): Promise<void> {
        const granted = await this.requestPermissions();
        if (!granted) {
            this.setStatus('error');
            throw new Error('Bluetooth permission denied');
        }
        const manager = this.getManager();
        this.setStatus('scanning');
        const seen = new Set<string>();
        manager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                this.setStatus('error');
                return;
            }
            if (device && !seen.has(device.id)) {
                seen.add(device.id);
                const radarDevice: RadarDevice = {
                    id: device.id,
                    name: device.name ?? null,
                    localName: device.localName ?? null,
                    serviceUUIDs: device.serviceUUIDs ?? null,
                };
                // Log so a developer attached via Xcode/Metro can grep the full
                // record — the UI only renders a short subset.
                console.log('[stalker-diagnose]', JSON.stringify(radarDevice));
                onFound(radarDevice);
            }
        });
        setTimeout(() => this.stopScan(), SCAN_DURATION_MS);
    }

    /**
     * Diagnostic: on the currently-connected device, dump the full GATT table to
     * the console and subscribe to EVERY notifiable/indicatable characteristic,
     * emitting each notification as a RawPacket (hex + ASCII). This is how we
     * locate the mph and spin-rate fields for a Pro3S whose packet layout we
     * don't yet know — throw pitches, read the bytes, then write the parser.
     */
    async startRawCapture(): Promise<void> {
        const device = this.device;
        if (!device) throw new Error('Connect to the radar before capturing packets');

        // Drop any prior raw subscriptions so repeated taps don't stack duplicates.
        this.stopRawCapture();

        const services = await device.services();
        for (const service of services) {
            const chars = await service.characteristics();
            for (const char of chars) {
                console.log(
                    `[stalker-gatt] svc=${service.uuid} char=${char.uuid} ` +
                        `notify=${char.isNotifiable} indicate=${char.isIndicatable} read=${char.isReadable}`
                );
                if (!char.isNotifiable && !char.isIndicatable) continue;
                try {
                    const sub = device.monitorCharacteristicForService(service.uuid, char.uuid, (error, characteristic) => {
                        if (error || !characteristic?.value) return;
                        const bytes = Array.from(base64ToBytes(characteristic.value));
                        const packet: RawPacket = {
                            serviceUuid: service.uuid,
                            charUuid: char.uuid,
                            bytes,
                            hex: bytesToHex(bytes),
                            ascii: bytesToAscii(bytes),
                            at: Date.now(),
                        };
                        console.log(
                            `[stalker-raw] char=${char.uuid} len=${bytes.length} hex=[${packet.hex}] ascii="${packet.ascii}"`
                        );
                        this.emitRaw(packet);
                    });
                    this.rawSubs.push(sub);
                } catch {
                    /* characteristic refused a subscription — skip it */
                }
            }
        }
    }

    stopRawCapture(): void {
        this.rawSubs.forEach((s) => s.remove());
        this.rawSubs = [];
    }

    async connect(deviceId: string): Promise<void> {
        const granted = await this.requestPermissions();
        if (!granted) {
            this.setStatus('error');
            throw new Error('Bluetooth permission denied');
        }
        const manager = this.getManager();
        this.stopScan();
        this.intentionalDisconnect = false;
        this.setStatus('connecting');
        try {
            const device = await manager.connectToDevice(deviceId);
            await device.discoverAllServicesAndCharacteristics();
            this.device = device;
            this.reconnectAttempts = 0;

            this.monitorSub = device.monitorCharacteristicForService(
                STALKER_SERVICE_UUID,
                STALKER_CHARACTERISTIC_UUID,
                (error, characteristic) => {
                    if (error || !characteristic?.value) return;
                    const velocity = parseVelocityFromPacket(base64ToBytes(characteristic.value));
                    if (velocity != null) this.emitVelocity(velocity);
                }
            );

            this.disconnectSub = manager.onDeviceDisconnected(deviceId, () => {
                this.monitorSub?.remove();
                this.monitorSub = null;
                this.stopRawCapture();
                this.device = null;
                if (this.intentionalDisconnect) {
                    this.setStatus('disconnected');
                } else {
                    this.setStatus('disconnected');
                    this.attemptReconnect(deviceId);
                }
            });

            this.setStatus('connected');
        } catch {
            this.setStatus('error');
            throw new Error('Failed to connect to radar');
        }
    }

    private attemptReconnect(deviceId: string): void {
        if (this.intentionalDisconnect || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
        this.reconnectAttempts += 1;
        setTimeout(() => {
            if (this.intentionalDisconnect) return;
            this.connect(deviceId).catch(() => {
                /* attemptReconnect re-fires via the disconnect handler */
            });
        }, RECONNECT_DELAY_MS);
    }

    async disconnect(): Promise<void> {
        this.intentionalDisconnect = true;
        this.reconnectAttempts = 0;
        this.stopRawCapture();
        this.monitorSub?.remove();
        this.monitorSub = null;
        this.disconnectSub?.remove();
        this.disconnectSub = null;
        const id = this.device?.id;
        this.device = null;
        if (id) {
            try {
                await this.getManager().cancelDeviceConnection(id);
            } catch {
                /* already gone */
            }
        }
        this.setStatus('idle');
    }
}

export const stalkerRadarService = new StalkerRadarService();
