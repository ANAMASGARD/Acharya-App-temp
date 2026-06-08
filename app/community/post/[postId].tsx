import { CommunityPostBody } from "@/components/community/community-post-body";
import { CommunityPostDetailHeader } from "@/components/community/community-post-detail-header";
import { CommunityPostImages } from "@/components/community/community-post-images";
import { CommunityScreenHeader } from "@/components/community/community-screen-header";
import { PostTopActions } from "@/components/community/post-top-actions";
import { VoteBar } from "@/components/community/vote-bar";
import { apiFetch } from "@/lib/api-client";
import { confirmDeletePost } from "@/lib/community/delete-post-alert";
import { formatTimeAgo } from "@/lib/community/time-ago";
import { resolvePostIdParam } from "@/lib/community/post-route";
import { useTeacherDisplayName } from "@/hooks/use-teacher-display-name";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import type {
  CommunityComment,
  CommunityPost,
  PostDetailResponse,
  VoteValue,
} from "@/types/community";
import { useAuth } from "@clerk/expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function PostDetailScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const postId = useMemo(() => resolvePostIdParam(params.postId), [params.postId]);
  const router = useRouter();
  const { getToken, userId, isLoaded } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const displayName = useTeacherDisplayName();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPost = useCallback(async (): Promise<void> => {
    if (!postId) {
      setError("Post not found");
      setIsLoading(false);
      return;
    }

    if (!isLoaded) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();

      if (!token) {
        setError("Please sign in to view this post");
        return;
      }

      const response = await apiFetch<PostDetailResponse>(
        `/api/community/posts/${encodeURIComponent(postId)}`,
        { token },
      );
      setPost(response.post);
      setComments([...response.comments]);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load post",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, postId]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  const updatePost = (patch: Partial<CommunityPost>): void => {
    setPost((current) => (current ? { ...current, ...patch } : current));
  };

  const handleVote = async (value: VoteValue): Promise<void> => {
    if (!post) {
      return;
    }

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<{ score: number; viewerVote: VoteValue | null }>(
        `/api/community/posts/${encodeURIComponent(post.postId)}/vote`,
        { method: "POST", token, body: { value } },
      );
      updatePost({
        score: response.score,
        viewerVote: response.viewerVote,
      });
    } catch {
      // ignore — feed state syncs on return
    }
  };

  const handleRemoveVote = async (): Promise<void> => {
    if (!post) {
      return;
    }

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<{ score: number; viewerVote: VoteValue | null }>(
        `/api/community/posts/${encodeURIComponent(post.postId)}/vote`,
        { method: "DELETE", token },
      );
      updatePost({
        score: response.score,
        viewerVote: response.viewerVote,
      });
    } catch {
      // ignore
    }
  };

  const handleToggleSave = async (): Promise<void> => {
    if (!post) {
      return;
    }

    const token = await getTokenRef.current();
    const save = !post.viewerSaved;
    await apiFetch(`/api/community/posts/${encodeURIComponent(post.postId)}/save`, {
      method: save ? "POST" : "DELETE",
      token,
    });
    updatePost({ viewerSaved: save });
  };

  const canDeletePost =
    post !== null &&
    (post.demoSeed || (userId !== null && post.authorClerkId === userId));

  const handleDelete = (): void => {
    if (!post || isDeleting) {
      return;
    }

    confirmDeletePost({
      isWelcomePost: post.demoWelcome,
      onConfirm: () => {
        void (async () => {
          setIsDeleting(true);

          try {
            const token = await getTokenRef.current();
            await apiFetch(
              `/api/community/posts/${encodeURIComponent(post.postId)}`,
              {
                method: "DELETE",
                token,
              },
            );
            router.back();
          } catch (deleteError) {
            setError(
              deleteError instanceof Error
                ? deleteError.message
                : "Failed to delete post",
            );
          } finally {
            setIsDeleting(false);
          }
        })();
      },
    });
  };

  const handleComment = async (): Promise<void> => {
    if (!post || !commentBody.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getTokenRef.current();
      const response = await apiFetch<{ comment: CommunityComment }>(
        `/api/community/posts/${encodeURIComponent(post.postId)}/comments`,
        {
          method: "POST",
          token,
          body: { body: commentBody, displayName },
        },
      );
      setComments((current) => [...current, response.comment]);
      updatePost({ commentCount: post.commentCount + 1 });
      setCommentBody("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerActions =
    post && !isLoading ? (
      <PostTopActions
        onToggleSave={() => {
          void handleToggleSave();
        }}
        viewerSaved={post.viewerSaved}
      />
    ) : null;

  if (!isLoaded || isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CommunityScreenHeader rightActions={headerActions} title="Post" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.foreground} size="large" />
          <Text style={styles.loadingText}>Loading post…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CommunityScreenHeader title="Post" />
        <View style={styles.center}>
          <Text style={styles.error}>{error ?? "Post not found"}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void loadPost();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar style="dark" />
      <CommunityScreenHeader rightActions={headerActions} title="Post" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CommunityPostDetailHeader post={post} />

        <CommunityPostBody body={post.body} variant="full" />
        <CommunityPostImages images={post.images} variant="detail" />

        {post.linkUrl ? (
          <Text style={styles.link}>{post.linkUrl}</Text>
        ) : null}

        <View style={styles.actionsRow}>
          <VoteBar
            onDownvote={() => {
              void (post.viewerVote === -1 ? handleRemoveVote() : handleVote(-1));
            }}
            onUpvote={() => {
              void (post.viewerVote === 1 ? handleRemoveVote() : handleVote(1));
            }}
            score={post.score}
            viewerVote={post.viewerVote}
          />
          <View style={styles.actionsSpacer} />
          {canDeletePost ? (
            <Pressable
              accessibilityLabel="Delete post"
              accessibilityRole="button"
              disabled={isDeleting}
              onPress={handleDelete}
              style={[styles.deleteButton, isDeleting && styles.disabled]}
            >
              <MaterialCommunityIcons
                color={colors.destructive}
                name="trash-can-outline"
                size={22}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>
            Comments ({post.commentCount})
          </Text>
        </View>

        {comments.map((comment) => (
          <View key={comment.commentId} style={styles.commentCard}>
            <Text style={styles.commentAuthor}>
              {comment.authorDisplayName}
            </Text>
            <Text style={styles.commentBody}>{comment.body}</Text>
            <Text style={styles.commentTime}>
              {formatTimeAgo(comment.createdAt)}
            </Text>
          </View>
        ))}

        <TextInput
          multiline
          onChangeText={setCommentBody}
          placeholder="Add a comment..."
          placeholderTextColor={colors.mutedForeground}
          style={styles.commentInput}
          value={commentBody}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => {
            void handleComment();
          }}
          style={[styles.commentButton, isSubmitting && styles.disabled]}
        >
          <Text style={styles.commentButtonLabel}>Comment</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.lg,
  },
  actionsSpacer: {
    flex: 1,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: borderWidths.thin,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  commentAuthor: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  commentBody: {
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  commentButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  commentButtonLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 14,
    lineHeight: 18,
  },
  commentCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  commentInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    marginTop: spacing.md,
    minHeight: 80,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  commentTime: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    marginTop: spacing.xs,
  },
  commentsHeader: {
    marginTop: spacing.xl,
  },
  commentsTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 18,
    lineHeight: 24,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
  },
  disabled: {
    opacity: 0.7,
  },
  error: {
    color: colors.destructive,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  link: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    textDecorationLine: "underline",
  },
  loadingText: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 14,
    lineHeight: 18,
  },
  safeArea: {
    backgroundColor: colors.cream,
    flex: 1,
  },
});
