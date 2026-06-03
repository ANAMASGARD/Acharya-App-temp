import { clerkAccountPortalUrl } from "@/constants/legal";
import { useClerk } from "@clerk/expo";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

type UseProfileAccountResult = {
  copyUserId: (userId: string) => Promise<void>;
  signOut: () => void;
  openAccountPortal: () => Promise<void>;
  hasAccountPortal: boolean;
};

export function useProfileAccount(): UseProfileAccountResult {
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();
  const hasAccountPortal = clerkAccountPortalUrl.length > 0;

  const copyUserId = useCallback(async (userId: string): Promise<void> => {
    await Clipboard.setStringAsync(userId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "User ID copied to clipboard.");
  }, []);

  const performSignOut = useCallback(async (): Promise<void> => {
    await clerkSignOut();
    router.replace("/onboarding");
  }, [clerkSignOut, router]);

  const signOut = useCallback((): void => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of Acharya?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            void performSignOut();
          },
        },
      ],
    );
  }, [performSignOut]);

  const openAccountPortal = useCallback(async (): Promise<void> => {
    if (!hasAccountPortal) {
      Alert.alert(
        "Account portal",
        "Set EXPO_PUBLIC_CLERK_ACCOUNT_PORTAL_URL in .env to open account settings in the browser.",
      );
      return;
    }
    await WebBrowser.openBrowserAsync(clerkAccountPortalUrl);
  }, [hasAccountPortal]);

  return {
    copyUserId,
    signOut,
    openAccountPortal,
    hasAccountPortal,
  };
}
