// Serializes a raw BLE capture session (GATT table + every notification/read
// frame) into a plain-text log that can be written to a file and shared. Kept as
// a pure function — no device/file deps — so it's unit-testable and the service
// just feeds it its captured state.

import type { GattEntry, RawPacket } from './stalkerRadarService';

export interface CaptureLogInput {
    deviceName: string | null;
    deviceId: string | null;
    serviceUuid: string;
    velocityCharUuid: string;
    /** ISO timestamp for when the log was exported. */
    capturedAtIso: string;
    gatt: GattEntry[];
    frames: RawPacket[];
}

const gattFlags = (g: GattEntry): string =>
    `${g.notifiable ? 'N' : '-'}${g.indicatable ? 'I' : '-'}${g.readable ? 'R' : '-'}${g.writable ? 'W' : '-'}`;

/**
 * Build the shareable capture text. Layout is optimized for reverse-engineering
 * a non-velocity (e.g. spin) characteristic: the GATT table lists every
 * characteristic with its properties, and each frame line carries the epoch
 * timestamp + source + char UUID + length + hex + ascii so frames can be
 * correlated across characteristics and against the gun's on-screen readout.
 */
export function formatCaptureLog(input: CaptureLogInput): string {
    const lines: string[] = [];
    lines.push('=== Stalker Pro 3s raw BLE capture ===');
    lines.push(`device:        ${input.deviceName ?? 'unknown'} (${input.deviceId ?? '-'})`);
    lines.push(`service UUID:  ${input.serviceUuid}`);
    lines.push(`velocity char: ${input.velocityCharUuid}`);
    lines.push(`captured:      ${input.capturedAtIso}`);
    lines.push(`frames:        ${input.frames.length}`);
    lines.push('');
    lines.push(`--- GATT table (${input.gatt.length} characteristics; flags = Notify/Indicate/Read/Write) ---`);
    if (input.gatt.length === 0) {
        lines.push('(none captured — tap "Capture raw packets" while connected first)');
    } else {
        for (const g of input.gatt) {
            lines.push(`${g.charUuid}  ${gattFlags(g)}  svc=${g.serviceUuid}`);
        }
    }
    lines.push('');
    lines.push('--- frames (epoch_ms  source  char  len  hex  | ascii) ---');
    if (input.frames.length === 0) {
        lines.push('(no frames captured)');
    } else {
        for (const p of input.frames) {
            lines.push(`${p.at}  ${p.source}  ${p.charUuid}  ${p.bytes.length}B  ${p.hex}  | ${p.ascii}`);
        }
    }
    return lines.join('\n');
}
