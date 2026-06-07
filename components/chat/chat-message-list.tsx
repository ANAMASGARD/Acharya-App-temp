import { ChatBubble } from "@/components/chat/chat-bubble";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/tokens";
import type { ChatMessage } from "@/types/chat";
import { useEffect, useRef } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

type Props = Readonly<{
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  isStreaming: boolean;
  streamingMessageId?: string | null;
  contentPaddingBottom?: number;
}>;

export function ChatMessageList({
  messages,
  isLoadingHistory,
  isStreaming,
  streamingMessageId,
  contentPaddingBottom = spacing.md,
}: Props): React.ReactElement {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isLoadingHistory, isStreaming]);

  if (isLoadingHistory) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.foreground} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: contentPaddingBottom },
      ]}
      keyboardShouldPersistTaps="handled"
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      {messages.map((message) => (
        <ChatBubble
          isStreaming={isStreaming && message.messageId === streamingMessageId}
          key={message.messageId}
          message={message}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
});
