import type { BaserunnerEvent } from '../index';
import { formatFielderSequence } from './fielderSequence';

const BASE_LABEL: Record<string, string> = {
    first: '1st',
    second: '2nd',
    third: '3rd',
    home: 'home',
};

/**
 * Single source of truth for human-readable BaserunnerEvent descriptions.
 * Both web and mobile summary surfaces use this to render strings like
 * "thrown out 9-2 at home" so notation stays consistent across platforms.
 *
 * Returns an empty string when the event doesn't carry display-worthy detail.
 */
export function describeBaserunnerEvent(event: BaserunnerEvent): string {
    if (event.event_type === 'thrown_out_advancing') {
        const seq = formatFielderSequence(event.fielder_sequence);
        const at = event.runner_to_base ? BASE_LABEL[event.runner_to_base] || event.runner_to_base : null;
        if (seq && at) return `thrown out ${seq} at ${at}`;
        if (seq) return `thrown out ${seq}`;
        if (at) return `thrown out at ${at}`;
        return 'thrown out';
    }
    return '';
}
