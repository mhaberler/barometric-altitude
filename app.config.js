module.exports = {
  expo: {
    name: "Barometric Altitude",
    slug: "barometric-altitude",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ["**/*"],
    newArchEnabled: true,
    android: {
      package: "com.haberlerm.barometricaltitude",
      permissions: [
        "android.permission.BODY_SENSORS",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.INTERNET",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.SENSOR_DELAY_FASTEST",
      ],
    },
    ios: {
      bundleIdentifier: "com.haberlerm.barometricaltitude",
      appleTeamId: "HLX9TTSLFS",
      infoPlist: {
        NSMotionUsageDescription:
          "Since iOS 17.4 the access is required to read the built-in barometer pressure sensor. Without this permission, the app will not be able to use the barometer option for altitude. Enable in Settings > App Name > Motion & Fitness",
        NSLocationWhenInUseUsageDescription:
          "This app needs your location to provide location-based features.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app needs your location to provide location-based features even when running in the background.",
      },
    },
    plugins: [
      [
        "expo-dev-client",
        {
          launchMode: "most-recent", // or "launcher"
        },
      ],
    ],
  },
};