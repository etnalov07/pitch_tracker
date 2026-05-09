// Helpers for putout/assist fielder sequences expressed as ordered position
// numbers (1=P, 2=C, ..., 9=RF). The wire format is number[] (e.g. [9, 2])
// and the human format is hyphen-joined (e.g. "9-2").

/** Render a sequence as a "9-2" style string. Empty/null returns "". */
export function formatFielderSequence(seq: number[] | null | undefined): string {
    if (!seq || seq.length === 0) return '';
    return seq.join('-');
}

/**
 * Parse a "9-2" / "8-4-2" string into an ordered number[].
 * Returns null when the input is empty or contains anything outside 1-9.
 * Whitespace around the separator is tolerated.
 */
export function parseFielderSequence(text: string | null | undefined): number[] | null {
    if (!text) return null;
    const parts = text
        .split('-')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    if (parts.length === 0) return null;
    const nums: number[] = [];
    for (const part of parts) {
        if (!/^[1-9]$/.test(part)) return null;
        nums.push(parseInt(part, 10));
    }
    return nums;
}
