import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatHistoryDrawer } from "@/components/chat/chat-history-drawer";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { useChat } from "@/hooks/use-chat";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
  type KeyboardEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const COMPOSER_BOTTOM_GAP = spacing.xs;

export function ChatScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(96);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (event: KeyboardEvent): void => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const onHide = (): void => {
      setKeyboardHeight(0);
    };

    const showListener = Keyboard.addListener(showEvent, onShow);
    const hideListener = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const {
    messages,
    draftText,
    isLoadingHistory,
    isStreaming,
    error,
    setDraftText,
    sendMessage,
    retryLast,
    startNewChat,
    openConversation,
  } = useChat();

  const history = useChatHistory();
  const voiceInput = useVoiceInput();

  const streamingMessageId = useMemo(() => {
    if (!isStreaming) {
      return null;
    }

    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    return lastAssistant?.messageId ?? null;
  }, [isStreaming, messages]);

  const handleSend = useCallback((): void => {
    if (!draftText.trim() || isStreaming) {
      return;
    }

    void sendMessage(draftText);
  }, [draftText, isStreaming, sendMessage]);

  const handleToggleMic = useCallback((): void => {
    if (voiceInput.status === "recording") {
      void (async () => {
        const transcript = await voiceInput.stopRecording();

        if (transcript) {
          await sendMessage(transcript);
        }
      })();
      return;
    }

    void voiceInput.startRecording();
  }, [sendMessage, voiceInput]);

  const handleVoiceAgent = useCallback((): void => {
    // Reserved for live voice-agent conversation (Sarvam agent flow).
  }, []);

  const keyboardLift =
    keyboardHeight > 0
      ? Platform.OS === "android"
        ? Math.max(0, keyboardHeight - insets.bottom)
        : keyboardHeight
      : 0;

  const composerOffset =
    keyboardLift > 0 ? keyboardLift + COMPOSER_BOTTOM_GAP : COMPOSER_BOTTOM_GAP;

  const listBottomPadding = composerHeight + composerOffset + spacing.sm;

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar style="dark" />

        <ChatHeader
          onOpenHistory={() => {
            void history.openDrawer();
          }}
        />

        <View style={styles.flex}>
          <View style={styles.body}>
            {error || voiceInput.error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error ?? voiceInput.error}</Text>
                {error ? (
                  <Text onPress={() => void retryLast()} style={styles.retryText}>
                    Retry
                  </Text>
                ) : null}
              </View>
            ) : null}

            <ChatMessageList
              contentPaddingBottom={listBottomPadding}
              isLoadingHistory={isLoadingHistory}
              isStreaming={isStreaming}
              messages={messages}
              streamingMessageId={streamingMessageId}
            />
          </View>

          <View
            onLayout={(event) => {
              setComposerHeight(event.nativeEvent.layout.height);
            }}
            style={[styles.composerDock, { bottom: composerOffset }]}
          >
            <ChatComposer
              disabled={isStreaming}
              draftText={draftText}
              onChangeText={setDraftText}
              onSend={handleSend}
              onToggleMic={handleToggleMic}
              onVoiceAgent={handleVoiceAgent}
              voiceInputStatus={voiceInput.status}
            />
          </View>
        </View>
      </SafeAreaView>

      <ChatHistoryDrawer
        conversations={history.conversations}
        error={history.error}
        isLoading={history.isLoading}
        onClose={history.closeDrawer}
        onDeleteConversation={history.deleteConversation}
        onNewChat={() => {
          void startNewChat();
        }}
        onSelectConversation={(conversationId) => {
          void openConversation(conversationId);
        }}
        visible={history.isOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  composerDock: {
    left: 0,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
  },
  errorBanner: {
    backgroundColor: colors.coral,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  flex: {
    flex: 1,
  },
  retryText: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    marginTop: spacing.xs,
    textDecorationLine: "underline",
  },
  safeArea: {
    backgroundColor: colors.cream,
    flex: 1,
  },
});
