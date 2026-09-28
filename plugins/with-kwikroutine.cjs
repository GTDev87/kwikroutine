const { withAndroidManifest, withMainApplication } = require("expo/config-plugins");
module.exports = (config) => {
  // ONNX 1.24.3's unimodule metadata prevents Expo from registering its RN package.
  // Its own plugin links the library, but does not add the native module to the host.
  config = withMainApplication(config, (config) => {
    const registration = "if (none { it is ai.onnxruntime.reactnative.OnnxruntimePackage }) add(ai.onnxruntime.reactnative.OnnxruntimePackage())";
    if (!config.modResults.contents.includes(registration)) {
      const anchor = "PackageList(this).packages.apply {";
      if (config.modResults.language !== "kt" || !config.modResults.contents.includes(anchor)) {
        throw new Error("Revalidate ONNX package registration for this MainApplication template.");
      }
      config.modResults.contents = config.modResults.contents.replace(anchor, `${anchor}\n          ${registration}`);
    }
    return config;
  });
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (app) {
      app.$["android:allowBackup"] = "false";
      const main = app.activity?.find(
        (a) => a.$["android:name"] === ".MainActivity",
      );
      if (main) main.$["android:launchMode"] = "singleTop";
    }
    return config;
  });
};
