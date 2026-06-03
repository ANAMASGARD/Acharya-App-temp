import { colors } from "@/theme/colors";
import { fontFamilies } from "@/theme/typography";
import { StyleSheet, Text } from "react-native";

type Props = Readonly<{
  isRecording: boolean;
  canStartRecording: boolean;
}>;

export function RecorderStatusLabel({
  isRecording,
  canStartRecording,
}: Props): React.ReactElement {
  let message = "Ready to record";

  if (isRecording) {
    message = "Recording…";
  } else if (!canStartRecording) {
    message = "Fill topic, subject, and class to start";
  }

  return <Text style={styles.label}>{message}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
