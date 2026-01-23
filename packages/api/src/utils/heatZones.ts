// Heat Zone Definitions for Strike Zone Analysis
// Coordinate system: normalized 0-1 for strike zone, with outer zones extending to -0.3 and 1.3

export interface ZoneDefinition {
    id: string;
    name: string;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    isInside: boolean;
}

// 17 zones total: 9 inside (3x3) + 8 outer ring
export const HEAT_ZONES: ZoneDefinition[] = [
    // Inside zones (3x3 grid)
    { id: 'TL', name: 'Top Left', xMin: 0, xMax: 0.33, yMin: 0.67, yMax: 1.0, isInside: true },
    { id: 'TM', name: 'Top Middle', xMin: 0.33, xMax: 0.67, yMin: 0.67, yMax: 1.0, isInside: true },
    { id: 'TR', name: 'Top Right', xMin: 0.67, xMax: 1.0, yMin: 0.67, yMax: 1.0, isInside: true },
    { id: 'ML', name: 'Middle Left', xMin: 0, xMax: 0.33, yMin: 0.33, yMax: 0.67, isInside: true },
    { id: 'MM', name: 'Middle Middle', xMin: 0.33, xMax: 0.67, yMin: 0.33, yMax: 0.67, isInside: true },
    { id: 'MR', name: 'Middle Right', xMin: 0.67, xMax: 1.0, yMin: 0.33, yMax: 0.67, isInside: true },
    { id: 'BL', name: 'Bottom Left', xMin: 0, xMax: 0.33, yMin: 0, yMax: 0.33, isInside: true },
    { id: 'BM', name: 'Bottom Middle', xMin: 0.33, xMax: 0.67, yMin: 0, yMax: 0.33, isInside: true },
    { id: 'BR', name: 'Bottom Right', xMin: 0.67, xMax: 1.0, yMin: 0, yMax: 0.33, isInside: true },
    // Outer zones (ring around strike zone)
    { id: 'OTL', name: 'Outside Top Left', xMin: -0.3, xMax: 0, yMin: 1.0, yMax: 1.3, isInside: false },
    { id: 'OT', name: 'Outside Top', xMin: 0, xMax: 1.0, yMin: 1.0, yMax: 1.3, isInside: false },
    { id: 'OTR', name: 'Outside Top Right', xMin: 1.0, xMax: 1.3, yMin: 1.0, yMax: 1.3, isInside: false },
    { id: 'OL', name: 'Outside Left', xMin: -0.3, xMax: 0, yMin: 0, yMax: 1.0, isInside: false },
    { id: 'OR', name: 'Outside Right', xMin: 1.0, xMax: 1.3, yMin: 0, yMax: 1.0, isInside: false },
    { id: 'OBL', name: 'Outside Bottom Left', xMin: -0.3, xMax: 0, yMin: -0.3, yMax: 0, isInside: false },
    { id: 'OB', name: 'Outside Bottom', xMin: 0, xMax: 1.0, yMin: -0.3, yMax: 0, isInside: false },
    { id: 'OBR', name: 'Outside Bottom Right', xMin: 1.0, xMax: 1.3, yMin: -0.3, yMax: 0, isInside: false },
];

/**
 * Determines which zone a pitch falls into based on its coordinates
 * @param x Normalized x coordinate (0-1 for strike zone)
 * @param y Normalized y coordinate (0-1 for strike zone)
 * @returns Zone ID or null if outside all defined zones
 */
export function getZoneForPitch(x: number, y: number): string | null {
    for (const zone of HEAT_ZONES) {
        if (x >= zone.xMin && x < zone.xMax && y >= zone.yMin && y < zone.yMax) {
            return zone.id;
        }
    }
    return null;
}

/**
 * Gets zone definition by ID
 * @param zoneId Zone identifier
 * @returns ZoneDefinition or undefined if not found
 */
export function getZoneById(zoneId: string): ZoneDefinition | undefined {
    return HEAT_ZONES.find((zone) => zone.id === zoneId);
}
