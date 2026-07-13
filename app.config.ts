import type { ExpoConfig } from "expo/config";

const isStandaloneBuild = process.env.STANDALONE_BUILD === "1";
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const config: ExpoConfig = {
  name: "Acharya",
  slug: "acharya-app",
  version: "1.0.2",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "acharyaapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.acharya.app",
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "Acharya needs access to your photos so you can set a profile picture.",
      NSCameraUsageDescription:
        "Acharya needs access to your camera so you can take a profile picture.",
      NSMicrophoneUsageDescription:
        "Acharya records your class so we can transcribe and coach you.",
    },
    bitcode: false,
  },
  android: {
    package: "com.acharya.app",
    adaptiveIcon: {
      backgroundColor: "#FFF8E7",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    permissions: [
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.CAMERA",
      "android.permission.INTERNET",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.WAKE_LOCK",
      "android.permission.BLUETOOTH",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION",
      "android.permission.FOREGROUND_SERVICE_MICROPHONE",
      "android.permission.POST_NOTIFICATIONS",
    ],
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    softwareKeyboardLayoutMode: "pan",
  },
  web: {
    output: "server",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#FFF8E7",
        dark: {
          backgroundColor: "#1A1A1A",
        },
      },
    ],
    "@clerk/expo",
    "expo-secure-store",
    "expo-web-browser",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Acharya needs access to your photos so you can set a profile picture.",
        cameraPermission:
          "Acharya needs access to your camera so you can take a profile picture.",
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission:
          "Acharya records your class so we can transcribe and coach you.",
        enableBackgroundRecording: true,
      },
    ],
    [
      "@livekit/react-native-expo-plugin",
      {
        android: {
          audioType: "communication",
        },
      },
    ],
    "@config-plugins/react-native-webrtc",
    // Dev client only for local development — excluded from judge/submission APK.
    ...(isStandaloneBuild ? [] : ["expo-dev-client" as const]),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "b9e06999-942a-4f0a-8429-633865958f1b",
    },
    ...(apiUrl ? { apiUrl } : {}),
  },
  owner: "animint2",
};

export default config;
