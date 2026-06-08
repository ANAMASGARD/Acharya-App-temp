import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { colors } from "@/theme/colors";
import { borderWidths, radii, shadows, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DIALOG_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 288);
const WINDOW_HEIGHT = Dimensions.get("window").height;

type Props = Readonly<{
  visible: boolean;
  initialTitle: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (title: string) => void;
}>;

function computeCardLift(
  keyboardHeight: number,
  cardHeight: number,
  bottomInset: number,
): number {
  if (keyboardHeight <= 0 || cardHeight <= 0) {
    return 0;
  }

  const centeredBottom = WINDOW_HEIGHT / 2 + cardHeight / 2;
  const keyboardTop = WINDOW_HEIGHT - keyboardHeight;
  const clearance = spacing.lg + bottomInset;
  const overlap = centeredBottom - keyboardTop + clearance;

  return overlap > 0 ? overlap : 0;
}

export function ChatEditTitleDialog({
  visible,
  initialTitle,
  isSaving = false,
  onCancel,
  onSave,
}: Props): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight(visible);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [cardHeight, setCardHeight] = useState(0);

  const cardLift = useMemo(
    () => computeCardLift(keyboardHeight, cardHeight, insets.bottom),
    [cardHeight, insets.bottom, keyboardHeight],
  );

  useEffect(() => {
    if (visible) {
      setDraftTitle(initialTitle);
    }
  }, [initialTitle, visible]);

  if (!visible) {
    return null;
  }

  const trimmed = draftTitle.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialTitle.trim();

  const handleCancel = (): void => {
    Keyboard.dismiss();
    onCancel();
  };

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <BlurView
        experimentalBlurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
        intensity={Platform.OS === "android" ? 48 : 40}
        style={StyleSheet.absoluteFillObject}
        tint="dark"
      />
      <View style={styles.backdropTint} />
      <Pressable
        accessibilityLabel="Dismiss edit dialog"
        onPress={handleCancel}
        style={styles.backdropPressable}
      />

      <View
        onLayout={(event) => {
          setCardHeight(event.nativeEvent.layout.height);
        }}
        style={[styles.card, { transform: [{ translateY: -cardLift }] }]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.title}>Rename chat</Text>
          <Pressable
            accessibilityLabel="Close"
            disabled={isSaving}
            onPress={handleCancel}
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

        <Text style={styles.hint}>
          Give this conversation a name you will recognize in your history.
        </Text>

        <TextInput
          autoFocus
          editable={!isSaving}
          maxLength={80}
          onChangeText={setDraftTitle}
          placeholder="Chat name"
          placeholderTextColor={colors.mutedForeground}
          selectTextOnFocus
          style={styles.input}
          value={draftTitle}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving || !canSave}
            onPress={() => {
              Keyboard.dismiss();
              onSave(trimmed);
            }}
            style={({ pressed }) => [
              styles.saveButton,
              (isSaving || !canSave) && styles.disabled,
              pressed && canSave && !isSaving && styles.pressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.foreground} size="small" />
            ) : (
              <Text style={styles.saveLabel}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 26, 26, 0.28)",
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.default,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    ...shadows.sm,
  },
  cancelLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
  },
  card: {
    alignSelf: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: borderWidths.default,
    padding: spacing.md,
    width: DIALOG_WIDTH,
    ...shadows.lg,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: borderWidths.default,
    height: 32,
    justifyContent: "center",
    width: 32,
    ...shadows.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  hint: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.default,
    color: colors.foreground,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.default,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    ...shadows.sm,
  },
  saveLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
  },
  title: {
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamilies.head,
    fontSize: 18,
    lineHeight: 22,
  },
});
