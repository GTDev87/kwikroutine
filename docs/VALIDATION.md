# Validation record — 2026-09-26

Environment: Apple Silicon macOS, Xcode 26.2, Expo SDK 55, React Native 0.83.10. SDK 55 was selected to match the installed Xcode toolchain.

Passed:

- TypeScript strict typecheck and Expo ESLint, without lint warnings.
- 34 domain/tokenizer tests, including original Python token sequence parity, primary/secondary soreness filtering, experience/equipment filtering, set/rest accounting, bounded workload, feedback scope, clock rollback, stale billing snapshots, balanced candidate sampling, and stale asynchronous selections.
- Five phone-layout browser end-to-end tests: onboarding/offline logging/resume/history; saved named locations; soreness and replacement; trial expiry; pain check-in.
- Expo Doctor: 20/20 checks.
- Android and iOS production JavaScript bundling.
- iOS Release simulator build on iPhone 17 Pro / iOS 26.2. Used `ARCHS=arm64 ONLY_ACTIVE_ARCH=YES DEBUG_INFORMATION_FORMAT=dwarf` for the final build to fit the available disk space.
- Native iOS onboarding, two actual bundled Laya inference calls (`engine: laya` verified in SQLite), replacement, two completed sets/rest UI, saving and app termination/relaunch recovery. The app loads its embedded bundle without Metro.
- Native QA found and fixed SDK 55's `File.text()` write-permission requirement for read-only bundle files by using the read-only legacy reader for the tokenizer and config.
- All four model asset SHA-256 hashes and four recorded original-model/FP16 probability comparisons (maximum drift 0.00489, same top choice in all four cases).
- Android ARM64 Release APK compilation, APK signing verification, and SHA-256 verification of every bundled model file inside the APK. The APK uses the development signing certificate for internal testing.
- Android config generation in both install-time asset-pack mode and standalone APK mode. Actual Play bundle installation and Android runtime inference have not been tested.

Limitations:

- Browser tests use the constrained rules engine; they do not test native ONNX execution or real purchases.
- Physical-device model memory, latency, battery, and thermal behavior are unmeasured.
- RevenueCat/store keys, product setup, and sandbox purchase/renewal/refund/restore checks require publisher configuration.
- The SDK 55 dependency tree currently reports 13 moderate npm audit findings (two underlying advisories propagated through dependents: decode-uri-component and uuid). A forced npm audit fix proposes incompatible Expo downgrades and was not applied. Resolve through compatible upstream updates or a separately validated patch before distribution.
- Exercise-content review, legal publisher details, published policy URLs, and store review are still required.

## Catalog and personalization update

49 unit tests, strict TypeScript, Expo lint, and seven phone-layout browser flows cover the expanded catalog, daily intent persistence/expiry, styles, contextual skips, exact machine eligibility, local image files, and start/finish picture controls. Both native platform JS/asset exports pass. New content is documented in CATALOG.md and PERSONALIZATION.md. The earlier installed simulator app and Android APK have not been rebuilt for this update; their native validation above is historical.

## Pixel deployment build

Updated Android ARM64 Release APK compiled successfully with the catalog and personalization changes. Signature matches the previous preview build, and all four embedded model SHA-256 hashes match the model manifest. Artifact metadata is in artifacts/android-preview.json. Installed successfully with adb install -r on the physical Pixel 8. Launch returned Status: ok (cold start 648 ms); the app process remained running with no error-level process logs at the startup check. This verifies installation/startup, not on-device workout inference or purchase flows.

## Expanded equipment picker

53 unit tests and eight phone-layout browser flows passed, together with strict TypeScript and Expo lint. New checks cover each added equipment type having a local licensed picture and eligible matching exercise, persistence, conditioning set budgets, soreness and difficulty filtering, and selecting new equipment during gym onboarding. Android ARM64 Release compilation passed; the APK contains all 51 dedicated equipment PNGs and the four verified Laya model files. Source and license manifests are in assets/equipment.

Expanded equipment APK installed successfully on the USB-connected Pixel 8 using adb install -r. Launch returned Status: ok and the app process remained running. All 51 equipment resource mappings were verified against the signed APK, along with all four Laya model hashes. This startup check does not verify native inference or purchases.

