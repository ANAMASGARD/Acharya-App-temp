import { RecorderNeoCard } from "@/components/recording/recorder-neo-card";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import type { TeachingReport } from "@/types/recorder";
import { StyleSheet, Text, View } from "react-native";

type Props = Readonly<{
  report: TeachingReport;
}>;

const SECTIONS: readonly {
  key: keyof TeachingReport;
  title: string;
}[] = [
  { key: "classroomEnvironment", title: "Classroom Environment" },
  { key: "whatWentWrong", title: "What Went Wrong" },
  { key: "areasToImprove", title: "Areas to Improve" },
  { key: "topicSpecificFeedback", title: "Topic Feedback" },
];

export function RecorderReportPanel({ report }: Props): React.ReactElement {
  return (
    <RecorderNeoCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Class Reflection</Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.key} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{report[section.key]}</Text>
        </View>
      ))}
    </RecorderNeoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    padding: 0,
  },
  header: {
    backgroundColor: colors.lime,
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
  section: {
    borderBottomColor: colors.border,
    borderBottomWidth: borderWidths.thin,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionBody: {
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
