# Kwikroutine

A React Native / Expo SDK 55 fitness app for building an interesting, achievable exercise habit. Workouts, exercise selection, locations, soreness, and history stay on the phone. No login or ads.

## Current test builds

- Android ARM64 test APK: [artifacts/kwikroutine-android-preview.apk](artifacts/kwikroutine-android-preview.apk). Approximately 850 MB because it contains the complete offline model. Signed with the development certificate; not a Play Store release. Hash/build details are in `artifacts/android-preview.json`.
- iOS Release app is installed in the local **iPhone 17 Pro / iOS 26.2** simulator. Native Laya inference, set logging, saving, and restart recovery were verified there.
- [Validation record](docs/VALIDATION.md) lists completed checks and remaining release work. Generated native build folders/caches were removed after testing to recover disk space; Expo regenerates them when needed.

## Run

```sh
npm install
npm run model:fetch   # Laya weights from the GitHub Release; see docs/LAYA.md
npm run preview       # interactive browser preview at http://localhost:8081
npm run ios           # native development build (Xcode 26.2+ required)
npm run android       # native development build (Android SDK required)
```

The Laya weights are too large for Git and live on a GitHub Release; `npm run model:fetch` downloads and verifies them (see [docs/LAYA.md](docs/LAYA.md)). The preview APK is not in Git either; `artifacts/android-preview.json` records its hash and build notes. The custom config plugin embeds the weights into the native app. **Expo Go cannot run the ONNX or RevenueCat native integrations.**

For a self-contained iOS simulator build, with no Metro connection needed at runtime:

```sh
npx expo run:ios --configuration Release --device 'iPhone 17 Pro'
```

The browser preview uses the same exercise rules, feedback, persistence, and workout UI, but does not execute the native Laya model or sell subscriptions.

## Implemented

- Dark, lime-accent UI from the "Kwikroutine Screens" design (Outfit + DM Mono type, rising-bars logo). Tabs: Today, History, Profile.
- Four-step onboarding: experience, full-body/split, home and/or gym, equipment picker, then a first soreness check-in.
- Daily check-in on Today: anatomical front/back soreness map (paths from [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter), MIT, see `src/vendor/body-highlighter/LICENSE`), list fallback, separate pain check that blocks the day's workout. Today's focus is derived from routine + soreness (split days alternate and swap away from sore halves).
- Named living rooms, home gyms, and commercial gyms with individual equipment inventories.
- 468 exercise records (64 original + 404 licensed imports), with full exercise-image coverage, 845 bundled RepDB pictures, 19 original detailed illustrations, and 51 dedicated equipment pictures and credited equipment references: primary/secondary muscles, movement pattern, equipment, technique level, written instructions, tips, unilateral handling, repetitions/duration, rest.
- Time-budgeted sessions with warm-up, one exercise revealed at a time, all sets completed before moving on, effort/rep/load logs, rest timer, hold timer, and resume after restart.
- Swipeable exercise card (left to skip, right to start) with a “why this” line built from the eligibility filters. Skip sheet: absent equipment, busy equipment, soreness, technique difficulty, not today, permanent dislike. Partially completed sets are retained; hidden exercises can be reset under Profile.
- History: week strip, monthly count, recovery (muscles trained in the last 48 h or sore today), session details. Summary with muscles worked. Exercise library under Profile.
- SQLite persistence on native; SecureStore holds the earliest trial date and last-seen clock. Web uses localStorage for preview only. No fitness backend.
- 14 days of app-managed free access from onboarding, without a store purchase or payment details. Explicit paid subscription afterward: $2.99 monthly / $19.99 yearly (US base prices).
- RevenueCat anonymous customers, product offerings, native purchase, restore, customer updates, subscription management. Missing keys never create a fake subscription.
- On-device Laya ONNX inference with bundled FP16 resources, a TypeScript tokenizer matching upstream Python, and a constrained local fallback if model loading/inference fails.

## How selection works

First apply hard filters: current location equipment, temporary equipment unavailability, experience, primary **and secondary** sore muscles, hidden exercises, session repeats, requested muscle groups, remaining time, and remaining planned workload. Rank a shortlist by movement balance, recent exposure, and reported effort. Laya assigns probabilities among those candidates; weighted sampling blends those probabilities with the local ranking. Re-check time after inference.

