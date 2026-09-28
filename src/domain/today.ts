import { defaultSchedule, weekdayAt } from './routine';
import { exerciseById } from "../data/exercises";
import {
  AppData,
  Exercise,
  Focus,
  MUSCLES,
  Muscle,
  Session,
  focusTargets,
  titleCase,
} from "./types";
import { DAY } from "./engine";

export const dayKey = (at: number | Date = Date.now()) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
// A soreness check-in only counts for the day it was made.
export function todayCheckIn(data: AppData, now = Date.now()) {
  const c = data.checkIn;
  return c && c.day === dayKey(now)
    ? c
    : { day: dayKey(now), sore: [], pain: false };
}
export const muscleName = (m: Muscle) => (m === "core" ? "Core" : titleCase(m));
export const listNames = (ms: Muscle[]) => {
  const names = ms.map((m) => muscleName(m).toLowerCase());
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
};
const other: Record<"upper" | "lower", "upper" | "lower"> = {
  upper: "lower",
  lower: "upper",
};
// Full-body users train everything that isn’t sore. Split users alternate upper and
// lower days, and swap when soreness rules out most of the planned half.
export function todayFocus(data: AppData, sore: Muscle[], now = Date.now()) {
  const override = data.workoutOverride?.day === dayKey(now) ? data.workoutOverride.plan : null;
  const scheduled = data.profile?.routine === 'custom'
    ? (data.profile.schedule ?? defaultSchedule())[weekdayAt(now)] : null;
  const selected = override ?? scheduled;
  if (selected) {
    if (selected.focus === 'rest') return { focus: 'full' as Focus, targets: [] as Muscle[], why: 'A day to rest. You can change today if your plans change.', rest: true };
    const intended = selected.focus === 'custom' ? selected.muscles : focusTargets[selected.focus];
    const skipped = intended.filter(m=>sore.includes(m));
    const soreNote = skipped.length ? `Your sore ${listNames(skipped)} get the day off.` : '';
    // An open day keeps every rested muscle available and leaves the choice of moves to Laya.
    const why = selected.focus === 'open'
      ? `No set focus today. Laya picks each move from what you’ve recovered for.${soreNote ? ' ' + soreNote : ''}`
      : soreNote;
    return { focus: selected.focus, targets: intended.filter(m=>!sore.includes(m)), why, rest: false };
  }
  let focus: Focus = "full",
    why = "";
  if (data.profile?.routine === "split") {
    const last = data.history.at(-1)?.focus;
    focus = last === "upper" ? "lower" : "upper";
    const blocked = (f: "upper" | "lower") =>
      focusTargets[f].filter((m) => !["core", "forearms", "inner-thighs", "hips"].includes(m) && sore.includes(m)).length /
      focusTargets[f].filter((m) => !["core", "forearms", "inner-thighs", "hips"].includes(m)).length;
    if (blocked(focus) > 0.5 && blocked(other[focus]) < blocked(focus)) {
      const sorePart = focusTargets[focus].filter((m) => sore.includes(m));
      why = `Your ${listNames(sorePart)} ${sorePart.length > 1 ? "are" : "is"} sore, so ${focus === "upper" ? "upper body" : "legs"} ${sorePart.length > 1 ? "are" : "is"} off the list today.`;
      focus = other[focus];
    }
  }
  const targets = focusTargets[focus].filter((m) => !sore.includes(m));
  if (!why && sore.length) {
    const skipped = focusTargets[focus].filter((m) => sore.includes(m));
    if (skipped.length)
      why = `Your ${listNames(skipped)} ${skipped.length > 1 ? "get" : "gets"} the day off.`;
  }
  return { focus, targets, why, rest: false };
}
// Muscles trained in the last two days are recovering; everything else is ready.
export function recovery(data: AppData, now = Date.now()) {
  const recent = new Set<Muscle>(todayCheckIn(data, now).sore);
  for (const session of data.history)
    if ((session.endedAt ?? session.startedAt) > now - 2 * DAY)
      for (const item of session.completed)
        exerciseById[item.exerciseId]?.primary.forEach((m) => recent.add(m));
  return {
    recovering: MUSCLES.filter((m) => recent.has(m)),
    ready: MUSCLES.filter((m) => !recent.has(m)),
  };
}
export function isNewFor(data: AppData, id: string) {
  return !data.history.some((s) =>
    s.completed.some((e) => e.exerciseId === id),
  );
}
// A plain-language reason for a pick, built only from facts the filters guarantee.
export function whyThis(
  data: AppData,
  session: Session,
  ex: Exercise,
  now = Date.now(),
) {
  const parts: string[] = [];
  if (isNewFor(data, ex.id)) parts.push("you haven’t done it yet");
  else {
    const last = data.history
      .filter((s) => s.completed.some((e) => e.exerciseId === ex.id))
      .at(-1);
    if (last && now - (last.endedAt ?? last.startedAt) > 7 * DAY)
      parts.push("it’s been a while since you did it");
  }
  // Eligibility already excludes every exercise that loads a sore muscle.
  if (session.sore.length)
    parts.push(
      `it keeps load off your sore ${listNames(session.sore.slice(0, 2))}`,
    );
  if (!parts.length)
    parts.push(
      `it balances today’s ${ex.primary.map((m) => muscleName(m).toLowerCase()).join(" and ")} work`,
    );
  return parts.join(", and ");
}
// Sets per primary muscle, normalized to the busiest muscle, for the summary bars.
export function musclesWorked(session: Session) {
  const counts = new Map<Muscle, number>();
  for (const item of session.completed) {
    const ex = exerciseById[item.exerciseId];
    ex?.primary.forEach((m) =>
      counts.set(m, (counts.get(m) ?? 0) + item.sets.length),
    );
  }
  const max = Math.max(1, ...counts.values());
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([muscle, n]) => ({ muscle, share: n / max }));
}
