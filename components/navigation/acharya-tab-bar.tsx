import { TabBarItem } from "@/components/navigation/tab-bar-item";
import { lottieAnimations } from "@/constants/lottie";
import { colors } from "@/theme/colors";
import { borderWidths, spacing } from "@/theme/tokens";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const INDICATOR_SIZE = 54;
const TAB_BAR_HEIGHT = 72;
const INDICATOR_SPRING = { damping: 20, stiffness: 220, mass: 0.8 } as const;

type TabIconName = keyof typeof Ionicons.glyphMap;

export const TAB_ITEMS = [
  {
    name: "index",
    label: "Home",
    icon: "home-outline" as TabIconName,
    iconFocused: "home" as TabIconName,
    iconVariant: "ionicons" as const,
  },
  {
    name: "calendar",
    label: "Calendar",
    icon: "calendar-outline" as TabIconName,
    iconFocused: "calendar" as TabIconName,
    iconVariant: "ionicons" as const,
  },
  {
    name: "recorder",
    label: "Recorder",
    icon: "mic-outline" as TabIconName,
    iconFocused: "mic" as TabIconName,
    iconVariant: "lottie-recorder" as const,
    lottie: lottieAnimations.recorderMic,
  },
  {
    name: "chat",
    label: "Chat",
    icon: "chatbubble-ellipses-outline" as TabIconName,
    iconFocused: "chatbubble-ellipses" as TabIconName,
    iconVariant: "ionicons" as const,
  },
  {
    name: "profile",
    label: "Profile",
    icon: "settings-outline" as TabIconName,
    iconFocused: "settings" as TabIconName,
    iconVariant: "lottie-profile" as const,
    lottie: lottieAnimations.profileSettings,
  },
] as const;

export function AcharyaTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const indicatorX = useSharedValue(0);
  const barWidthRef = useRef(0);
  const previousIndex = useRef(state.index);

  const updateIndicatorPosition = (index: number, width: number): void => {
    if (width <= 0) {
      return;
    }

    const tabWidth = width / TAB_ITEMS.length;
    indicatorX.value = withSpring(
      index * tabWidth + (tabWidth - INDICATOR_SIZE) / 2,
      INDICATOR_SPRING,
    );
  };

  useEffect(() => {
    if (previousIndex.current !== state.index) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      previousIndex.current = state.index;
    }

    const width = barWidthRef.current;
    if (width <= 0) {
      return;
    }

    const tabWidth = width / TAB_ITEMS.length;
    indicatorX.value = withSpring(
      state.index * tabWidth + (tabWidth - INDICATOR_SIZE) / 2,
      INDICATOR_SPRING,
    );
  }, [state.index, indicatorX]);

  const handleBarLayout = (event: LayoutChangeEvent): void => {
    const width = event.nativeEvent.layout.width;
    barWidthRef.current = width;
    updateIndicatorPosition(state.index, width);
  };

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
      onLayout={handleBarLayout}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, animatedIndicatorStyle]}
      />

      <View style={styles.tabsRow} pointerEvents="box-none">
        {state.routes.map((route, index) => {
          const tabConfig = TAB_ITEMS.find((item) => item.name === route.name);

          if (!tabConfig) {
            return null;
          }

          const focused = state.index === index;
          const { options } = descriptors[route.key];

          const onPress = (): void => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = (): void => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TabBarItem
              key={route.key}
              focused={focused}
              icon={tabConfig.icon}
              iconFocused={tabConfig.iconFocused}
              iconVariant={tabConfig.iconVariant}
              lottieSource={"lottie" in tabConfig ? tabConfig.lottie : undefined}
              label={options.title ?? tabConfig.label}
              onLongPress={onLongPress}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.secondary,
    borderTopWidth: borderWidths.default,
    borderTopColor: colors.border,
    minHeight: TAB_BAR_HEIGHT,
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: TAB_BAR_HEIGHT - spacing.sm,
    zIndex: 1,
  },
  indicator: {
    position: "absolute",
    top: 4,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    backgroundColor: colors.primary,
    zIndex: 0,
  },
});
