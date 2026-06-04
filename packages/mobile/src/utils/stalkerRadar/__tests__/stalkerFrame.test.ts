import { decodeReading, parseFrame, PitchDetector, SpeedReading, StalkerSpeedStream } from '../stalkerPacket';

// The two real packets captured during reverse-engineering (also used by
// stalkerPacket.test.ts). Their '5'/'6' block-ID markers do NOT sit on the
// documented 15-byte grid, so the bE block decode finds no speed and the hybrid
// decoder falls back to the fixed-offset peak field (bytes 26/27 -> "72"/"85").
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

// A clean bE frame on the documented grid: two speed blocks (live '4', peak '5')
// starting at offset 7 with a 15-byte stride and tenths resolution.
//   block0 @7  : '4' inbound, "78.0"
//   block1 @22 : '5'          "79.4"
const D = (c: string) => c.charCodeAt(0);
const SP = 0x20;
// prettier-ignore
const CLEAN_BE_FRAME = [
    0x88, SP, SP, SP, SP, SP, D('2'),                       // header, numSpeeds=2
    D('4'), 0x42, SP, D('7'), D('8'), D('0'), SP, SP, SP, SP, SP, SP, SP, SP, SP, // live block @7..21
    D('5'), SP, SP, D('7'), D('9'), D('4'), SP, SP, SP, SP, SP, SP, SP, SP, SP,   // peak block @22..36
];

describe('parseFrame (bE block grid)', () => {
    it('decodes live + peak with tenths from a clean bE frame', () => {
        const r = parseFrame(CLEAN_BE_FRAME);
        expect(r).not.toBeNull();
        expect(r!.live).toBe(78);
        expect(r!.peak).toBe(79.4);
        expect(r!.inbound).toBe(true);
    });

    it('returns null when the frame is not a bE frame (wrong message type)', () => {
        expect(parseFrame([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x32])).toBeNull();
    });

    it('returns a structural reading with null speeds for the off-grid captures', () => {
        const r = parseFrame(PACKET_72);
        expect(r).not.toBeNull();
        expect(r!.peak).toBeNull();
        expect(r!.live).toBeNull();
    });
});

describe('decodeReading (hybrid bE + fixed-offset fallback)', () => {
    it('uses the bE grid when a numeric block is present', () => {
        expect(decodeReading(CLEAN_BE_FRAME)?.peak).toBe(79.4);
    });

    it('falls back to the fixed-offset peak for the real captured packets', () => {
        expect(decodeReading(PACKET_72)?.peak).toBe(72);
        expect(decodeReading(PACKET_85)?.peak).toBe(85);
    });

    it('works on a CR-stripped buffer (as the stream delivers it)', () => {
        expect(decodeReading(PACKET_85.slice(0, -1))?.peak).toBe(85);
    });

    it('returns null when no speed can be decoded', () => {
        expect(decodeReading([0x88, 0x20, 0x20, 0x20, 0x20, 0x20, 0x31])).toBeNull();
    });
});

describe('StalkerSpeedStream', () => {
    it('emits one reading per CR-terminated frame', () => {
        const readings: SpeedReading[] = [];
        const stream = new StalkerSpeedStream();
        stream.onReading = (r) => readings.push(r);
        stream.push(PACKET_85);
        expect(readings).toHaveLength(1);
        expect(readings[0].peak).toBe(85);
    });

    it('reassembles a frame split across two notifications', () => {
        const readings: SpeedReading[] = [];
        const stream = new StalkerSpeedStream();
        stream.onReading = (r) => readings.push(r);
        // Split mid-frame; the CR arrives only in the second chunk.
        stream.push(PACKET_72.slice(0, 20));
        expect(readings).toHaveLength(0);
        stream.push(PACKET_72.slice(20));
        expect(readings).toHaveLength(1);
        expect(readings[0].peak).toBe(72);
    });

    it('does not emit for a fragment with no trailing CR', () => {
        const readings: SpeedReading[] = [];
        const stream = new StalkerSpeedStream();
        stream.onReading = (r) => readings.push(r);
        stream.push(PACKET_85.slice(0, -1)); // drop the CR
        expect(readings).toHaveLength(0);
    });

    it('batches two frames in a single push into two readings', () => {
        const readings: SpeedReading[] = [];
        const stream = new StalkerSpeedStream();
        stream.onReading = (r) => readings.push(r);
        stream.push([...PACKET_72, ...PACKET_85]);
        expect(readings.map((r) => r.peak)).toEqual([72, 85]);
    });
});

describe('PitchDetector', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const reading = (peak: number): SpeedReading => ({ live: null, peak, hit: null, inbound: false });

    it('holds the max across a rising sequence and emits once after the quiet gap', () => {
        const pitches: number[] = [];
        const detector = new PitchDetector({ quietMs: 700, minMph: 30 });
        detector.onPitch = (mph) => pitches.push(mph);

        detector.feed(reading(55));
        detector.feed(reading(78));
        detector.feed(reading(72)); // lower — peak should stay 78
        expect(pitches).toHaveLength(0); // still within the active window

        jest.advanceTimersByTime(700);
        expect(pitches).toEqual([78]);
    });

    it('ignores readings below minMph', () => {
        const pitches: number[] = [];
        const detector = new PitchDetector({ quietMs: 700, minMph: 30 });
        detector.onPitch = (mph) => pitches.push(mph);

        detector.feed(reading(12));
        jest.advanceTimersByTime(700);
        expect(pitches).toHaveLength(0);
    });

    it('emits separate peaks for two pitches separated by a quiet gap', () => {
        const pitches: number[] = [];
        const detector = new PitchDetector({ quietMs: 700, minMph: 30 });
        detector.onPitch = (mph) => pitches.push(mph);

        detector.feed(reading(80));
        jest.advanceTimersByTime(700);
        detector.feed(reading(91));
        jest.advanceTimersByTime(700);
        expect(pitches).toEqual([80, 91]);
    });

    it('dispose() cancels a pending emit', () => {
        const pitches: number[] = [];
        const detector = new PitchDetector({ quietMs: 700, minMph: 30 });
        detector.onPitch = (mph) => pitches.push(mph);

        detector.feed(reading(88));
        detector.dispose();
        jest.advanceTimersByTime(700);
        expect(pitches).toHaveLength(0);
    });
});
