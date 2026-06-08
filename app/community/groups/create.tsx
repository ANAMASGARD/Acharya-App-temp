import { CommunityScreenHeader } from "@/components/community/community-screen-header";
import { useCommunityGroups } from "@/hooks/use-community-groups";
import { useTeacherDisplayName } from "@/hooks/use-teacher-display-name";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateGroupScreen(): React.ReactElement {
  const router = useRouter();
  const displayName = useTeacherDisplayName();
  const { createGroup } = useCommunityGroups();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectTag, setSubjectTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const group = await createGroup({
        name,
        description,
        subjectTag: subjectTag || null,
        displayName,
      });
      router.replace(`/community/groups/${group.groupId}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create group",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar style="dark" />
      <CommunityScreenHeader title="Create Group" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Group name</Text>
        <TextInput
          onChangeText={setName}
          placeholder="Class 6 Science Teachers"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          value={name}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          multiline
          onChangeText={setDescription}
          placeholder="What is this group for?"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, styles.textArea]}
          value={description}
        />

        <Text style={styles.label}>Subject (optional)</Text>
        <TextInput
          onChangeText={setSubjectTag}
          placeholder="Science"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          value={subjectTag}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => {
            void handleCreate();
          }}
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.foreground} size="small" />
          ) : (
            <Text style={styles.buttonLabel}>Create group</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.thin,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 16,
    lineHeight: 22,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  error: {
    color: colors.destructive,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 14,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  safeArea: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
});
