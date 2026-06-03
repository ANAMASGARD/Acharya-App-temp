import { ProfileAccountFallback } from "./profile-account-fallback";

type Props = Readonly<{
  style?: object;
}>;

/** Web and TypeScript default — native build uses profile-native-account-view.native.tsx */
export function ProfileNativeAccountView(_props: Props): React.ReactElement {
  return <ProfileAccountFallback showDevBuildHint={false} />;
}
