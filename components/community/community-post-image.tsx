import { getCommunityPostImageUrl } from "@/lib/community/post-image-url";
import { colors } from "@/theme/colors";
import { borderWidths, radii } from "@/theme/tokens";
import type { CommunityPostImage } from "@/types/community";
import { useAuth } from "@clerk/expo";
import { Image, type ImageSource } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
} from "react-native";

type Props = Readonly<{
  image: CommunityPostImage;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain";
}>;

export function CommunityPostImageView({
  image,
  style,
  contentFit = "cover",
}: Props): React.ReactElement {
  const { getToken } = useAuth();
  const [source, setSource] = useState<ImageSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = await getToken();

      if (cancelled) {
        return;
      }

      setSource({
        uri: getCommunityPostImageUrl(image.imageId),
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, image.imageId]);

  if (!source) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator color={colors.foreground} size="small" />
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={image.fileName}
      contentFit={contentFit}
      source={source}
      style={[styles.image, style]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    justifyContent: "center",
  },
});
