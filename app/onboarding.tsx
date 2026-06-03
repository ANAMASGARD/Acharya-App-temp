import {
  onboardingSlides,
  type OnboardingSlide,
} from "@/data/onboarding-slides";
import { colors } from "@/theme/colors";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CREAM = colors.cream;
const LAST_PAGE_INDEX = onboardingSlides.length - 1;

export default function OnboardingScreen(): React.ReactElement {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const isLastPage = pageIndex === LAST_PAGE_INDEX;

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.x / screenWidth,
      );
      setPageIndex(nextIndex);
    },
    [screenWidth],
  );

  const handlePrimaryAction = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isLastPage) {
      router.push("/sign-up");
      return;
    }

    const nextIndex = pageIndex + 1;
    listRef.current?.scrollToIndex({ animated: true, index: nextIndex });
    setPageIndex(nextIndex);
  };

  const renderSlide: ListRenderItem<OnboardingSlide> = useCallback(
    ({ item }) => (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ width: screenWidth }}
      >
        <Image
          accessibilityLabel={item.mascotLabel}
          contentFit="contain"
          source={item.mascot}
          style={{ height: 240, width: 220 }}
        />

        <View className="mt-8 items-center gap-1">
          <Text className="text-center font-head text-[34px] leading-[40px] text-foreground">
            {item.titleLine1}
          </Text>
          <Text className="text-center font-head text-[34px] leading-[40px] text-foreground">
            {item.titleLine2}
          </Text>
        </View>

        <Text className="mt-4 max-w-[300px] text-center font-sans text-[15px] leading-[22px] text-muted-foreground">
          {item.description}
        </Text>
      </View>
    ),
    [screenWidth],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }}>
      <StatusBar style="dark" />

      <View className="flex-1">
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={[...onboardingSlides]}
          getItemLayout={(_, index) => ({
            index,
            length: screenWidth,
            offset: screenWidth * index,
          })}
          horizontal
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          pagingEnabled
          renderItem={renderSlide}
          showsHorizontalScrollIndicator={false}
        />

        <View className="gap-5 px-7 pb-6">
          <View className="flex-row items-center justify-center gap-2">
            {onboardingSlides.map((slide, index) => (
              <View
                key={slide.id}
                className={`h-2.5 rounded-full ${
                  index === pageIndex
                    ? "w-6 bg-foreground"
                    : "w-2.5 bg-muted"
                }`}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLastPage ? "Get Started" : "Next"}
            className="neo-button-primary min-h-[56px] items-center justify-center rounded-lg shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            onPress={handlePrimaryAction}
          >
            <Text className="font-head text-[16px] text-primary-foreground">
              {isLastPage ? "Get Started" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
