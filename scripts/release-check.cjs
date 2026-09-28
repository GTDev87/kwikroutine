// Prevent shipping a production app that silently uses a missing model or unavailable billing.
if (process.env.EAS_BUILD_PROFILE === "production") {
  require("./check-model.cjs");
  const platform = process.env.EAS_BUILD_PLATFORM;
  const key =
    platform === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!key || key.startsWith("test_"))
    throw new Error(
      "Set this platform’s production RevenueCat public SDK key before building.",
    );
}
