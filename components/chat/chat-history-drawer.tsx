import { ChatHistoryCard } from "@/components/chat/chat-history-card";
import { DEMO_CHAT_HISTORY } from "@/constants/chat-history-demo";
import { colors } from "@/theme/colors";
import { borderWidths, radii, shadows, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import type { ChatConversationSummary } from "@/types/chat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.84, 340);
const BLUR_INTENSITY = Platform.OS === "android" ? 42 : 36;

const SPRING_CONFIG = {
  damping: 24,
  mass: 0.85,
  stiffness: 320,
};

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

type Props = Readonly<{
  visible: boolean;
  conversations: ChatConversationSummary[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onNewChat: () => void;
}>;

export function ChatHistoryDrawer({
  visible,
  conversations,
  isLoading,
  error,
  onClose,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
}: Props): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [hiddenDemoIds, setHiddenDemoIds] = useState<string[]>([]);

  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropProgress = useSharedValue(0);

  const displayConversations = useMemo(() => {
    const live = conversations;
    const demo = DEMO_CHAT_HISTORY.filter(
      (item) => !hiddenDemoIds.includes(item.conversationId),
    );

    if (live.length > 0) {
      return live;
    }

    return demo;
  }, [conversations, hiddenDemoIds]);

  const finishClose = (): void => {
    setMounted(false);
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdropProgress.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
      translateX.value = withSpring(0, SPRING_CONFIG);
      return;
    }

    if (!mounted) {
      return;
    }

    backdropProgress.value = withTiming(0, {
      duration: 220,
      easing: Easing.in(Easing.cubic),
    });
    translateX.value = withTiming(
      -DRAWER_WIDTH,
      {
        duration: 240,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [backdropProgress, mounted, translateX, visible]);

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropProgress.value,
  }));

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: backdropProgress.value * BLUR_INTENSITY,
  }));

  const handleSelect = (conversation: ChatConversationSummary): void => {
    if (conversation.isDemo) {
      onClose();
      return;
    }

    onSelectConversation(conversation.conversationId);
    onClose();
  };

  const handleDelete = (conversation: ChatConversationSummary): void => {
    if (conversation.isDemo) {
      setHiddenDemoIds((current) => [...current, conversation.conversationId]);
      return;
    }

    void onDeleteConversation(conversation.conversationId);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      <View style={styles.overlay}>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.backdropWrap, backdropAnimatedStyle]}
        >
          <AnimatedBlurView
            animatedProps={blurAnimatedProps}
            experimentalBlurMethod={
              Platform.OS === "android" ? "dimezisBlurView" : undefined
            }
            intensity={BLUR_INTENSITY}
            style={StyleSheet.absoluteFillObject}
            tint="dark"
          />
          <View style={styles.backdropTint} />
          <Pressable
            accessibilityLabel="Close history"
            onPress={onClose}
            style={styles.backdropPressable}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            drawerAnimatedStyle,
            { width: DRAWER_WIDTH },
          ]}
        >
          <View style={styles.drawerShell}>
            <View
              style={[
                styles.drawerHeader,
                { paddingTop: insets.top + spacing.sm },
              ]}
            >
              <Text style={styles.drawerTitle}>Chat History</Text>
              <Pressable
                accessibilityLabel="Close drawer"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.foreground}
                  name="close"
                  size={20}
                />
              </Pressable>
            </View>

            <View
              style={[
                styles.drawerBody,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
            >
              <Pressable
                onPress={() => {
                  onNewChat();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.newChatButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.foreground}
                  name="plus"
                  size={18}
                />
                <Text style={styles.newChatLabel}>New Chat</Text>
              </Pressable>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Chat History</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {displayConversations.length}
                  </Text>
                </View>
              </View>

              {isLoading ? (
                <ActivityIndicator color={colors.foreground} style={styles.loader} />
              ) : null}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                style={styles.list}
              >
                {displayConversations.map((conversation) => (
                  <ChatHistoryCard
                    conversation={conversation}
                    key={conversation.conversationId}
                    onDelete={() => {
                      handleDelete(conversation);
                    }}
                    onPress={() => {
                      handleSelect(conversation);
                    }}
                  />
                ))}

                {!isLoading && displayConversations.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No chats yet. Start a new conversation.
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 26, 26, 0.22)",
  },
  backdropWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: borderWidths.default,
    height: 36,
    justifyContent: "center",
    width: 36,
    ...shadows.sm,
  },
  countBadge: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: borderWidths.thin,
    justifyContent: "center",
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
  },
  drawer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  drawerBody: {
    backgroundColor: colors.card,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  drawerHeader: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderBottomColor: colors.border,
    borderBottomWidth: borderWidths.default,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  drawerShell: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRightWidth: borderWidths.default,
    flex: 1,
    ...shadows.lg,
  },
  drawerTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 22,
    lineHeight: 26,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    paddingTop: spacing.lg,
    textAlign: "center",
  },
  errorText: {
    color: colors.destructive,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  list: {
    flex: 1,
    marginTop: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  newChatButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.default,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  newChatLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 16,
  },
  overlay: {
    flex: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 16,
  },
});
