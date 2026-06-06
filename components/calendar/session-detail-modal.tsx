import {
  ClassReflectionSections,
  getScoreBadgeColors,
} from "@/components/calendar/class-reflection-sections";
import { NeoButton } from "@/components/ui/neo-button";
import {
  formatDuration,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/calendar/date-utils";
import {
  getClassBadgeColors,
  getClassDisplayLabel,
  getSubjectBadgeColors,
  getSubjectDisplayLabel,
} from "@/lib/calendar/session-display";
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

export function SessionDetailModal({
  visible,
  detail,
  isLoading,
  error,
  onClose,
}: Props): React.ReactElement {
  const session = detail?.session;
  const score =
    typeof session?.score === "number"
      ? session.score
      : detail?.report?.overallScore;

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
            <>
              <View style={styles.yellowHeader}>
                <View style={styles.headerTopRow}>
                  <Text numberOfLines={2} style={styles.title}>
                    {session.topic}
                  </Text>
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

                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.tagBadge,
                      {
                        backgroundColor: getSubjectBadgeColors(session.subject)
                          .backgroundColor,
                      },
                    ]}
                  >
                    <Text style={styles.tagText}>
                      {getSubjectDisplayLabel(session.subject)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.tagBadge,
                      {
                        backgroundColor: getClassBadgeColors().backgroundColor,
                      },
                    ]}
                  >
                    <Text style={styles.tagText}>
                      {getClassDisplayLabel(session.classLevel)}
                    </Text>
                  </View>
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons
                      color={colors.foreground}
                      name="clock-outline"
                      size={14}
                    />
                    <Text style={styles.metaChipText}>
                      {formatSessionTime(session.recordedAt)}
                    </Text>
                  </View>
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons
                      color={colors.foreground}
                      name="book-open-page-variant-outline"
                      size={14}
                    />
                    <Text style={styles.metaChipText}>
                      {formatDuration(session.durationSeconds)}
                    </Text>
                  </View>
                  {typeof score === "number" ? (
                    <View
                      style={[
                        styles.scoreBadge,
                        getScoreBadgeColors(score),
                      ]}
                    >
                      <Text style={styles.scoreText}>{score}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.dateLabel}>
                  {formatSessionDate(session.recordedAt)}
                </Text>

                {detail.transcriptPreview ? (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptTitle}>Transcript Preview</Text>
                    <Text style={styles.transcriptBody}>
                      {detail.transcriptPreview}
                      {detail.transcriptPreview.length >= 280 ? "…" : ""}
                    </Text>
                  </View>
                ) : null}

                {detail.report ? (
                  <ClassReflectionSections report={detail.report} />
                ) : (
                  <View style={styles.emptyReport}>
                    <Text style={styles.emptyReportTitle}>Report</Text>
                    <Text style={styles.emptyReportBody}>
                      No teaching report yet. Finish recording and analysis to
                      see feedback here.
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.footer}>
                <NeoButton label="Close" onPress={onClose} />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
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
  dateLabel: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  emptyReport: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptyReportBody: {
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyReportTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
  },
  errorText: {
    color: colors.destructive,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: borderWidths.thin,
    padding: spacing.lg,
  },
  headerTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  metaChip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: borderWidths.thin,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  metaChipText: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
  },
  overlay: {
    backgroundColor: "rgba(26, 26, 26, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  scoreBadge: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: borderWidths.thin,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  scoreText: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: borderWidths.default,
    maxHeight: "92%",
  },
  tagBadge: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: borderWidths.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  tagText: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
  },
  title: {
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamilies.head,
    fontSize: 24,
    lineHeight: 30,
  },
  transcriptBody: {
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  transcriptBox: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  transcriptTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
  },
  yellowHeader: {
    backgroundColor: colors.primary,
    borderBottomColor: colors.border,
    borderBottomWidth: borderWidths.thin,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