Feedback changes local context and preferences. It does **not** retrain model weights. Probabilities are internal selection weights, not estimates of effectiveness or safety. No model can bypass the eligibility filters. New exercise suggestions stop when the candidate pool or budget runs out.

## Billing setup

See [docs/REVENUECAT.md](docs/REVENUECAT.md). Copy `.env.example` to `.env.local` and add your platform-specific **public SDK keys**. Product creation, store credentials, pricing, subscription agreements, and sandbox purchase testing require the publisher’s Apple/Google/RevenueCat accounts and have not been performed by this project.

The app-managed trial never auto-converts. Fitness data stays local, but purchase identifiers and receipts go to RevenueCat and the stores. Purchases, restoration, and subscription refresh require connectivity. Offline access uses the last confirmed paid-through date; it cannot discover renewals/refunds while disconnected.

## Verify

```sh
npm run lint
npm run verify        # typecheck + domain/tokenizer tests
npm run test:e2e      # browser phone-layout flows; installed Google Chrome required
npm run model:check   # all four bundled model hashes + recorded real-text checks
npx expo-doctor
```

Tests cover equipment and soreness exclusions, beginner gating, novelty, time/workload limits, replacement scopes, rest and set completion, persistence validation, trial clock rollback, paid-through expiry, and upstream tokenizer parity. Browser tests cover onboarding, offline interaction, resume, saved gyms, replacement, expiry, and pain check-in.

## Before publishing

- Use your final application identifiers and production RevenueCat setup; perform real sandbox purchase/renewal/refund/restore tests on both platforms.
- Validate Laya’s memory, heat, battery impact, and decision latency on representative physical iOS and Android devices. Model assets are approximately **850 MB** before packaging. Android copies bundled weights into a local cache for ONNX file access, which requires additional device storage.
- Have the exercise instructions and prescriptions reviewed by a qualified exercise professional. Every exercise has a bundled picture, using licensed illustrations or original detailed AI-generated illustrations. Pictures and imported instructions still need professional content review.
- Supply the publisher’s legal identity, support contact, and published privacy/terms URLs. The in-app disclosure is a pre-release draft.
- Review store privacy declarations and subscription disclosures; finish accessibility and physical-device QA.

## Project map

- `src/domain` — types, eligibility, sampling, feedback, session and access rules.
- `src/data/exercises.ts` — bundled editable exercise catalog.
- `src/services` — local storage, RevenueCat, Laya, selection.
- `src/state` — versioned persistence validation and React store.
- `src/app` — Expo Router routes and shared navigation layout.
- `src/screens`, `src/components` — native UI, original vector artwork, body map.
- `plugins` — native billing/activity settings and bundled model resources.
- `scripts` — reproducible export/verification, asset creation, production build gates.
- `docs` — integration notes and screenshots.

Third-party model and adapted tokenizer/sequence helper attribution: [src/vendor/laya/NOTICE.md](src/vendor/laya/NOTICE.md).

## Daily personalization and expanded pictures

An optional daily intent, automatic session styles, and contextual skip feedback keep the workout flow simple. See [personalization](docs/PERSONALIZATION.md) and [catalog sources and licensing](docs/CATALOG.md). [Exercise data by RepDB (repdb.co)](https://repdb.co). All pictures are bundled for offline use. The Android preview APK has been rebuilt with these changes. Installed and launched successfully on a physical Pixel 8.

Equipment selection includes 65 choices, available in gym onboarding and saved-place editing. Eleven additions cover air bikes, battle ropes, plyo boxes, treadmills, ellipticals, jump ropes, slam balls, rowing ergometers, sleds, stair climbers and stationary bikes. Extra equipment stays collapsed until requested and is searchable.

Save any number of named places with independent equipment lists. Use **Add a place** under **Where are you today?**, or manage them under **You → Add or edit places**. Multiple gyms, homes, hotels, offices, and other training spots are supported. Saving a new place selects it for the next workout; all place data stays on the device.

Home setup offers the same full equipment catalog as gym setup. Common home items appear first; expand **Machines & more equipment** to search the rest. Existing home places also support every machine through **You → Add or edit places**.
