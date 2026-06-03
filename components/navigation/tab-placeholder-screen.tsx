import { colors } from "@/theme/colors";
import { fontFamilies } from "@/theme/typography";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = Readonly<{
  title: string;
}>;

export function TabPlaceholderScreen({ title }: Props): React.ReactElement {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fontFamilies.head,
    fontSize: 28,
    lineHeight: 34,
    color: colors.foreground,
    textAlign: "center",
  },
});
