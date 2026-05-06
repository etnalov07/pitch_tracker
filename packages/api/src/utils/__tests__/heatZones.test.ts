import { HEAT_ZONES, getZoneForPitch, getZoneById } from '../heatZones';

describe('utils/heatZones', () => {
    describe('HEAT_ZONES catalog', () => {
        it('contains 17 zones (9 inside + 8 outer)', () => {
            expect(HEAT_ZONES).toHaveLength(17);
            expect(HEAT_ZONES.filter((z) => z.isInside)).toHaveLength(9);
            expect(HEAT_ZONES.filter((z) => !z.isInside)).toHaveLength(8);
        });
    });

    describe('getZoneForPitch', () => {
        it('places dead-center coordinates in the middle-middle zone', () => {
            expect(getZoneForPitch(0.5, 0.5)).toBe('MM');
        });

        it('returns each corner zone for a representative coordinate', () => {
            expect(getZoneForPitch(0.1, 0.9)).toBe('TL');
            expect(getZoneForPitch(0.9, 0.9)).toBe('TR');
            expect(getZoneForPitch(0.1, 0.1)).toBe('BL');
            expect(getZoneForPitch(0.9, 0.1)).toBe('BR');
        });

        it('routes outer-ring coordinates to the outer zones', () => {
            // Above the strike zone, x in middle band
            expect(getZoneForPitch(0.5, 1.1)).toBe('OT');
            // Far right, y in middle band
            expect(getZoneForPitch(1.1, 0.5)).toBe('OR');
            // Bottom-left corner outside
            expect(getZoneForPitch(-0.1, -0.1)).toBe('OBL');
        });

        it('returns null for a point outside all defined zones', () => {
            // x beyond outer ring
            expect(getZoneForPitch(2.0, 0.5)).toBeNull();
            // y beyond outer ring
            expect(getZoneForPitch(0.5, -1.0)).toBeNull();
        });
    });

    describe('getZoneById', () => {
        it('returns the zone definition for a known id', () => {
            const mm = getZoneById('MM');
            expect(mm?.name).toBe('Middle Middle');
            expect(mm?.isInside).toBe(true);
        });

        it('returns undefined for an unknown id', () => {
            expect(getZoneById('NOT_A_ZONE')).toBeUndefined();
        });
    });
});
