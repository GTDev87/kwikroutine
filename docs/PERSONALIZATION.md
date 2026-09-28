# Simple daily personalization

The Today screen offers a collapsed, optional intent row. “Choose for me” is the default. Easy, challenge, familiar, or surprise applies only to today's local date, survives soreness edits, and is copied into the session. The last completed workout duration is reused. No new mandatory onboarding or workout step.

Styles are chosen automatically: quiet for bedroom, less setup for easy intent or recent setup/crowding feedback at that location, familiar for familiar intent, one-new-move preference for surprise, otherwise balanced. They are soft ranking preferences; equipment, soreness, experience and workload remain hard filters. An unpracticed user's discovery session cannot promise familiar movements.

“More reasons” in the existing skip sheet exposes setup, floor, crowding and repetition feedback. Setup/floor/crowding preferences generalize to other exercises at the same saved location. The latest 24 local signals affect ranking, with stronger influence in the current session. The explicit “No floor exercises” signal excludes floor work for the current session; it becomes a soft preference for later sessions. They never permanently hide all movements of a type. Existing absence/busy/sore/advanced/dislike semantics remain. “Reset learned preferences” under Profile clears only the richer signals.

Laya receives a token-budgeted summary derived from all saved workout history, plus per-candidate experience, logged effort, comparable performance trends, local skips, and recent muscle workload. Short option identifiers preserve context within the 192-token question budget. Inference still receives at most 512 tokens; complete facts are packed using the actual tokenizer rather than silently cutting a long history string. Only IDs/names and local text metadata are provided, never third-party artwork. Preferences also affect shortlist sampling and the rules fallback. This is inference conditioned on local history, not retraining.

Validation for this change: 49 unit tests including actual tokenizer budget checks, 7 mobile-layout browser flows, strict TypeScript and Expo lint, iOS/Android production JS+asset export. The Android ARM64 Release preview APK was subsequently rebuilt with these changes; its signature and all four embedded model hashes were verified. Installed and launched successfully on a physical Pixel 8; the personalized ONNX workout flow still needs device testing. Prior native inference validation refers to the previous iOS build.


## Full-history training memory — September 27, 2026

Architecture: raw local records → deterministic feature extraction → complete-fact context packing → Laya probabilities → constrained weighted selection. The question stays stable while state facts evolve. This is contextual inference, not on-device model training.

`trainingMemory.ts` processes every saved workout and feedback record, excluding the active session from lifetime totals and handling its current sets separately. It derives:

- Lifetime workouts, sets, exercise visits, completed prescriptions, and easy/hard set counts.
- Workouts over 7/28 days, distinct training days, last workout/focus and gaps.
- Primary muscle sets over 7/28 days, secondary exposure separately, last trained dates, recent hard sets, and current-session muscle/pattern workload.
- Per-exercise visits, recency, location-specific comparable rep/hold trends and recent load/effort records. Comparisons require three same-place visits within 42 days and the same recorded load; changed loads and insufficient observations remain explicit.
- Lifetime and recent local rejection patterns, keeping unavailable equipment and soreness distinct from dislikes.
- Median observed session duration, place-specific duration, and same-weekday duration when at least three samples exist. Implausibly long wall-clock spans are excluded because leaving the app open is not exercise time.
- Revealed recommendations, recorded only when the selection is accepted into the active session. Tracking starts with this version; older unrecorded impressions are unknown. A reveal never counts as a completion. Clearing history also clears these records.

There are no new questions or user actions. Existing saved data loads without migration. Full raw history remains on the phone; a bounded recent comparison window is derived per exercise and location. Laya does not see every raw record on every call. The packer prioritizes current constraints, all candidates’ core history rows, current workload and feedback, then richer candidate detail and other relevant facts. Optional facts that do not fit are omitted as whole facts. All candidates receive the same detail tier. Diagnostic output records token counts, not prompt text or fitness history.

Rules also use recent hard-set exposure, comparable declines, and recent preference-like skips in shortlisting and fallback ranking. These remain soft preferences. Experience, equipment, soreness and time eligibility still cannot be overridden by Laya. No inferred injury diagnosis, precise readiness, unlogged energy, fitness goal, or strength estimate is invented. Automatic load increases and a workout/rest-day Laya decision are not implemented by this change.

Validation: 72 unit tests including all-history, zero-data, location/load comparability, old-save compatibility, reveal deduplication, and dense real-tokenizer sweeps across the catalog and intents; 11 browser flows; TypeScript and lint pass. `node scripts/coaching-scenarios.cjs` then an environment with NumPy/ONNX Runtime running `python scripts/evaluate-coaching.py` reproduces the five synthetic model checks without user data. The stored report is `docs/coaching-evaluation.json`.

