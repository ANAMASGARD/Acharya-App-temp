import { RecorderReportPanel } from "@/components/recording/recorder-report-panel";
import { RecorderSessionCard } from "@/components/recording/recorder-session-card";
import { RecorderTranscriptPanel } from "@/components/recording/recorder-transcript-panel";
import { useRecorder } from "@/hooks/use-recorder";
import { useRecorderStore } from "@/store/recorder-store";
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
    isStarting,
    isTranscribing,
    timerLabel,
    canStartRecording,
    canSend,
    statusMessage,
    mergedTranscript,
    report,
    classNotes,
    analysisError,
    allowPartialSend,
    setTopic,
    setSubject,
    setClassLevel,
    toggleRecording,
    sendForAnalysis,
    confirmPartialSend,
    retryAnalysis,
  } = useRecorder();

  const { status, transcriptComplete, pendingUploadCount } = useRecorderStore();

  const showPartialPrompt =
    status === "draining" &&
    !transcriptComplete &&
    pendingUploadCount > 0 &&
    !allowPartialSend;

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
            analysisError={analysisError}
            canStartRecording={canStartRecording}
            classLevel={classLevel}
            isRecording={isRecording}
            isStarting={isStarting}
            showPartialPrompt={showPartialPrompt}
            statusMessage={statusMessage}
            subject={subject}
            timerLabel={timerLabel}
            topic={topic}
            onClassLevelChange={setClassLevel}
            onConfirmPartial={confirmPartialSend}
            onRetryAnalysis={() => {
              void retryAnalysis();
            }}
            onSubjectChange={setSubject}
            onToggleRecording={toggleRecording}
            onTopicChange={setTopic}
          />
        </View>

        <View style={styles.transcriptGap}>
          <RecorderTranscriptPanel
            disabled={!canSend}
            isTranscribing={isTranscribing}
            transcript={mergedTranscript}
            onSend={() => {
              void sendForAnalysis();
            }}
          />
        </View>

        {report ? (
          <View style={styles.reportGap}>
            <RecorderReportPanel classNotes={classNotes} report={report} />
          </View>
        ) : null}
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
  reportGap: {
    marginTop: spacing.lg,
  },
});
