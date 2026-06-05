import { Vibration } from 'react-native';

// Real tactile feedback for deliberate, easily-over-pressed live-game controls
// (Send Call, push-to-talk, shake). Uses React Native core `Vibration` rather
// than `utils/haptics` — that wrapper is a no-op because expo-haptics' Turbo-
// Modules crash on the iOS 26.2 beta. Vibration is always-linked RN core (no
// TurboModule), so it's safe and needs no rebuild.
//
// iOS plays its standard short vibration (the ms duration is ignored there);
// Android honors the brief duration as a light tap. When `utils/haptics` is
// restored to real expo-haptics, these calls can be dropped in favor of the
// existing `Haptics.*` calls already present at each call site.
const TAP_DURATION_MS = 20;

export function vibrateTap(): void {
    try {
        Vibration.vibrate(TAP_DURATION_MS);
    } catch {
        // Vibration unavailable (e.g. simulator) — ignore.
    }
}
