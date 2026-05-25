// Pure helpers extracted from RunnerAdvancementModal.tsx as part of UX audit
// item E (UX-IP-09). Keeps the modal component focused on rendering by lifting
// the advancement-matching logic into a separately testable module.

import { BaseRunners, getSuggestedAdvancement, RunnerBase } from '@pitch-tracker/shared';

export type ThrowoutTargetBase = 'second' | 'third' | 'home';

export interface Throwout {
    fromBase: RunnerBase;
    toBase: ThrowoutTargetBase;
    fielderSeq: number[];
}

export type RunnerOrigin = 'batter' | RunnerBase;
export type AdvanceTarget = RunnerBase | 'home';

export interface ErrorAdvancement {
    fromBase: RunnerOrigin;
    toBase: AdvanceTarget;
}

export const FROM_BASE_LABEL: Record<RunnerBase, string> = { first: '1st', second: '2nd', third: '3rd' };
export const TO_BASE_LABEL: Record<ThrowoutTargetBase, string> = { second: '2nd', third: '3rd', home: 'home' };
export const ORIGIN_LABEL: Record<RunnerOrigin, string> = { batter: 'Batter', first: '1st', second: '2nd', third: '3rd' };
export const TARGET_LABEL: Record<AdvanceTarget, string> = { first: '1st', second: '2nd', third: '3rd', home: 'home' };

export const BASE_ORDER: Record<RunnerOrigin | AdvanceTarget, number> = { batter: 0, first: 1, second: 2, third: 3, home: 4 };

export const VALID_TARGETS: Record<RunnerBase, ThrowoutTargetBase[]> = {
    first: ['second', 'third', 'home'],
    second: ['third', 'home'],
    third: ['home'],
};

/**
 * The batter's "source base" for advancement matching. null when the play puts
 * the batter out (sac fly/bunt or a generic out result).
 */
export const batterSourceBase = (hitResult: string): AdvanceTarget | 'home' | null => {
    switch (hitResult) {
        case 'home_run':
            return 'home';
        case 'triple':
            return 'third';
        case 'double':
            return 'second';
        case 'single':
        case 'walk':
        case 'hit_by_pitch':
        case 'strikeout_dropped':
        case 'fielders_choice':
            return 'first';
        default:
            return null;
    }
};

/**
 * Greedy left-to-right match of base-runner sources (leading first) to
 * destinations (home counts × runsScored, then 3rd/2nd/1st in newRunners).
 * Each source picks the leading-most available destination ≥ its starting base.
 */
export const matchAdvancements = (
    currentRunners: BaseRunners,
    hitResult: string,
    newRunners: BaseRunners,
    runsScored: number
): Array<{ fromBase: RunnerOrigin; toBase: AdvanceTarget }> => {
    const sources: RunnerOrigin[] = [];
    if (currentRunners.third) sources.push('third');
    if (currentRunners.second) sources.push('second');
    if (currentRunners.first) sources.push('first');
    if (batterSourceBase(hitResult) !== null) sources.push('batter');

    const destinations: AdvanceTarget[] = [];
    for (let i = 0; i < runsScored; i++) destinations.push('home');
    if (newRunners.third) destinations.push('third');
    if (newRunners.second) destinations.push('second');
    if (newRunners.first) destinations.push('first');

    const advancements: Array<{ fromBase: RunnerOrigin; toBase: AdvanceTarget }> = [];
    const taken = new Set<number>();
    for (const src of sources) {
        const minOrder = src === 'batter' ? BASE_ORDER.first : BASE_ORDER[src];
        let bestIdx = -1;
        for (let i = 0; i < destinations.length; i++) {
            if (taken.has(i)) continue;
            const destOrder = BASE_ORDER[destinations[i]];
            if (destOrder < minOrder) continue;
            if (bestIdx === -1 || BASE_ORDER[destinations[i]] > BASE_ORDER[destinations[bestIdx]]) {
                bestIdx = i;
            }
        }
        if (bestIdx !== -1) {
            advancements.push({ fromBase: src, toBase: destinations[bestIdx] });
            taken.add(bestIdx);
        }
    }
    return advancements;
};

export const computeExtraAdvancements = (
    currentRunners: BaseRunners,
    hitResult: string,
    newRunners: BaseRunners,
    runsScored: number
): ErrorAdvancement[] => {
    const actual = matchAdvancements(currentRunners, hitResult, newRunners, runsScored);
    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(currentRunners, hitResult);
    const suggested = matchAdvancements(currentRunners, hitResult, suggestedRunners, suggestedRuns);
    const suggestedByFrom = new Map(suggested.map((s) => [s.fromBase, s.toBase]));

    return actual.filter((adv) => {
        const sugDest = suggestedByFrom.get(adv.fromBase);
        if (!sugDest) return false;
        return BASE_ORDER[adv.toBase] > BASE_ORDER[sugDest];
    });
};

export const advancementKey = (a: ErrorAdvancement) => `${a.fromBase}->${a.toBase}`;

export const getHitLabel = (result: string): string => {
    switch (result) {
        case 'single':
            return 'Single';
        case 'double':
            return 'Double';
        case 'triple':
            return 'Triple';
        case 'home_run':
            return 'Home Run';
        case 'walk':
            return 'Walk';
        case 'hit_by_pitch':
            return 'Hit By Pitch';
        case 'sacrifice_fly':
            return 'Sacrifice Fly';
        case 'sacrifice_bunt':
            return 'Sacrifice Bunt';
        case 'fielders_choice':
            return "Fielder's Choice";
        case 'strikeout_dropped':
            return 'Dropped 3rd Strike';
        default:
            return result;
    }
};
