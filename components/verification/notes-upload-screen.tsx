import { AnimatedMenuDots } from "@/components/verification/animated-menu-dots";
import { CurriculumSelectSheet } from "@/components/verification/curriculum-select-sheet";
import { UploadDropZone } from "@/components/verification/upload-drop-zone";
import { VerificationGapsTimeline } from "@/components/verification/verification-gaps-timeline";
import { DEMO_VERIFICATION_GAPS } from "@/data/notes-verification-demo";
import { useCurriculumSelection } from "@/hooks/use-curriculum-selection";
import { useNotesUpload } from "@/hooks/use-notes-upload";
import { getTeachingClassesForCurriculum } from "@/lib/teaching-classes";
import { usePreferencesStore } from "@/store/preferences-store";
import { colors } from "@/theme/colors";
import { borderWidths, radii, shadows, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function NotesUploadScreen(): React.ReactElement {
  const router = useRouter();
  const teachingClassIds = usePreferencesStore((state) => state.teachingClassIds);
  const {
    selectedFile,
    isPicking,
    error,
    canVerify,
    pickDocument,
    clearFile,
  } = useNotesUpload();
  const {
    sheetVisible,
    expandedClassId,
    selection,
    uploadedBookName,
    openSheet,
    closeSheet,
    toggleClass,
    selectSubject,
    clearSelection,
    setUploadedBookName,
  } = useCurriculumSelection();

  const curriculumClasses = useMemo(
    () => getTeachingClassesForCurriculum(teachingClassIds),
    [teachingClassIds],
  );

  const openTeachingClasses = (): void => {
    closeSheet();
    router.push("/profile/teaching-classes");
  };

  useEffect(() => {
    if (
      selection &&
      teachingClassIds.length > 0 &&
      !teachingClassIds.includes(selection.classId)
    ) {
      clearSelection();
    }
  }, [clearSelection, selection, teachingClassIds]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => {
            router.back();
          }}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.backButtonPressed : null,
          ]}
        >
          <MaterialCommunityIcons color={colors.foreground} name="arrow-left" size={22} />
        </Pressable>

        <Text numberOfLines={2} style={styles.title}>
          Verify Lesson Notes
        </Text>

        <Pressable
          accessibilityLabel="Select curriculum"
          accessibilityRole="button"
          onPress={openSheet}
          style={({ pressed }) => [
            styles.menuButton,
            pressed ? styles.menuButtonPressed : null,
          ]}
        >
          <AnimatedMenuDots />
        </Pressable>
      </View>

      {selection ? (
        <View style={styles.selectionBanner}>
          <MaterialCommunityIcons
            color={colors.foreground}
            name="book-open-page-variant"
            size={18}
          />
          <Text numberOfLines={1} style={styles.selectionText}>
            {selection.classLabel} · {selection.subjectLabel}
          </Text>
          <Pressable
            accessibilityLabel="Clear curriculum selection"
            hitSlop={8}
            onPress={clearSelection}
            style={({ pressed }) => [
              styles.clearSelectionButton,
              pressed ? styles.clearSelectionPressed : null,
            ]}
          >
            <MaterialCommunityIcons color={colors.foreground} name="close" size={18} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <UploadDropZone
          canVerify={canVerify}
          error={error}
          isPicking={isPicking}
          onClearFile={clearFile}
          onPickDocument={() => {
            void pickDocument();
          }}
          selectedFile={selectedFile}
        />

        <VerificationGapsTimeline gaps={DEMO_VERIFICATION_GAPS} />
      </ScrollView>

      <CurriculumSelectSheet
        classes={curriculumClasses}
        expandedClassId={expandedClassId}
        onClose={closeSheet}
        onOpenTeachingClasses={openTeachingClasses}
        onSelectSubject={selectSubject}
        onToggleClass={toggleClass}
        onUploadedBook={setUploadedBookName}
        selection={selection}
        uploadedBookName={uploadedBookName}
        visible={sheetVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.default,
    height: 40,
    justifyContent: "center",
    width: 40,
    ...shadows.sm,
  },
  backButtonPressed: {
    opacity: 0.9,
    shadowOffset: { width: 1, height: 1 },
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  clearSelectionButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: borderWidths.thin,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  clearSelectionPressed: {
    opacity: 0.85,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: colors.destructive,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: borderWidths.thin,
    height: 40,
    justifyContent: "center",
    width: 40,
    ...shadows.sm,
  },
  menuButtonPressed: {
    opacity: 0.88,
  },
  safeArea: {
    backgroundColor: colors.cream,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  selectionBanner: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: borderWidths.thin,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectionText: {
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: 18,
  },
  title: {
    color: colors.foreground,
    flex: 1,
    fontFamily: fontFamilies.head,
    fontSize: 26,
    lineHeight: 30,
  },
});
