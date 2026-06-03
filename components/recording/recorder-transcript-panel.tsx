import { RecorderNeoCard } from "@/components/recording/recorder-neo-card";
import { colors } from "@/theme/colors";
import { borderWidths, radii, shadows, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = Readonly<{
  transcript?: string;
  onSend?: () => void;
}>;

export function RecorderTranscriptPanel({
  transcript,
  onSend,
}: Props): React.ReactElement {
  const hasTranscript = Boolean(transcript?.trim());

  return (
    <RecorderNeoCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Class Transcribe</Text>
      </View>

      <View style={styles.panel}>
        <Text style={[styles.body, !hasTranscript && styles.placeholder]}>
          {hasTranscript
            ? transcript
            : "Transcript will appear here…"}
        </Text>
      </View>

      <Pressable
        accessibilityLabel="Send transcript"
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasTranscript }}
        disabled={!hasTranscript}
        onPress={onSend}
        style={({ pressed }) => [
          styles.sendButton,
          !hasTranscript && styles.sendButtonDisabled,
          pressed && hasTranscript && styles.sendButtonPressed,
        ]}
      >
        <MaterialCommunityIcons
          color={colors.primaryForeground}
          name="send"
          size={20}
        />
        <Text style={styles.sendLabel}>Send</Text>
      </Pressable>
    </RecorderNeoCard>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    fontStyle: "normal",
    lineHeight: 22,
  },
  card: {
    overflow: "hidden",
    padding: 0,
  },
  header: {
    backgroundColor: colors.primary,
    borderBottomColor: colors.border,
    borderBottomWidth: borderWidths.thin,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  panel: {
    backgroundColor: colors.background,
    minHeight: 100,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  placeholder: {
    color: colors.mutedForeground,
    fontStyle: "italic",
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.default,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    margin: spacing.lg,
    marginTop: spacing.sm,
    minHeight: spacing.touch,
    ...shadows.sm,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    ...shadows.xs,
  },
  sendLabel: {
    color: colors.primaryForeground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
