// ONNX Runtime 1.24.3 references Gradle's removed VersionNumber helper.
// Keep the existing RN-minor check and pin its downloaded native runtime.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('onnxruntime-react-native/package.json'));
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
if (version !== '1.24.3') throw new Error('Revalidate the ONNX Android compatibility patch before changing its version.');
const file = path.join(root, 'android/build.gradle');
let source = fs.readFileSync(file, 'utf8');
const original = 'VersionNumber.parse(REACT_NATIVE_VERSION) < VersionNumber.parse("0.71")';
const patched = 'REACT_NATIVE_MINOR_VERSION < 71';
if (!source.includes(original) && !source.includes(`if (${patched})`)) throw new Error('ONNX Gradle version check changed unexpectedly.');
source = source.replace(original, patched);
source = source.replace('onnxruntime-android:latest.integration@aar', 'onnxruntime-android:1.24.3@aar');
fs.writeFileSync(file, source);
console.log('ONNX Android Gradle compatibility and runtime version verified.');
