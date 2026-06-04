import { CaptureLogInput, formatCaptureLog } from '../captureLog';

const baseInput = (): CaptureLogInput => ({
    deviceName: 'Stalker Pro 3s',
    deviceId: 'AA:BB:CC',
    serviceUuid: '4880C12C-FDCB-4077-8920-A450D7F9B907',
    velocityCharUuid: 'FEC26EC4-6D71-4442-9F81-55BC21D658D6',
    capturedAtIso: '2026-06-04T18:00:00.000Z',
    gatt: [
        {
            serviceUuid: '4880C12C-FDCB-4077-8920-A450D7F9B907',
            charUuid: 'FEC26EC4-6D71-4442-9F81-55BC21D658D6',
            notifiable: true,
            indicatable: false,
            readable: true,
            writable: false,
        },
        {
            serviceUuid: '4880C12C-FDCB-4077-8920-A450D7F9B907',
            charUuid: 'ABCD1234-0000-0000-0000-000000000000',
            notifiable: true,
            indicatable: false,
            readable: false,
            writable: true,
        },
    ],
    frames: [
        { serviceUuid: 's', charUuid: 'FEC26EC4', bytes: [0x88, 0x0d], hex: '88 0d', ascii: '..', source: 'notify', at: 1000 },
        { serviceUuid: 's', charUuid: 'ABCD1234', bytes: [0x37, 0x32], hex: '37 32', ascii: '72', source: 'read', at: 1100 },
    ],
});

describe('formatCaptureLog', () => {
    it('includes the header, device, and both UUIDs', () => {
        const out = formatCaptureLog(baseInput());
        expect(out).toContain('Stalker Pro 3s raw BLE capture');
        expect(out).toContain('Stalker Pro 3s (AA:BB:CC)');
        expect(out).toContain('FEC26EC4-6D71-4442-9F81-55BC21D658D6');
        expect(out).toContain('frames:        2');
    });

    it('renders the GATT table with N/I/R/W flags', () => {
        const out = formatCaptureLog(baseInput());
        expect(out).toContain('FEC26EC4-6D71-4442-9F81-55BC21D658D6  NIRW'.replace('NIRW', 'N-R-'));
        expect(out).toContain('ABCD1234-0000-0000-0000-000000000000  N--W');
    });

    it('renders one line per frame with epoch, source, char, hex and ascii', () => {
        const out = formatCaptureLog(baseInput());
        expect(out).toContain('1000  notify  FEC26EC4  2B  88 0d  | ..');
        expect(out).toContain('1100  read  ABCD1234  2B  37 32  | 72');
    });

    it('handles an empty capture gracefully', () => {
        const out = formatCaptureLog({ ...baseInput(), gatt: [], frames: [] });
        expect(out).toContain('frames:        0');
        expect(out).toContain('Capture raw packets');
        expect(out).toContain('(no frames captured)');
    });
});
