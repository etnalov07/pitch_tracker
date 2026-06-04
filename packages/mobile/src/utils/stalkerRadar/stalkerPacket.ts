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
 * Extracts the peak velocity from the fixed 2-char field, WITHOUT requiring a CR
 * terminator. Used by the bE fallback path, where frame reassembly has already
 * guaranteed completeness and stripped the CR. Returns null when the field is
 * out of range, non-numeric, or blank.
 */
function peakFromFixedOffset(arr: number[]): number | null {
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

/**
 * Parses peak velocity (mph) out of one Stalker BLE notification packet.
 * Returns null for a fragment / malformed / non-numeric packet.
 */
export function parseVelocityFromPacket(bytes: Uint8Array | number[]): number | null {
    const arr = Array.from(bytes);

    // A complete packet is CR-terminated; a fragment without one can't be trusted.
    if (!arr.includes(CR)) return null;
    return peakFromFixedOffset(arr);
}

// -----------------------------------------------------------------------------
// bE-frame decoder (Stalker Pro II "Data Communications and Formats", bE format)
// -----------------------------------------------------------------------------
// The fixed-offset parser above only reads a single 2-char peak field and ints.
// The real bE frame carries up to three speed blocks (live/peak/hit) at tenths
// resolution. We decode that richer structure when it's present, and fall back
// to the fixed-offset reading when a frame doesn't sit on the documented grid
// (e.g. the reverse-engineered idle/peak captures whose '5' marker is off-grid).
//
// Frame layout:
//   [0]     0x88                  message type
//   [6]     number of speeds      ASCII '1'..'3'
//   then N x 15-byte speed blocks starting at offset 7:
//     blk[0]  speed ID            '4' live, '5' peak, '6' hit
//     blk[1]  zone status         bit1 = inbound(1)/outbound(0)
//     blk[2..4] hundreds/tens/ones digit (ASCII, space-padded)
//     blk[5]  tenths digit
//   <CR> (0x0D) terminates the frame.

const MSG_TYPE = 0x88;
const ASCII_0 = 0x30;
const SPEED_BLOCK_SIZE = 15;
const SPEED_BLOCK_START = 7;

export interface SpeedReading {
    live: number | null; // '4' block
    peak: number | null; // '5' block (present when peak speed is enabled on the gun)
    hit: number | null; //  '6' block
    inbound: boolean; //    zone-status direction bit of the live block
}

const digitOrEmpty = (charCode: number): string => (isDigit(charCode) ? String.fromCharCode(charCode) : '');

/** Parse one 15-byte speed block starting at `off`. */
function parseSpeedBlock(bytes: number[], off: number): { id: string; mph: number | null; inbound: boolean } {
    const id = String.fromCharCode(bytes[off]);
    const inbound = (bytes[off + 1] & 0b10) !== 0;
    let text = digitOrEmpty(bytes[off + 2]) + digitOrEmpty(bytes[off + 3]) + digitOrEmpty(bytes[off + 4]);
    const tenths = bytes[off + 5];
    if (isDigit(tenths)) text = text + '.' + String.fromCharCode(tenths);
    const mph = text.length ? parseFloat(text) : NaN;
    return { id, mph: Number.isNaN(mph) ? null : mph, inbound };
}

/**
 * Decode a complete bE frame into a SpeedReading using the documented 15-byte
 * block grid. Returns null when the frame isn't a bE frame at all; returns a
 * reading with all-null speeds when it's structurally a bE frame but no block
 * landed a numeric speed (the caller then tries the fixed-offset fallback).
 */
export function parseFrame(input: Uint8Array | number[]): SpeedReading | null {
    const frame = Array.from(input);
    if (frame.length < SPEED_BLOCK_START || frame[0] !== MSG_TYPE) return null;
    const numSpeeds = frame[6] - ASCII_0;
    if (numSpeeds < 1 || numSpeeds > 3) return null;

    const reading: SpeedReading = { live: null, peak: null, hit: null, inbound: false };
    for (let i = 0; i < numSpeeds; i++) {
        const off = SPEED_BLOCK_START + i * SPEED_BLOCK_SIZE;
        if (off + 5 >= frame.length) break;
        const blk = parseSpeedBlock(frame, off);
        if (blk.id === '4') {
            reading.live = blk.mph;
            reading.inbound = blk.inbound;
        } else if (blk.id === '5') {
            reading.peak = blk.mph;
        } else if (blk.id === '6') {
            reading.hit = blk.mph;
        }
    }
    return reading;
}

const usableSpeed = (r: SpeedReading): number | null => r.peak ?? r.live ?? r.hit;

/**
 * Hybrid decode of one CR-delimited frame:
 *   1. Try the documented bE block grid (`parseFrame`).
 *   2. If that yields no numeric speed, fall back to the fixed-offset peak field
 *      (`parseVelocityFromPacket`) so the reverse-engineered captures still decode.
 * Returns null only when neither path finds a speed.
 */
export function decodeReading(input: Uint8Array | number[]): SpeedReading | null {
    const frame = Array.from(input);
    const be = parseFrame(frame);
    if (be && usableSpeed(be) != null) return be;

    const fallback = peakFromFixedOffset(frame);
    if (fallback != null) {
        return { live: null, peak: fallback, hit: null, inbound: be?.inbound ?? false };
    }
    return null;
}

// -----------------------------------------------------------------------------
// Notification reassembler
// -----------------------------------------------------------------------------
// BLE notifications can split or batch frames, so buffer raw bytes and emit one
// SpeedReading per CR-terminated frame. The service base64-decodes before
// pushing, so this operates on raw byte arrays.
export class StalkerSpeedStream {
    private buf: number[] = [];
    onReading: ((reading: SpeedReading) => void) | null = null;

    push(bytes: Uint8Array | number[]): void {
        for (const byte of bytes) {
            if (byte === CR) {
                if (this.buf.length) {
                    const reading = decodeReading(this.buf);
                    if (reading && this.onReading) this.onReading(reading);
                }
                this.buf = [];
            } else {
                this.buf.push(byte);
                if (this.buf.length > 256) this.buf = []; // guard against a lost CR
            }
        }
    }

    reset(): void {
        this.buf = [];
    }
}

// -----------------------------------------------------------------------------
// Pitch detector
// -----------------------------------------------------------------------------
// The gun streams continuously (up to ~25 msgs/sec, plus an idle refresh every
// 1/3 s). One pitch = speed climbs above a threshold, peaks, then goes quiet. We
// hold the max while motion continues and emit it once after a quiet gap.
export type PitchHandler = (mph: number, reading: SpeedReading) => void;

export interface PitchDetectorOptions {
    minMph?: number; //  ignore noise / warm-up below this (default 30)
    quietMs?: number; // gap with no qualifying reading that ends a pitch (default 700)
}

export class PitchDetector {
    private candidate = 0;
    private lastReading: SpeedReading | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private readonly minMph: number;
    private readonly quietMs: number;
    onPitch: PitchHandler | null = null;

    constructor(opts: PitchDetectorOptions = {}) {
        this.minMph = opts.minMph ?? 30;
        this.quietMs = opts.quietMs ?? 700;
    }

    feed(reading: SpeedReading): void {
        // Prefer the gun's own peak; fall back to live / hit speed.
        const mph = reading.peak ?? reading.live ?? reading.hit;
        if (mph != null && mph >= this.minMph) {
            if (mph > this.candidate) {
                this.candidate = mph;
                this.lastReading = reading;
            }
            this.arm();
        }
    }

    private arm(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.flush(), this.quietMs);
    }

    private flush(): void {
        if (this.candidate >= this.minMph && this.lastReading && this.onPitch) {
            this.onPitch(this.candidate, this.lastReading);
        }
        this.candidate = 0;
        this.lastReading = null;
        this.timer = null;
    }

    dispose(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.candidate = 0;
        this.lastReading = null;
    }
}
