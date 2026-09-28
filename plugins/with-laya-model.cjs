const { withXcodeProject, withDangerousMod, withAppBuildGradle, withSettingsGradle, IOSConfig } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
const files = ['encoder.onnx', 'head.onnx', 'tokenizer.layajson', 'config.layajson'];
module.exports = config => {
  const assetPack = process.env.EAS_BUILD_PROFILE === 'production' || process.env.KWIK_ANDROID_ASSET_PACK === '1';
  config = withXcodeProject(config, c => {
    const project = c.modResults;
    IOSConfig.XcodeUtils.ensureGroupRecursively(project, 'Resources');
    for (const name of files) {
      const source = path.join(c.modRequest.projectRoot, 'assets/models', name);
      if (!fs.existsSync(source)) continue;
      IOSConfig.XcodeUtils.addResourceFileToGroup({ filepath: path.relative(c.modRequest.platformProjectRoot, source), groupName: 'Resources', project, isBuildFile: true });
    }
    return c;
  });
  config = withAppBuildGradle(config, c => {
    c.modResults.contents = c.modResults.contents.replace(/\n\s*assetPacks = \[":layamodel"\]/g, '');
    if (assetPack) c.modResults.contents = c.modResults.contents.replace(/android\s*\{/, 'android {\n    assetPacks = [":layamodel"]');
    return c;
  });
  config = withSettingsGradle(config, c => {
    c.modResults.contents = c.modResults.contents.replace(/\ninclude ':layamodel'/g, '');
    if (assetPack) c.modResults.contents += "\ninclude ':layamodel'\n";
    return c;
  });
  return withDangerousMod(config, ['android', c => {
    const root = c.modRequest.platformProjectRoot;
    const base = path.join(root, 'app/src/main/assets/laya');
    const pack = path.join(root, 'layamodel');
    // Only remove this plugin's generated resources when switching build modes.
    fs.rmSync(assetPack ? base : pack, { recursive: true, force: true });
    const destDir = assetPack ? path.join(pack, 'src/main/assets/laya') : base;
    fs.mkdirSync(destDir, { recursive: true });
    if (assetPack) fs.writeFileSync(path.join(pack, 'build.gradle'), `plugins { id 'com.android.asset-pack' }\nassetPack {\n  packName = "layamodel"\n  dynamicDelivery { deliveryType = "install-time" }\n}\n`);
    for (const name of files) {
      const source = path.join(c.modRequest.projectRoot, 'assets/models', name);
      if (fs.existsSync(source)) fs.copyFileSync(source, path.join(destDir, name), fs.constants.COPYFILE_FICLONE);
    }
    return c;
  }]);
};
