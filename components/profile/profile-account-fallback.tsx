import { useProfileAccount } from "@/hooks/use-profile-account";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = Readonly<{
  showDevBuildHint?: boolean;
}>;

export function ProfileAccountFallback({
  showDevBuildHint = true,
}: Props): React.ReactElement {
  const { openAccountPortal, hasAccountPortal } = useProfileAccount();

  return (
    <View style={styles.fallback}>
      <View style={styles.fallbackCard}>
        {showDevBuildHint ? (
          <>
            <Text style={styles.fallbackTitle}>Development build required</Text>
            <Text style={styles.fallbackBody}>
              Full account management (emails, 2FA, connected accounts, active
              devices, delete account) needs a native build. Run{" "}
              <Text style={styles.fallbackBold}>npx expo run:android</Text> or{" "}
              <Text style={styles.fallbackBold}>npx expo run:ios</Text> after
              prebuild.
            </Text>
          </>
        ) : (
          <Text style={styles.fallbackBody}>
            Account settings are not available in this environment. Use the
            browser option below if configured.
          </Text>
        )}
        {hasAccountPortal ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void openAccountPortal();
            }}
            style={({ pressed }) => [
              styles.portalButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.portalButtonText}>
              Open account settings in browser
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  fallbackBody: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  fallbackBold: {
    fontFamily: fontFamilies.sansBold,
  },
  fallbackCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.thin,
    padding: spacing.lg,
  },
  fallbackTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 20,
    lineHeight: 26,
  },
  portalButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.thin,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  portalButtonText: {
    color: colors.primaryForeground,
    fontFamily: fontFamilies.head,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
  },
});
