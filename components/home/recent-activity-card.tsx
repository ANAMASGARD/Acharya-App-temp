import { NeoDashboardCard } from "@/components/home/neo-dashboard-card";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import type { RecentActivityItem } from "@/types/home-dashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type Props = Readonly<{
  items: RecentActivityItem[];
}>;

function ActivityAvatar({
  item,
}: Readonly<{ item: RecentActivityItem }>): React.ReactElement {
  if (item.avatarKind === "letter") {
    return (
      <View style={[styles.avatar, styles.avatarLetter]}>
        <Text style={styles.avatarLetterText}>
          {item.avatarLetter ?? item.title.charAt(0)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.avatar, styles.avatarIcon]}>
      <MaterialCommunityIcons
        color={colors.foreground}
        name="package-variant-closed"
        size={18}
      />
    </View>
  );
}

export function RecentActivityCard({ items }: Props): React.ReactElement {
  return (
    <NeoDashboardCard backgroundColor={colors.card}>
      <Text style={styles.title}>Recent Activity</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <ActivityAvatar item={item} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowTime}>{item.timeAgo}</Text>
            </View>
          </View>
        ))}
      </View>
    </NeoDashboardCard>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 2,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarIcon: {
    backgroundColor: colors.mint,
  },
  avatarLetter: {
    backgroundColor: colors.primary,
  },
  avatarLetterText: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 18,
    lineHeight: 22,
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowTime: {
    color: colors.mutedForeground,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  rowTitle: {
    color: colors.foreground,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 15,
    lineHeight: 20,
  },
  title: {
    color: colors.foreground,
    fontFamily: fontFamilies.head,
    fontSize: 20,
    lineHeight: 26,
  },
});
