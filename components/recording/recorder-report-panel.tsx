import { ClassReflectionSections } from "@/components/calendar/class-reflection-sections";
import { RecorderNeoCard } from "@/components/recording/recorder-neo-card";
import { spacing } from "@/theme/tokens";
import type { TeachingReport } from "@/types/recorder";
import { StyleSheet } from "react-native";

type Props = Readonly<{
  report: TeachingReport;
}>;

export function RecorderReportPanel({ report }: Props): React.ReactElement {
  return (
    <RecorderNeoCard style={styles.card}>
      <ClassReflectionSections report={report} />
    </RecorderNeoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "visible",
    padding: spacing.lg,
  },
});
