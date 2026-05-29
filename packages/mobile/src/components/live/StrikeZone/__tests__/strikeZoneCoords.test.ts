import { PITCH_CALL_ZONE_COORDS, PitchCallZone } from '@pitch-tracker/shared';
import { getZoneCoords, getEffectiveSide } from '../strikeZoneCoords';

describe('getZoneCoords', () => {
    // Guards 4db186c (inverted horizontal tap coordinates).
    // The bug: handlePress was reading PITCH_CALL_ZONE_COORDS[zone] directly,
    // bypassing getZoneCoords. As a result, taps on RHH renders landed on the
    // wrong horizontal side of the plate. These tests pin the contract so any
    // future refactor that drops the flip lights up here, not in production.

    it('returns the canonical coords unchanged for LHH', () => {
        for (const zone of Object.keys(PITCH_CALL_ZONE_COORDS) as PitchCallZone[]) {
            expect(getZoneCoords(zone, 'L')).toEqual(PITCH_CALL_ZONE_COORDS[zone]);
        }
    });

    it('mirrors x across 0.5 for RHH and leaves y untouched', () => {
        for (const zone of Object.keys(PITCH_CALL_ZONE_COORDS) as PitchCallZone[]) {
            const raw = PITCH_CALL_ZONE_COORDS[zone];
            const flipped = getZoneCoords(zone, 'R');
            expect(flipped.x).toBeCloseTo(1 - raw.x, 6);
            expect(flipped.y).toBe(raw.y);
        }
    });

    it('places "inside" zones on the batter side for both handednesses', () => {
        // For RHH (catcher view), inside is on the right (high x).
        // For LHH, inside is on the left (low x).
        // The W-in waste zone has canonical x = -0.15 (off-plate left from pitcher view).
        const lhhInside = getZoneCoords('W-in', 'L');
        const rhhInside = getZoneCoords('W-in', 'R');

        expect(lhhInside.x).toBeLessThan(0.5);
        expect(rhhInside.x).toBeGreaterThan(0.5);
    });

    it('keeps the "middle-middle" zone centered for both handednesses', () => {
        // Symmetry sanity check — center is its own mirror.
        expect(getZoneCoords('1-1', 'L').x).toBeCloseTo(0.5, 6);
        expect(getZoneCoords('1-1', 'R').x).toBeCloseTo(0.5, 6);
    });

    it('regression for 4db186c: a tap-resolved zone yields different x for R vs L', () => {
        // Corner zones must not collapse to the same coordinate. If a future
        // change reintroduces raw PITCH_CALL_ZONE_COORDS lookups, both sides
        // would return the same x and this assertion would fail.
        const cornerZones: PitchCallZone[] = ['0-0', '0-2', '2-0', '2-2'];
        for (const zone of cornerZones) {
            const lhh = getZoneCoords(zone, 'L');
            const rhh = getZoneCoords(zone, 'R');
            expect(rhh.x).not.toBeCloseTo(lhh.x, 2);
        }
    });
});

describe('getEffectiveSide', () => {
    // Drives the pitch-call location pre-fill mirroring (the WS pitch_call handler
    // used raw coords, flipping RHH dots after a call was sent/re-sent).
    it('returns the batter side directly for non-switch hitters', () => {
        expect(getEffectiveSide('R', 'R')).toBe('R');
        expect(getEffectiveSide('R', 'L')).toBe('R');
        expect(getEffectiveSide('L', 'R')).toBe('L');
        expect(getEffectiveSide('L', 'L')).toBe('L');
    });

    it('defaults undefined batter side to R (matches StrikeZone)', () => {
        expect(getEffectiveSide(undefined, undefined)).toBe('R');
        expect(getEffectiveSide(undefined, 'L')).toBe('R');
    });

    it('switch hitter takes the platoon side opposite the pitcher hand', () => {
        expect(getEffectiveSide('S', 'R')).toBe('L'); // RHP → bat lefty
        expect(getEffectiveSide('S', 'L')).toBe('R'); // LHP → bat righty
    });
});
