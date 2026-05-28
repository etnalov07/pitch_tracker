// Lightweight reachability check via fetch. expo-network crashes on the iOS 26.2
// beta (banned in CLAUDE.md), so we probe a known 204 endpoint instead. Kept in
// its own module so both offlineService and the offline slice can use it without
// an import cycle.
export const checkIsOnline = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch('https://clients3.google.com/generate_204', {
            method: 'HEAD',
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return true;
    } catch {
        return false;
    }
};
