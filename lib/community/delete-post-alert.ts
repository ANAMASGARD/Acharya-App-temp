import { Alert } from "react-native";

export function confirmDeletePost(
  options: Readonly<{
    isWelcomePost?: boolean;
    onConfirm: () => void;
  }>,
): void {
  Alert.alert(
    "Delete post",
    options.isWelcomePost
      ? "Remove this welcome guide from your feed?"
      : "Delete this post permanently?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: options.onConfirm,
      },
    ],
  );
}
