import { RecorderSessionCard } from "@/components/recording/recorder-session-card";
import { RecorderTranscriptPanel } from "@/components/recording/recorder-transcript-panel";
import { useRecorderUi } from "@/hooks/use-recorder-ui";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TAB_BAR_CLEARANCE = 100;

export function RecorderScreen(): React.ReactElement {
  const {
    topic,
    subject,
    classLevel,
    isRecording,
    timerLabel,
    canStartRecording,
    setTopic,
    setSubject,
    setClassLevel,
    toggleRecording,
  } = useRecorderUi();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <Text style={styles.title}>Record Class Session</Text>

        <View style={styles.sessionGap}>
          <RecorderSessionCard
            canStartRecording={canStartRecording}
            classLevel={classLevel}
            isRecording={isRecording}
            subject={subject}
            timerLabel={timerLabel}
            topic={topic}
            onClassLevelChange={setClassLevel}
            onSubjectChange={setSubject}
            onToggleRecording={toggleRecording}
            onTopicChange={setTopic}
          />
        </View>

        <View style={styles.transcriptGap}>
          <RecorderTranscriptPanel />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: TAB_BAR_CLEARANCE,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sessionGap: {
    marginTop: spacing.lg,
  },
  title: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 24,
    lineHeight: 30,
  },
  transcriptGap: {
    marginTop: spacing.lg,
  },
});
