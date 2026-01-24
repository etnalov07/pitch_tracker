import { useWindowDimensions } from 'react-native';

export interface DeviceType {
    isTablet: boolean;
    isLandscape: boolean;
    width: number;
    height: number;
}

/**
 * Hook to detect device type (phone vs tablet) and orientation.
 * Uses the shorter dimension to determine tablet (>= 600dp).
 */
export const useDeviceType = (): DeviceType => {
    const { width, height } = useWindowDimensions();
    const isTablet = Math.min(width, height) >= 600;
    const isLandscape = width > height;

    return { isTablet, isLandscape, width, height };
};

export default useDeviceType;
