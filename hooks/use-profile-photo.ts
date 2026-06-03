import { isClerkAPIResponseError, useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

type UseProfilePhotoResult = {
  isUploading: boolean;
  error: string | null;
  pickAndUpload: () => Promise<void>;
};

export function useProfilePhoto(): UseProfilePhotoResult {
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = useCallback(async (): Promise<void> => {
    if (!user) {
      return;
    }

    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;

    setIsUploading(true);
    try {
      await user.setProfileImage({ file: dataUrl });
      await user.reload();
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Upload failed.");
      } else {
        setError("Could not update profile photo. Try again.");
      }
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  return { isUploading, error, pickAndUpload };
}
