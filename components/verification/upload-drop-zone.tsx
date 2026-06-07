import { NeoButton } from "@/components/ui/neo-button";
import {
  formatFileSize,
  getNotesUploadErrorMessage,
} from "@/lib/notes-file-validation";
import { colors } from "@/theme/colors";
import { borderWidths, radii, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import type { NotesUploadError, NotesUploadFile } from "@/types/notes-verification";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type Props = Readonly<{
  selectedFile: NotesUploadFile | null;
  isPicking: boolean;
  error: NotesUploadError | null;
  canVerify: boolean;
  onPickDocument: () => void;
  onClearFile: () => void;
}>;

export function UploadDropZone({
  selectedFile,
  isPicking,
  error,
  canVerify,
  onPickDocument,
  onClearFile,
}: Props): React.ReactElement {
  const hasFile = selectedFile !== null;
  const showVerifyHelper = hasFile && !canVerify;

  const dropZoneStyle = [styles.dropZone];

  return (
    <View style={styles.container}>
      {hasFile ? (
        <View style={dropZoneStyle}>
          {isPicking ? (
            <ActivityIndicator color={colors.foreground} size="small" />
          ) : (
            <View style={styles.filePreview}>
              <Pressable
                accessibilityLabel="Change selected file"
                onPress={onPickDocument}
                style={({ pressed }) => [
                  styles.fileTapArea,
                  pressed ? styles.fileTapAreaPressed : null,
                ]}
              >
                <View style={styles.fileIconWrap}>
                  <MaterialCommunityIcons
                    color={colors.foreground}
                    name="file-document-outline"
                    size={22}
                  />
                </View>
                <View style={styles.fileMeta}>
                  <Text numberOfLines={1} style={styles.fileName}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(selectedFile.sizeBytes)}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityLabel="Remove selected file"
                hitSlop={8}
                onPress={onClearFile}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed ? styles.clearButtonPressed : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.foreground}
                  name="close"
                  size={18}
                />
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Upload notes, PDF or Word document"
          accessibilityRole="button"
          disabled={isPicking}
          onPress={onPickDocument}
          style={({ pressed }) => [
            ...dropZoneStyle,
            pressed && !isPicking ? styles.dropZonePressed : null,
          ]}
        >
          {isPicking ? (
            <ActivityIndicator color={colors.foreground} size="small" />
          ) : (
            <Text style={styles.zoneLabel}>Upload PDF/Doc</Text>
          )}
        </Pressable>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons
            color={colors.foreground}
            name="alert-circle-outline"
            size={18}
          />
          <Text style={styles.errorText}>{getNotesUploadErrorMessage(error)}</Text>
        </View>
      ) : null}

      <View style={styles.ctaWrap}>
        {hasFile ? (
          <NeoButton
            disabled
            iconName="check-decagram"
            label="Verify Notes"
            onPress={() => undefined}
          />
        ) : (
          <NeoButton
            disabled={isPicking}
            iconName="tray-arrow-up"
            label="Upload Notes"
            onPress={onPickDocument}
          />
        )}
      </View>

      {showVerifyHelper ? (
        <Text style={styles.helperText}>
          Verification coming soon — your file is ready.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    height: spacing.touch,
    justifyContent: "center",
    width: spacing.touch,
  },
  clearButtonPressed: {
    opacity: 0.85,
  },
  container: {
    gap: spacing.md,
  },
  ctaWrap: {
    alignItems: "stretch",
  },
  dropZone: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderStyle: "dashed",
    borderWidth: borderWidths.thin,
    justifyContent: "center",
    minHeight: 168,
    padding: spacing.lg,
  },
  dropZonePressed: {
    backgroundColor: colors.accent,
    opacity: 0.95,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  fileIconWrap: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  fileMeta: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    lineHeight: 20,
  },
  filePreview: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  fileTapArea: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: spacing.touch,
  },
  fileTapAreaPressed: {
    opacity: 0.85,
  },
  fileSize: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  zoneLabel: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansBold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
  },
});
