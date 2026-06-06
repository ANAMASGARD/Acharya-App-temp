import { colors } from "@/theme/colors";
import { borderWidths, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotesUploadScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => {
            router.back();
          }}
          style={styles.backButton}
        >
          <MaterialCommunityIcons color={colors.foreground} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.title}>Upload Notes</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.body}>
          Notes upload and curriculum verification will be built here next.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: spacing.xs,
  },
  body: {
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderBottomColor: colors.border,
    borderBottomWidth: borderWidths.default,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  safeArea: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  title: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 22,
  },
});
