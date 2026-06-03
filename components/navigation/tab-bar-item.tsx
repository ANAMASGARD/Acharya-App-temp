import { TabBarIcon } from "@/components/navigation/tab-bar-icon";
import { colors } from "@/theme/colors";
import { fontFamilies, typography } from "@/theme/typography";
import { Ionicons } from "@expo/vector-icons";
import type { LottieViewProps } from "lottie-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type TabIconName = keyof typeof Ionicons.glyphMap;

type IconVariant = "ionicons" | "lottie-recorder" | "lottie-profile";

type Props = Readonly<{
  label: string;
  icon: TabIconName;
  iconFocused: TabIconName;
  iconVariant?: IconVariant;
  lottieSource?: LottieViewProps["source"];
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}>;

const PRESS_SPRING = { damping: 14, stiffness: 400, mass: 0.6 } as const;
const RELEASE_SPRING = { damping: 12, stiffness: 280, mass: 0.7 } as const;

export function TabBarItem({
  label,
  icon,
  iconFocused,
  iconVariant = "ionicons",
  lottieSource,
  focused,
  onPress,
  onLongPress,
}: Props): React.ReactElement {
  const scale = useSharedValue(1);
  const labelOpacity = useSharedValue(focused ? 0 : 1);
  const [playSignal, setPlaySignal] = useState(0);

  useEffect(() => {
    labelOpacity.value = withTiming(focused ? 0 : 1, { duration: 180 });
  }, [focused, labelOpacity]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const handlePressIn = (): void => {
    scale.value = withSpring(0.88, PRESS_SPRING);
  };

  const handlePressOut = (): void => {
    scale.value = withSequence(
      withSpring(1.06, RELEASE_SPRING),
      withSpring(1, RELEASE_SPRING),
    );
  };

  const handlePress = (): void => {
    setPlaySignal((current) => current + 1);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pressable}
    >
      <Animated.View style={[styles.item, animatedContainerStyle]}>
        <TabBarIcon
          focused={focused}
          icon={icon}
          iconFocused={iconFocused}
          lottieSource={lottieSource}
          playSignal={playSignal}
          variant={iconVariant}
        />
        <Animated.Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={[styles.label, animatedLabelStyle]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 6,
    minHeight: 56,
  },
  label: {
    marginTop: 4,
    fontFamily: fontFamilies.sansMedium,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.mint,
    textAlign: "center",
  },
});