## Multiple saved places

The Today screen now opens the add-place form directly, and the saved-place list keeps its add button above the cards. Places support a generic Other kind as well as multiple homes or gyms, with no app-imposed count limit. New places become the current selection; edits preserve the current selection. Existing place data remains compatible.

Strict TypeScript, Expo lint, and 53 unit tests passed. All nine browser flows passed (eight existing flows plus a targeted rerun of the new multiple-place flow after fixing web radio accessibility). The new flow creates four places, verifies distinct equipment and IDs after reload, cancels an unsaved fifth place, switches to the third, and starts a workout at that location. Phone layout inspected in docs/screenshots/multiple-places.png.

Multiple-place Android ARM64 Release build passed, with the matching development signature and all four embedded model hashes verified. Installed on Pixel 8 with adb install -r; launch returned Status: ok and the app process remained running with no error-level app logs at the startup check.

## Full equipment catalog for home gyms

Home onboarding now offers all 65 equipment choices, using common home items followed by a collapsed searchable list of all remaining equipment. Saved-place editing uses the same shared list for every place type. Choosing Just my body clears the whole equipment selection, including machines.

Strict TypeScript, Expo lint, 53 unit tests, and all ten phone-layout browser flows passed. The new flow selects leg press and Smith machine at home, verifies bodyweight reset, completes onboarding and reloads, then adds a treadmill to the saved home location and checks persistence. Home kind remains unchanged. Layout inspected in docs/screenshots/home-gym-equipment.png.

Home gym catalog Android ARM64 Release build passed; matching development signature and all four model hashes verified. Installed successfully on Pixel 8 with adb install -r. Launch Status: ok; process running with no error-level app logs at the startup check.

## First-exercise Android crash investigation

The Pixel crash buffer identified `JavascriptException: TypeError: Cannot read property 'install' of null` during the lazy ONNX import (latest observed crash: September 26, 21:15:15, app PID 18511). Previous native checks validated startup only, so they did not catch this path.

ONNX Runtime 1.24.3's Expo plugin adds the Gradle dependency but does not register OnnxruntimePackage with the React Native host. Its legacy unimodule metadata excludes it from standard Expo React Native autolinking. The app config plugin now adds the package once in generated MainApplication; no generated native file is edited manually. This matches the upstream report https://github.com/microsoft/onnxruntime/issues/29004.

A preflight initializes the native JSI binding before importing the ONNX JavaScript library. Missing or failed initialization rejects normally, allowing constrained local exercise selection to handle the failure without Metro treating an import-time exception as fatal. Five regression tests cover missing registration, failed initialization, successful initialization, reuse, and eligible exercise fallback.

58 unit tests, TypeScript, lint, Android prebuild, and ARM64 Release compilation pass. The generated host registration, APK signature, and four embedded model hashes were checked. This preview enables existing opt-in local Laya stage diagnostics (no fitness prompts or user data) to verify native inference. Device installation and actual exercise reveal are pending because the Pixel disconnected after compilation.

### Pixel crash fix verified on device

Installed the corrected APK with adb install -r on the USB-connected Pixel 8. Resumed the interrupted session, which had zero completed moves and almost no time remaining, closed it without adding history, and started a fresh 30-minute session to verify the first exercise. No sets were recorded for testing.

Actual native Laya inference succeeded: loading-runtime at 22:00:11.050, running-encoder at 22:00:23.936 (224 tokens), success at 22:00:27.523 (6 candidates). The first load took 16.473 seconds including copying/loading model resources; encoder/head execution took 3.587 seconds. The Bird Dog Hold card rendered with its bundled picture, muscle groups and set prescription, and process 25762 stayed alive. Screenshot: docs/screenshots/pixel-laya-exercise.png. This verifies the formerly crashing native path, not merely application startup. Local logs are in .expo/pixel-laya-verification.log.

## Remove generic exercise drawings

Removed the generic movement-category figure from exercise-card, set-screen, and library-detail fallbacks, and removed it from warm-up. Exercises without a specific bundled image omit the media section entirely; their reveal cards show written steps and the exercise tip in the available space. Existing exercise-specific images remain unchanged.

