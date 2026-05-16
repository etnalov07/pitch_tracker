// Decoder for the Stalker radar gun's BLE notification packets.
//
// Packet shape (reverse-engineered): fixed-width ASCII, CR (0x0D) terminated.
// Peak velocity sits in a 2-char field. The reverse-engineering notes call this
// "bytes 26-27" using 1-indexed byte numbering — in a 0-indexed array that is
// indices 25-26, which is what PEAK_VELOCITY_OFFSET below refers to.

const CR = 0x0d;

/** 0-indexed start of the 2-char ASCII peak-velocity field (user's 1-indexed "byte 26"). */
export const PEAK_VELOCITY_OFFSET = 25;
export const PEAK_VELOCITY_LENGTH = 2;

const isDigit = (charCode: number): boolean => charCode >= 0x30 && charCode <= 0x39;
const isSpace = (charCode: number): boolean => charCode === 0x20;

/**
 * Parses peak velocity (mph) out of one Stalker BLE notification packet.
 * Returns null for a fragment / malformed / non-numeric packet.
 */
export function parseVelocityFromPacket(bytes: Uint8Array | number[]): number | null {
    const arr = Array.from(bytes);

    // A complete packet is CR-terminated; a fragment without one can't be trusted.
    if (!arr.includes(CR)) return null;
    if (arr.length < PEAK_VELOCITY_OFFSET + PEAK_VELOCITY_LENGTH) return null;

    const field = arr.slice(PEAK_VELOCITY_OFFSET, PEAK_VELOCITY_OFFSET + PEAK_VELOCITY_LENGTH);

    // Each char must be an ASCII digit or a (padding) space.
    if (!field.every((c) => isDigit(c) || isSpace(c))) return null;

    const text = field
        .map((c) => String.fromCharCode(c))
        .join('')
        .trim();
    if (text.length === 0) return null;

    const value = parseInt(text, 10);
    return Number.isFinite(value) ? value : null;
}
