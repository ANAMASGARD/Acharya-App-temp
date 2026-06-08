import { CommunityScreenHeader } from "@/components/community/community-screen-header";
import { PostImagePicker } from "@/components/community/post-image-picker";
import {
  getCommunityPostImagesErrorMessage,
  useCommunityPostImages,
} from "@/hooks/use-community-post-images";
import { useTeacherDisplayName } from "@/hooks/use-teacher-display-name";
import { apiFetch, apiMultipartFetch } from "@/lib/api-client";
import { useCommunityStore } from "@/store/community-store";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import type { CommunityPost } from "@/types/community";
import { useAuth, useUser } from "@clerk/expo";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUBJECT_TAGS = [
  "General",
  "Mathematics",
  "Science",
  "English",
  "Social Studies",
] as const;

export default function CreatePostScreen(): React.ReactElement {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const displayName = useTeacherDisplayName();
  const { draftPost, setDraftPost, clearDraftPost } = useCommunityStore();
  const {
    selectedImages,
    isPicking,
    error: imageError,
    canAddMore,
    pickImages,
    pickFromFiles,
    takePhoto,
    removeImage,
    clearImages,
  } = useCommunityPostImages();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (!draftPost.title.trim() || !draftPost.body.trim()) {
      setError("Title and body are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();

      if (selectedImages.length > 0) {
        const formData = new FormData();

        formData.append("title", draftPost.title.trim());
        formData.append("body", draftPost.body.trim());
        formData.append("subjectTag", draftPost.subjectTag);
        formData.append("displayName", displayName);

        if (user?.imageUrl) {
          formData.append("imageUrl", user.imageUrl);
        }

        if (draftPost.linkUrl.trim()) {
          formData.append("linkUrl", draftPost.linkUrl.trim());
        }

        if (draftPost.groupId.trim()) {
          formData.append("groupId", draftPost.groupId.trim());
        }

        for (const image of selectedImages) {
          formData.append("images", {
            uri: image.uri,
            name: image.name,
            type: image.mimeType,
          } as unknown as Blob);
        }

        await apiMultipartFetch<{ post: CommunityPost }>("/api/community/posts", {
          token,
          formData,
        });
      } else {
        await apiFetch<{ post: CommunityPost }>("/api/community/posts", {
          method: "POST",
          token,
          body: {
            title: draftPost.title,
            body: draftPost.body,
            subjectTag: draftPost.subjectTag,
            linkUrl: draftPost.linkUrl || null,
            groupId: draftPost.groupId || null,
            displayName,
            imageUrl: user?.imageUrl ?? null,
          },
        });
      }

      clearDraftPost();
      clearImages();
      router.back();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create post",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar style="dark" />
      <CommunityScreenHeader title="Create Post" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          onChangeText={(title) => setDraftPost({ title })}
          placeholder="What do you want to share?"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          value={draftPost.title}
        />

        <Text style={styles.label}>Body</Text>
        <TextInput
          multiline
          onChangeText={(body) => setDraftPost({ body })}
          placeholder="Share your teaching tip or question..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, styles.textArea]}
          value={draftPost.body}
        />

        <Text style={styles.label}>Subject tag</Text>
        <View style={styles.tagRow}>
          {SUBJECT_TAGS.map((tag) => (
            <Pressable
              key={tag}
              accessibilityRole="button"
              onPress={() => setDraftPost({ subjectTag: tag })}
              style={[
                styles.tagChip,
                draftPost.subjectTag === tag ? styles.tagChipActive : null,
              ]}
            >
              <Text style={styles.tagChipLabel}>{tag}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Link (optional)</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={(linkUrl) => setDraftPost({ linkUrl })}
          placeholder="https://..."
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          value={draftPost.linkUrl}
        />

        <PostImagePicker
          canAddMore={canAddMore}
          errorMessage={
            imageError ? getCommunityPostImagesErrorMessage(imageError) : null
          }
          isPicking={isPicking}
          onPickFromFiles={() => {
            void pickFromFiles();
          }}
          onPickImages={() => {
            void pickImages();
          }}
          onRemoveImage={removeImage}
          onTakePhoto={() => {
            void takePhoto();
          }}
          selectedImages={selectedImages}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => {
            void handleSubmit();
          }}
          style={[styles.submit, isSubmitting && styles.submitDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.foreground} size="small" />
          ) : (
            <Text style={styles.submitLabel}>Post to community</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  submit: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.thin,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 16,
    lineHeight: 22,
  },
  tagChip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: borderWidths.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
  },
  tagChipLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
});
