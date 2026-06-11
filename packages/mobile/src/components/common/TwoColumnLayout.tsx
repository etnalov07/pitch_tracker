import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

interface TwoColumnLayoutProps {
    /** Left rail content (web-parity sidebar). */
    sidebar: React.ReactNode;
    /** Main pane content. */
    children: React.ReactNode;
    /** Sidebar width in dp. Defaults to 340 (matches the live-game side rail). */
    sidebarWidth?: number;
    sidebarStyle?: ViewStyle;
    mainStyle?: ViewStyle;
}

/**
 * Presentational two-pane shell used by the iPad (landscape-locked) layouts to
 * mimic the web's sidebar + main split. The phone layouts never render this —
 * each screen selects `XxxTablet` (which uses this) vs `XxxPhone` via
 * `useDeviceType`. Divider color matches the live-game stats panel
 * (`liveGameStyles.statsPanel`).
 */
const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({ sidebar, children, sidebarWidth = 340, sidebarStyle, mainStyle }) => {
    const theme = useTheme();
    return (
        <View style={styles.row}>
            <View style={[styles.sidebar, { width: sidebarWidth, backgroundColor: theme.colors.surface }, sidebarStyle]}>
                {sidebar}
            </View>
            <View style={[styles.main, mainStyle]}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    row: { flex: 1, flexDirection: 'row' },
    sidebar: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(128,128,128,0.25)',
    },
    main: { flex: 1 },
});

export default TwoColumnLayout;
