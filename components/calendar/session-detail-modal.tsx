import { NeoButton } from "@/components/ui/neo-button";
import { NeoCard } from "@/components/ui/neo-card";
import {
  formatDuration,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/calendar/date-utils";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import type { SessionDetail } from "@/types/calendar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = Readonly<{
  visible: boolean;
  detail: SessionDetail | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}>;

const REPORT_SECTIONS = [
  { key: "classroomEnvironment", title: "Classroom Environment" },
  { key: "whatWentWrong", title: "What Went Wrong" },
  { key: "areasToImprove", title: "Areas to Improve" },
  { key: "topicSpecificFeedback", title: "Topic Feedback" },
] as const;

export function SessionDetailModal({
  visible,
  detail,
  isLoading,
  error,
  onClose,
}: Props): React.ReactElement {
  const session = detail?.session;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close session details"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons
                color={colors.foreground}
                name="close"
                size={22}
              />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.foreground} size="large" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <NeoButton label="Close" onPress={onClose} />
            </View>
          ) : session ? (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.title}>{session.topic}</Text>

              <View style={styles.subjectBadge}>
                <Text style={styles.subjectText}>
                  {session.subject.toUpperCase()}
                </Text>
              </View>

              <NeoCard padding={spacing.lg} style={styles.infoCard}>
                <DetailRow
                  icon="calendar"
                  label="Date"
                  value={formatSessionDate(session.recordedAt)}
                />
                <DetailRow
                  icon="clock-outline"
                  label="Started"
                  value={formatSessionTime(session.recordedAt)}
                />
                <DetailRow
                  icon="timer-outline"
                  label="Duration"
                  value={formatDuration(session.durationSeconds)}
                />
                <DetailRow
                  icon="school-outline"
                  label="Class"
                  value={session.classLevel}
                />
                {typeof session.score === "number" ? (
                  <DetailRow
                    icon="star-outline"
                    label="Score"
                    value={`${session.score}/10`}
                  />
                ) : null}
              </NeoCard>

              {detail.transcriptPreview ? (
                <NeoCard padding={spacing.lg} style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Transcript Preview</Text>
                  <Text style={styles.sectionBody}>
                    {detail.transcriptPreview}
                    {detail.transcriptPreview.length >= 280 ? "…" : ""}
                  </Text>
                </NeoCard>
              ) : null}

              {detail.report ? (
                <NeoCard padding={0} style={styles.sectionCard}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportHeaderText}>Class Reflection</Text>
                  </View>
                  {REPORT_SECTIONS.map((section) => (
                    <View key={section.key} style={styles.reportSection}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      <Text style={styles.sectionBody}>
                        {detail.report?.[section.key]}
                      </Text>
                    </View>
                  ))}
                </NeoCard>
              ) : (
                <NeoCard padding={spacing.lg} style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Report</Text>
                  <Text style={styles.sectionBody}>
                    No teaching report yet. Finish recording and analysis to see
                    feedback here.
                  </Text>
                </NeoCard>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: Readonly<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}>): React.ReactElement {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelWrap}>
        <MaterialCommunityIcons
          color={colors.foreground}
          name={icon}
          size={16}
        />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    gap: spacing.lg,
    justifyContent: "center",
    minHeight: 200,
    padding: spacing.lg,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: borderWidths.thin,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  detailLabel: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  detailLabelWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  detailRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  detailValue: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: colors.destructive,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  handle: {
    backgroundColor: colors.muted,
    borderRadius: 999,
    height: 4,
    width: 48,
  },
  handleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  infoCard: {
    marginTop: spacing.lg,
  },
  overlay: {
    backgroundColor: "rgba(26, 26, 26, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  reportHeader: {
    backgroundColor: colors.lime,
    borderBottomColor: colors.border,
    borderBottomWidth: borderWidths.thin,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  reportHeaderText: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  reportSection: {
    borderBottomColor: colors.border,
    borderBottomWidth: borderWidths.thin,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing["2xl"],
    paddingHorizontal: spacing.lg,
  },
  sectionBody: {
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  sheet: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: borderWidths.default,
    maxHeight: "88%",
  },
  subjectBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderWidth: borderWidths.thin,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  subjectText: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    letterSpacing: 0.4,
    lineHeight: 14,
  },
  title: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 26,
    lineHeight: 32,
    marginTop: spacing.sm,
  },
});
