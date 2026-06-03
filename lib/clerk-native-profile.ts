import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform, UIManager } from "react-native";

/**
 * Clerk's UserProfileView requires native code from a dev build (expo prebuild + run).
 * Expo Go registers the JS component but not the native view — rendering it crashes.
 */
export function isClerkNativeProfileAvailable(): boolean {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return false;
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }

  try {
    const config = UIManager.getViewManagerConfig?.("ClerkUserProfileView");
    if (config != null) {
      return true;
    }
    return (
      (UIManager as { ClerkUserProfileView?: unknown }).ClerkUserProfileView !=
      null
    );
  } catch {
    return false;
  }
}
