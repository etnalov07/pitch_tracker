import { PitchCallZone, PITCH_CALL_ZONE_COORDS } from '@pitch-tracker/shared';

// Pitcher's-view canonical coordinates have x=0 on the catcher's left.
// For RHH we mirror so "inside" stays on the batter's side of the plate;
// for LHH the canonical coords already place inside on the correct side.
export function getZoneCoords(zone: PitchCallZone, effectiveSide: 'R' | 'L'): { x: number; y: number } {
    const coords = PITCH_CALL_ZONE_COORDS[zone];
    if (effectiveSide === 'R') {
        return { x: 1 - coords.x, y: coords.y };
    }
    return coords;
}
