import { Exercise, Muscle, SoreLevel, SoreLevels } from "./types";

type Sore = { sore: Muscle[]; soreLevels?: SoreLevels };
export const soreLevelLabels = ["None", "Light", "Medium", "Very sore"] as const;
// A muscle listed as sore without a level predates levels and keeps its old meaning.
export const soreLevel = (x: Sore, m: Muscle): 0 | SoreLevel =>
  x.sore.includes(m) ? (x.soreLevels?.[m] ?? 3) : 0;
export const fromLevels = (levels: SoreLevels): Required<Sore> => {
  const soreLevels = Object.fromEntries(
    Object.entries(levels).filter(([, v]) => v),
  ) as SoreLevels;
  return { sore: Object.keys(soreLevels) as Muscle[], soreLevels };
};
export const levelsOf = (x: Sore): SoreLevels =>
  Object.fromEntries(x.sore.map((m) => [m, soreLevel(x, m)])) as SoreLevels;
// Muscles that shouldn’t lead a workout today: medium and very sore.
export const resting = (x: Sore) => x.sore.filter((m) => soreLevel(x, m) >= 2);
// Marks muscles very sore, e.g. after “Too sore for this”.
export const escalate = (x: Sore, muscles: Muscle[]): Required<Sore> => {
  const levels = levelsOf(x);
  for (const m of muscles) levels[m] = 3;
  return fromLevels(levels);
};
/** Hard safety rule. Very sore: the exercise may not use the muscle at all.
 * Medium: it may assist but not be a primary mover. Light: allowed; Laya weighs it. */
export const blockedBySoreness = (ex: Exercise, x: Sore) =>
  ex.primary.some((m) => soreLevel(x, m) >= 2) ||
  ex.secondary.some((m) => soreLevel(x, m) >= 3);
// Sore muscles an allowed exercise still loads, strongest first.
export const soreLoad = (ex: Exercise, x: Sore) =>
  [
    ...ex.primary.map((m) => ({ muscle: m, level: soreLevel(x, m), role: "primary" as const })),
    ...ex.secondary.map((m) => ({ muscle: m, level: soreLevel(x, m), role: "secondary" as const })),
  ]
    .filter((s) => s.level > 0)
    .sort((a, b) => b.level - a.level);
// Local ranking when Laya isn’t available: ease off exercises that load sore muscles.
export const sorenessWeight = (ex: Exercise, x: Sore) =>
  soreLoad(ex, x).reduce(
    (w, s) => w * (s.role === "primary" ? 0.55 : s.level === 2 ? 0.6 : 0.85),
    1,
  );
const levelWord = ["none", "light", "medium", "very sore"] as const;
export const describeSoreness = (x: Sore) =>
  x.sore.map((m) => `${m}(${levelWord[soreLevel(x, m)]})`).join(",");
