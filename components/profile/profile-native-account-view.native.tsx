import { isClerkNativeProfileAvailable } from "@/lib/clerk-native-profile";
import { UserProfileView } from "@clerk/expo/native";
import { StyleSheet, View } from "react-native";
import { ProfileAccountFallback } from "./profile-account-fallback";

type Props = Readonly<{
  style?: object;
}>;

/**
 * Renders Clerk UserProfileView only when the native view is linked.
 * Avoids Expo Go crash: "View config not found for component ClerkUserProfileView".
 */
export function ProfileNativeAccountView({ style }: Props): React.ReactElement {
  if (!isClerkNativeProfileAvailable()) {
    return <ProfileAccountFallback />;
  }

  return (
    <View style={[styles.wrap, style]}>
      <UserProfileView style={styles.profileView} />
    </View>
  );
}

const styles = StyleSheet.create({
  profileView: {
    flex: 1,
  },
  wrap: {
    flex: 1,
  },
});