The model produces finite, normalized, history-sensitive probabilities, but these tests do not establish coach-level decision quality. In the workload scenarios, raw Laya probabilities sometimes favored an already-loaded pattern; deterministic workload penalties changed the final ranking. This is a known limitation, not a passed coaching-quality benchmark. Expert-labeled longitudinal evaluation is still needed before claiming professional-level coaching.


## Workout styles and custom weeks — September 27, 2026

You → Workout style supports Full body, Splits (alternating upper/lower), and Custom week. Custom week assigns each local weekday full body, upper body, legs/core, selected muscles, or rest. Only one day editor expands at a time; changes remain a draft until Save. Custom muscle days require at least one muscle. Switching modes preserves the saved custom schedule. Saving the default clears today's temporary override so the new default takes effect. Existing workout sessions are preserved.

Today → Change today creates a local-date override without changing the weekly schedule. It expires the next local day and can be reset with Use my regular plan. Rest days have an explicit Change today action and no automatic workout start. Soreness and eligibility rules still apply to all selected targets; explicit custom-day upper/lower choices are not automatically swapped to another day. All data remains on-device and older profiles without these optional fields still load.

Validation: 76 unit tests, 12 browser flows, TypeScript and lint. Coverage includes weekday mapping, rest, same-day overrides and expiry, old saves, draft persistence, empty muscle selection validation, custom target eligibility, mode switching and preservation of in-progress workouts. Mobile browser screenshot: `docs/screenshots/custom-week.png`.

## Load progression and preferred units — September 27, 2026

You → Weight units saves Pounds (lb) or Kilograms (kg); pounds is the default for profiles without a saved preference. Weight inputs, suggestions, and history use the selected unit. Existing numeric records remain kilograms internally, so switching units never rewrites history. Sets record the actual edited weight, not the suggestion. The last logged weight is restored after interruption, and effort resets to Just right after each set to avoid carrying an Easy rating forward automatically.

For supported externally loaded repetition exercises, the next reveal recalls the last load at that location (within 28 days). Before the first set, a separate on-device Laya choice may keep that load or suggest a bounded increase. It requires two separate, completed visits at the same load with every planned set rated easy and at least two reps above the exercise target. Visits must be at least a day apart, with at least a day since the last visit. Easy intent, soreness, recent hard sets for involved muscles, and hard sets today prevent increases. Assistance machines, bodyweight, timed exercises, and conditioning are excluded. No starting weight is guessed.

Candidate steps follow the preferred units (2.5 lb for hand weights, 5 lb for other weights; 1 kg / 2.5 kg respectively) and must be 2–10% above the previous load. These are product guardrails informed by the historical [ACSM progression position stand](https://pubmed.ncbi.nlm.nih.gov/19204579/), not proof of individual readiness or equipment availability. If that step is unavailable, the UI advises keeping the previous load; Use last weight is one tap. Users can edit every set. Increases apply to the next exercise visit, not automatically between sets already underway.

Laya receives a compact state derived from recorded performance, current intent, soreness, lifetime/recent training, completion, and current-session workload. Native inference is serialized across questions. An increase additionally requires finite normalized scores with increase ≥0.6; ties, uncertainty, missing model, errors, or failing guardrails hold the prior load. This cutoff is a product rule, not calibrated clinical confidence. Browser preview holds the previous weight without pretending to run Laya. Suggested and prior weights plus provenance persist with the performed exercise.

Validation: 96 unit tests and 13 browser flows; TypeScript and lint pass. Unit/service tests exercise both decision branches with controlled model scores, failure fallback, exclusions, comparison windows, duplicate history, unit conversion, and actual-weight logging. Browser fixtures verify the editable increase UI, undo, persistence, old-history conversion, and resume. They use synthetic local browser data, never the user's phone history.

`node scripts/load-scenarios.cjs` then `.venv-eval/bin/python scripts/evaluate-load.py` exercises the shipped weights on 12 synthetic qualified scenarios. All produce finite normalized scores within the context budget (183–188 tokens); all selected hold (increase probabilities approximately 0.22–0.27). This is a meaningful limitation: the increase branch is implemented and tested, but these model checks did not demonstrate a real-model increase recommendation. Do not claim this feature or Laya is validated professional coaching. See `docs/load-evaluation.json`.
