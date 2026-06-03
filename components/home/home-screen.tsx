import { HomeHeader } from "@/components/home/home-header";
import { NotesGapsCard } from "@/components/home/notes-gaps-card";
import { RecentActivityCard } from "@/components/home/recent-activity-card";
import { StartSessionCard } from "@/components/home/start-session-card";
import { getHomeDashboardContent } from "@/data/home-dashboard";
import { useHomeGreeting } from "@/hooks/use-home-greeting";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/tokens";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TAB_BAR_CLEARANCE = 100;

export function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const { greetingText } = useHomeGreeting();
  const content = getHomeDashboardContent();

  const goToRecorder = (): void => {
    router.push("/(tabs)/recorder");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <HomeHeader
          greetingText={greetingText}
          streakDays={content.streakDays}
        />
        <View style={styles.cards}>
          <RecentActivityCard items={content.recentActivity} />
          <NotesGapsCard content={content.notesGaps} />
          <StartSessionCard content={content.startSession} onPress={goToRecorder} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cards: {
    backgroundColor: colors.cream,
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  safeArea: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
});
