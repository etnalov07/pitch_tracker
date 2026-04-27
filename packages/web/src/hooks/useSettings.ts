import { useCallback, useState } from 'react';

const SETTINGS_KEY = 'pitch_tracker_settings';

export interface AppSettings {
    showVelocity: boolean;
    pitchCallEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    showVelocity: false,
    pitchCallEnabled: false,
};

function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(loadSettings);

    const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings((prev) => {
            const next = { ...prev, [key]: value };
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
            } catch {
                // localStorage unavailable — silently continue
            }
            return next;
        });
    }, []);

    return { settings, updateSetting };
}
