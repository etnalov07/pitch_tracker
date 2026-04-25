import { VALID_POSITIONS } from '../positions';

describe('VALID_POSITIONS', () => {
    it('accepts standard outfield positions', () => {
        expect(VALID_POSITIONS).toContain('LF');
        expect(VALID_POSITIONS).toContain('CF');
        expect(VALID_POSITIONS).toContain('RF');
    });

    it('accepts OF (generic outfield) as a valid position', () => {
        expect(VALID_POSITIONS).toContain('OF');
    });

    it('accepts MIF (middle infield) as a valid position', () => {
        expect(VALID_POSITIONS).toContain('MIF');
    });

    it('accepts INF (infield) as a valid position', () => {
        expect(VALID_POSITIONS).toContain('INF');
    });
});
