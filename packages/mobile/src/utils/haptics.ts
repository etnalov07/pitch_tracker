// No-op haptics module for iOS 26.2 beta testing
// expo-haptics uses TurboModules which crash on iOS 26.2 beta
// TODO: Remove this and use expo-haptics directly once React Native fixes TurboModule issue

export const ImpactFeedbackStyle = {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Rigid: 'rigid',
    Soft: 'soft',
} as const;

export const NotificationFeedbackType = {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
} as const;

export const impactAsync = async (_style?: string): Promise<void> => {
    // No-op
};

export const notificationAsync = async (_type?: string): Promise<void> => {
    // No-op
};

export const selectionAsync = async (): Promise<void> => {
    // No-op
};

export default {
    ImpactFeedbackStyle,
    NotificationFeedbackType,
    impactAsync,
    notificationAsync,
    selectionAsync,
};