TypeScript, Expo lint, all 58 unit tests, and ten browser flows passed. An isolated phone-layout check recreated the reported Seated band row card, verified that its generic illustration is absent and instructions are visible, then opened the set screen. Layout inspected in docs/screenshots/seated-band-row-no-placeholder.png. No user workout data was changed for this visual check.

Android ARM64 Release build, signature and model hashes verified. Installed on Pixel 8 with adb install -r and resumed the existing Seated band row exercise. Physical-device screenshot confirms the generic drawing is gone, all written steps are visible, and Start/Skip remain accessible. Screenshot: docs/screenshots/pixel-no-drawing.png.


## Full exercise picture coverage — September 26, 2026

All 468 exercises resolve to a local image through the production resolver. Added 19 original detailed AI-generated illustrations and a matching existing banded glute bridge mapping. Coverage tests check every resolved file and image signature; a browser flow opens all 20 newly mapped exercise details and checks decoded images. 60 unit tests, 11 browser flows, TypeScript and Expo lint passed. Android release build passed; all four model hashes and all 19 new image pixel hashes verified inside the APK. Installed in place on Pixel 8, launched successfully, and resumed the existing Seated band row card to verify its new illustration. Screenshot: `docs/screenshots/pixel-exercise-pictures.png`. No exercise sets were logged during this check.


## Full-history Laya context — September 27, 2026

72 unit tests, 11 browser flows, TypeScript, and lint pass. Dense 200-workout histories were checked with the shipped tokenizer across the catalog and all daily intents; every candidate retains its own history row and complete state facts fit within 512 total tokens. Five synthetic scenarios were evaluated with the shipped FP16 ONNX encoder/head. Their normalized distributions and final weighted-selection probabilities are recorded in `coaching-evaluation.json`; this is not validation of professional coaching quality. Raw workload reasoning was inconsistent; deterministic workload weighting remains necessary.

Android ARM64 Release build succeeded, signing certificate matches prior installed previews, and all four bundled model file hashes match their manifest. APK and checksum metadata are under `artifacts/`. Installation was pending at the time of this entry because ADB and macOS USB enumeration no longer detected the Pixel after authorization was requested. No user workout records were modified by these checks.

Installation follow-up: Pixel 8 reconnected. The installed package SHA-256 matches the training-memory preview APK (927827145482bbab68a0ea10dfe12f0a0359c935b6c334a0db024e3b2b804cf6). Launch returned Status ok. The phone remained locked, so visual UI and live inference were not checked in this follow-up. No sets were logged.

Unlocked-device follow-up: Today rendered saved progress (two moves completed); Continue resumed the existing Standing hip hinge card with its picture. No crash observed and no sets or feedback logged. This checked rendering/resume, not a fresh Laya inference. Screenshot: `docs/screenshots/pixel-training-memory-installed.png`.


## Custom weekly routines — September 27, 2026

76 unit tests, 12 browser flows, TypeScript and lint passed. Weekly plans persist with custom muscle targets and rest days; date-scoped overrides expire and leave the weekly plan unchanged. Existing profiles load, and active sessions remain unchanged. Android release build succeeded, its certificate and four bundled model hashes were verified, and the APK was installed in place on Pixel 8. Native Workout style / Custom week editor visually checked (`docs/screenshots/pixel-custom-week.png`); draft edits were discarded without saving user preferences or logging sets.

## Weight progression and units — September 27, 2026

- 96 unit tests, 13 mobile browser flows, TypeScript and Expo lint passed.
- New browser flow verifies lb/kg setting persistence, conversion of older kg records without mutation, saved suggestion display, Use last weight, manual override logging, reload, and effort reset.
- Screenshot: `docs/screenshots/weight-progression.png` (synthetic browser fixture).
- Shipped-model load evaluation: `docs/load-evaluation.json`; all 12 qualified scenarios chose hold. Model increase quality is not established; deterministic bounds remain mandatory.
- Android release built for arm64-v8a; all four Laya asset hashes and existing preview signing certificate verified before replacement installation.
- Pixel 8 installation succeeded with existing app data retained. Native launch returned Status ok, the Weight units picker was visually verified, and Pounds was selected. App-scoped logs contained no startup errors. Screenshot: `docs/screenshots/pixel-weight-units.png`. No synthetic sets were recorded on the phone.
