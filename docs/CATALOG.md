# Exercise catalog and image provenance

The app contains 468 exercises: the 64 original editorial exercises (stable IDs preserved for installed users) and 404 imported exercises. Imported exercises have equipment, primary/secondary muscles, instructions, difficulty, setup/floor/noise traits, and local picture references. The soreness map now supports forearms and inner thighs; hip flexors are available in the accessible muscle list.

Source: [RepDB free exercise dataset](https://github.com/RepDB/exercise-dataset), pinned revision `9ed9357f09c7566ea0256c57ebd6374ebb8b575e`.

[Exercise data by RepDB (repdb.co)](https://repdb.co)

The **RepDB Free Tier License v1.0 explicitly covers JSON and associated free WebP assets for commercial in-app use** with attribution. It prohibits redistribution as a standalone dataset/API and generative derivation of images. We only use free `images/flat` assets, never premium samples. These are publisher-provided AI-created illustrations, not photographs or verified technique demonstrations. Attribution is visible under Privacy & terms and here. License text lives in `assets/exercises/LICENSE-DATA.md`.

`python3 scripts/import-exercises.py` reproducibly downloads the pinned dataset and selected free illustrations, converts WebP to JPEG using Pillow for native compatibility, generates `src/data/importedExercises.json` and static Metro asset references, and records source URLs and local SHA-256 hashes in `assets/exercises/manifest.json`. Requires Python 3, Pillow and curl. It makes no runtime app network requests. The 845 RepDB exercise pictures occupy approximately 20 MB. Every one of the 468 exercises resolves to a bundled exercise-specific picture. The 20 previously missing mappings now use 19 original detailed AI-generated illustrations and the matching licensed banded glute bridge images. Generic movement-category figures are not used for exercises. Original PNGs and generation prompts, hashes, and provenance are in `assets/exercises-original/manifest.json`; no RepDB images were used as generation references. `src/data/picturesFor.ts` resolves all image sources, and the catalog coverage test executes this production resolver to check every exercise and image file. The supplemental mapping is separate from generated RepDB data so re-imports preserve it.

Wikimedia Commons supplements equipment identification; individual sources and licenses are recorded in `assets/commons/ATTRIBUTION.md` and the in-app credits. Those licenses apply to those images separately.

Equipment identifiers represent specific stations (Smith, hack squat, pec deck, assisted pull-up/dip, leg machines, calf machines, glute drive, etc.). Bench angle, racks, landmine attachments, and other auxiliary equipment are additional requirements. Saved places do not silently gain new equipment. Original machine-row remains separate from seated-cable-row. Free-text exercise descriptions are not evaluated at runtime to infer equipment.

Conservative import adjustments: barbell, Smith, EZ bar, rings and suspension moves are at least intermediate; Olympic-style cleans/jerks, Turkish get-ups and comparable technical moves are advanced. We omit unrelated cardio/stretching, selected specialist movements, and known alias duplicates. Static holds and carries use duration. These engineering checks do not substitute for qualified exercise-content review before a public release.

## Equipment expansion

The inventory now has 65 equipment choices. Eleven new choices have matching exercises and bundled pictures: air bike, battle ropes, plyo box, treadmill, elliptical, jump rope, slam ball, rowing ergometer, weight sled, stair climber and stationary bike. Conditioning movements use a single timed set and are limited to one completed conditioning exercise per session so they do not crowd out strength work. Box jumps and ball slams are at least intermediate.

`python3 scripts/import-equipment.py` downloads 51 equipment-specific cutouts from the same pinned RepDB revision and license. Source paths and SHA-256 hashes are in `assets/equipment/manifest.json`; static Metro references are generated in `src/data/equipmentPictures.ts`. Lossless transparent PNG conversion supports both native platforms. Existing exercise illustrations remain fallbacks where the dedicated cutout does not match the equipment variant (for example assisted dips).

Gym onboarding now exposes every equipment choice through an optional expanded searchable grid. New or specialist equipment is not preselected automatically. The common-equipment toggle preserves separately selected additions. Saved places use the same picture-backed picker.
