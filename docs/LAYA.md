# On-device Laya

The app uses the English `convaiinnovations/laya` checkpoint at revision `55cf4c4ebb4ebe31b2550e8bdf3bd21b99753851` (Apache-2.0). There is no inference server.

## Prepare a fresh workspace

Allow several GB of temporary disk space plus the final model and native build artifacts.

```sh
python3 -m venv .venv-model
.venv-model/bin/python -m pip install 'laya[onnx]==0.3.20' onnxscript
.venv-model/bin/python scripts/export_laya_upstream.py \
  --repo convaiinnovations/laya --out-dir .model-build --verify-len 256
npm run model:prepare
npm run model:check
```

The exporter pins the model revision and verifies the original PyTorch/ONNX decision head at multiple batch/sequence lengths. `prepare_model.py` converts the encoder and head to FP16 with FP32 tensor interfaces, records SHA-256 hashes, and runs four real-text exercise-choice comparisons against the original model. The checked-in tokenizer fixtures verify that the mobile TypeScript implementation emits exactly the Python input IDs and option-marker positions.

Int8 was tried and rejected after a 0.275 probability difference on real input. The FP16 bundle kept all four top choices, with maximum drift approximately 0.0049. These checks establish **model fidelity**, not clinical appropriateness, broad ranking quality, or physical-device performance.

The conversion needs `onnx`, `onnxruntime`, and `torch`; they are development tools only. Python is not part of the mobile app. `.model-build` and `.venv-model` can be removed after verification to recover temporary space.

## Native resources

`plugins/with-laya-model.cjs` adds four model files directly to Xcode resources or Android assets. Production Android App Bundles use an install-time `layamodel` asset pack, keeping the large weights outside the base module while making them available before first launch. Development/preview APKs embed them directly. This avoids Metro converting very large binary files to JavaScript strings. The small manifest is bundled with JavaScript. `.easignore` explicitly includes model binaries even though Git ignores them.

On iOS, inference opens the files in `Paths.bundle`. On Android, it copies files from installed assets into a model-hash-specific local cache, checking their expected sizes and using temporary files for atomic completion. There is no runtime download path. If the cache is purged, the files are recopied from the installed APK.

Two ONNX Runtime sessions are loaded lazily and reused. Inputs and outputs are disposed after each decision. The TypeScript tokenizer and sequence formatting are adapted from upstream Laya. At most six eligible candidates are included in a request, with a 512-token cap. The candidate and probability list are always constrained by local exercise rules.

## Failure behavior

If a native runtime cannot load or execute the model, the app continues using its constrained local weighted sampler. It does not label that selection as Laya: the session records `engine: 'rules'` or `engine: 'laya'`, and development Settings reports runtime status. Browser previews intentionally use the rules engine.

The model is not fine-tuned on exercise feedback. Feedback changes the saved context, candidate filters, and sampling weights. Model probabilities are not safety or effectiveness probabilities.

## Remaining release validation

Test iOS and Android physical devices under airplane mode from first launch, cold/warm inference, low storage, low memory, app background/foreground, cache eviction, and multiple sessions. Record latency, memory, battery and thermal behavior. Decide minimum supported device requirements based on those measurements.

For a local Play App Bundle build, generate Android with `KWIK_ANDROID_ASSET_PACK=1 npx expo prebuild --platform android --clean`. Production EAS builds select this automatically. Test the bundle through Play internal testing or bundletool, including the asset pack; a base-only APK does not contain the weights. See [Android install-time asset delivery](https://developer.android.com/guide/playcore/asset-delivery/integrate-java).

## Native integration notes

SDK 55's iOS `File.text()` checks write permission. Tokenizer/config reads use `readAsStringAsync` from the compatible legacy API, which correctly permits reads from the app bundle. ONNX opens the immutable weights directly.

`EXPO_PUBLIC_LAYA_DIAGNOSTICS=1` enables an opt-in local SQLite diagnostic record (`kwikroutine.laya.diagnostic`) for native QA. It contains runtime stage/errors and candidate/token counts, never prompts or fitness records, and is never transmitted. Leave it unset for normal builds.

The pinned ONNX Runtime React Native 1.24.3 Android Gradle file uses a removed Gradle helper. `scripts/patch-native-deps.cjs` applies a guarded postinstall compatibility patch and pins its native Android runtime to the matching 1.24.3 version. Revalidate the patch when updating ONNX Runtime.
