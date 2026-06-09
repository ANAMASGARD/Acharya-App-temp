import { VoiceWaveformIcon } from "@/components/chat/voice-waveform-icon";
import { VOICE_AGENT_LABEL } from "@/lib/voice/constants";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import type { VoiceAgentPhase, VoiceAgentStatus } from "@/types/voice";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Props = Readonly<{
  status: VoiceAgentStatus;
  phase: VoiceAgentPhase;
}>;

function phaseLabel(status: VoiceAgentStatus, phase: VoiceAgentPhase): string {
  if (status === "connecting") {
    return "Connecting…";
  }

  if (phase === "speaking") {
    return "Acharya is speaking…";
  }

  if (phase === "thinking") {
    return "Thinking…";
  }

  return "Listening…";
}

export function VoiceSessionBar({ status, phase }: Props): React.ReactElement {
  const label = phaseLabel(status, phase);
  const showSpinner = status === "connecting" || phase === "thinking";

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        {showSpinner ? (
          <ActivityIndicator color={colors.foreground} size="small" />
        ) : (
          <VoiceWaveformIcon color={colors.foreground} height={18} />
        )}
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{VOICE_AGENT_LABEL}</Text>
        <Text style={styles.subtitle}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 28,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: 18,
  },
  wrap: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.thin,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
