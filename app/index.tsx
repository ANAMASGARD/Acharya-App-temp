import { images } from "@/constants/images";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function Index() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        gap: 22,
        paddingHorizontal: 22,
        paddingBottom: 36,
        paddingTop: 54,
      }}
    >
      <View className="gap-1">
        <Text className="font-head text-[26px] leading-8 text-foreground">
          Acharya Android Mobile UI/UX Design Flow & Specification.
        </Text>
        <Text className="text-body text-muted-foreground">
          Mobile Design System & Component Kit
        </Text>
      </View>

      <View className="gap-3">
        <Text className="font-head text-[18px] text-foreground">
          Color Palette
        </Text>
        <View className="flex-row gap-2">
          <ColorSwatch
            className="bg-primary"
            label="Primary Yellow"
            value="#FFDB33"
          />
          <ColorSwatch
            className="bg-secondary"
            isDark
            label="Primary Black"
            value="#000000"
          />
          <ColorSwatch className="bg-acharya-mint" label="Mint Green" />
        </View>
        <View className="flex-row gap-2">
          <ColorSwatch className="bg-acharya-sky" label="Sky Blue" />
          <ColorSwatch className="bg-acharya-coral" label="Coral" />
          <ColorSwatch className="bg-acharya-lime" label="Lime" />
        </View>
      </View>

      <View className="gap-4">
        <Text className="font-head text-[18px] text-foreground">
          Typography
        </Text>
        <TypeRow label="H1" sample="Acharya" sampleClassName="text-head-h1" />
        <TypeRow
          label="H2"
          sample="Ad Acharya"
          sampleClassName="text-head-h2"
        />
        <TypeRow label="Body" sample="Ad Acharya" sampleClassName="text-body" />
        <TypeRow
          label="Caption"
          sample="Ad Acharya"
          sampleClassName="text-caption"
        />
      </View>

      <View className="gap-4">
        <Text className="font-head text-[18px] text-foreground">
          UI Components
        </Text>
        <View className="flex-row flex-wrap gap-3">
          <Pressable className="neo-button-primary min-touch items-center justify-center px-6 py-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <Text className="font-head text-[13px] text-primary-foreground">
              Button
            </Text>
          </Pressable>
          <Pressable className="neo-button-secondary min-touch items-center justify-center px-6 py-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <Text className="font-head text-[13px] text-foreground">
              Button 2
            </Text>
          </Pressable>
          <View className="min-touch w-full items-center justify-center border-brutal bg-card px-5">
            <Text className="font-head text-[13px] text-foreground">
              Black outline
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Text className="font-sans-medium text-[14px] text-foreground">
            Inputs
          </Text>
          <View className="neo-input" />
          <View className="neo-input h-24 shadow-sm" />
        </View>

        <View className="gap-3">
          <Text className="font-sans-medium text-[14px] text-foreground">
            Cards
          </Text>
          <View className="neo-card h-28" />
        </View>
      </View>

      <View className="gap-3">
        <Text className="font-head text-[18px] text-foreground">
          Mascot States
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {["Happy", "Teaching", "Namaste", "Reading"].map((label) => (
            <View
              className="neo-card h-32 w-[47%] items-center justify-center p-3"
              key={label}
            >
              <Image
                contentFit="contain"
                source={images.mascotLogo}
                style={{ height: 76, width: 76 }}
              />
              <Text className="text-caption text-foreground">{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

type ColorSwatchProps = Readonly<{
  className: string;
  isDark?: boolean;
  label: string;
  value?: string;
}>;

function ColorSwatch({
  className,
  isDark = false,
  label,
  value,
}: ColorSwatchProps) {
  return (
    <View className={`${className} h-24 flex-1 justify-end p-2`}>
      <Text
        className={`font-sans-medium text-[10px] ${
          isDark ? "text-secondary-foreground" : "text-foreground"
        }`}
      >
        {label}
      </Text>
      {value ? (
        <Text
          className={`font-sans text-[10px] ${
            isDark ? "text-secondary-foreground" : "text-foreground"
          }`}
        >
          {value}
        </Text>
      ) : null}
    </View>
  );
}

type TypeRowProps = Readonly<{
  label: string;
  sample: string;
  sampleClassName: string;
}>;

function TypeRow({ label, sample, sampleClassName }: TypeRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className={`${sampleClassName} flex-1 text-foreground`}>
        {sample}
      </Text>
      <Text className="font-head text-[18px] text-foreground">{label}</Text>
    </View>
  );
}
