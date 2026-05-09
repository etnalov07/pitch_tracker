import { describeBaserunnerEvent, BaserunnerEvent } from '@pitch-tracker/shared';

function makeEvent(overrides: Partial<BaserunnerEvent>): BaserunnerEvent {
    return {
        id: 'evt-1',
        game_id: 'game-1',
        inning_id: 'inning-1',
        event_type: 'thrown_out_advancing',
        runner_base: 'second',
        runner_to_base: 'home',
        out_recorded: true,
        outs_before: 0,
        outs_after: 1,
        fielder_sequence: [9, 2],
        created_at: '2026-05-09T00:00:00Z',
        ...overrides,
    };
}

describe('utils/describeBaserunnerEvent', () => {
    it('formats a thrown_out_advancing event with full detail', () => {
        expect(describeBaserunnerEvent(makeEvent({}))).toBe('thrown out 9-2 at home');
    });

    it('handles a longer fielder sequence', () => {
        expect(describeBaserunnerEvent(makeEvent({ fielder_sequence: [8, 4, 2] }))).toBe('thrown out 8-4-2 at home');
    });

    it('uses ordinal labels for non-home target bases', () => {
        expect(
            describeBaserunnerEvent(makeEvent({ runner_base: 'first', runner_to_base: 'third', fielder_sequence: [7, 5] }))
        ).toBe('thrown out 7-5 at 3rd');
    });

    it('falls back gracefully when the fielder sequence is missing', () => {
        expect(describeBaserunnerEvent(makeEvent({ fielder_sequence: null }))).toBe('thrown out at home');
    });

    it('falls back further when both fielder sequence and target base are missing', () => {
        expect(describeBaserunnerEvent(makeEvent({ fielder_sequence: null, runner_to_base: null }))).toBe('thrown out');
    });

    it('returns an empty string for non-throwout event types', () => {
        expect(describeBaserunnerEvent(makeEvent({ event_type: 'stolen_base' }))).toBe('');
        expect(describeBaserunnerEvent(makeEvent({ event_type: 'caught_stealing' }))).toBe('');
        expect(describeBaserunnerEvent(makeEvent({ event_type: 'wild_pitch' }))).toBe('');
    });
});
