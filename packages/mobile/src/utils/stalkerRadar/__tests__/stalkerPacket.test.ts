import { parseVelocityFromPacket } from '../stalkerPacket';

// The two real packets captured during reverse-engineering. They differ only at
// the 1-indexed bytes 9, 19-20, and 26-27; bytes 26-27 are the peak velocity.
// prettier-ignore
const PACKET_72 = [
    0x88, 0x42, 0x44, 0x20, 0x20, 0x20, 0x33, 0x34, 0x43, 0x20, 0x20, 0x20,
    0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x35, 0x47, 0x20, 0x20, 0x20, 0x20,
    0x20, 0x37, 0x32, 0x20, 0x20, 0x20, 0x20, 0x20, 0x36, 0x41, 0x20, 0x20,
    0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x0d,
];
// prettier-ignore
const PACKET_85 = [
    0x88, 0x42, 0x44, 0x20, 0x20, 0x20, 0x33, 0x34, 0x41, 0x20, 0x20, 0x20,
    0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x35, 0x41, 0x20, 0x20, 0x20, 0x20,
    0x20, 0x38, 0x35, 0x20, 0x20, 0x20, 0x20, 0x20, 0x36, 0x41, 0x20, 0x20,
    0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x0d,
];

describe('parseVelocityFromPacket', () => {
    it('decodes peak velocity from the two real captured packets', () => {
        expect(parseVelocityFromPacket(PACKET_72)).toBe(72);
        expect(parseVelocityFromPacket(PACKET_85)).toBe(85);
    });

    it('accepts a Uint8Array', () => {
        expect(parseVelocityFromPacket(Uint8Array.from(PACKET_85))).toBe(85);
    });

    it('returns null for a packet with no CR terminator (fragment)', () => {
        expect(parseVelocityFromPacket(PACKET_85.slice(0, -1))).toBeNull();
    });

    it('returns null for a too-short packet', () => {
        expect(parseVelocityFromPacket([0x88, 0x42, 0x0d])).toBeNull();
    });

    it('returns null when the velocity field is not numeric', () => {
        const bad = [...PACKET_85];
        bad[25] = 0x58; // 'X'
        expect(parseVelocityFromPacket(bad)).toBeNull();
    });

    it('returns null when the velocity field is all spaces', () => {
        const blank = [...PACKET_85];
        blank[25] = 0x20;
        blank[26] = 0x20;
        expect(parseVelocityFromPacket(blank)).toBeNull();
    });

    it('parses a space-padded single-digit reading', () => {
        const padded = [...PACKET_85];
        padded[25] = 0x20; // ' '
        padded[26] = 0x39; // '9'
        expect(parseVelocityFromPacket(padded)).toBe(9);
    });
});
