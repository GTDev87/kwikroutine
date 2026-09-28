import { blockedBySoreness, escalate, sorenessWeight } from "./soreness";
import { chooseStyle, dailyIntent, preferenceWeight, exerciseTraits } from "./personalization";
import { historyWeight, trainingMemory, TrainingMemory } from './trainingMemory';
import { exercises, exerciseById } from "../data/exercises";
import {
  AppData,
  Exercise,
  Focus,
  Level,
  Muscle,
  Rejection,
  Session,
  SetLog,
  SoreLevels,
  focusTargets,
} from "./types";

const levels: Record<Level, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};
export const DAY = 86400000;
export function access(data: AppData, now = Date.now()) {
  const effectiveNow = Math.max(now, data.lastSeenAt);
  const trialLeft =
    data.trialStartedAt === null
      ? 14
      : Math.max(
          0,
          Math.ceil((data.trialStartedAt + 14 * DAY - effectiveNow) / DAY),
        );
  const paid =
    !!data.billing?.active &&
    (data.billing.expiresAt !== null
      ? effectiveNow < data.billing.expiresAt
      : effectiveNow - data.billing.verifiedAt < 3 * DAY);
  return { allowed: paid || trialLeft > 0, paid, trialLeft };
}
export function newSession(
  data: AppData,
  minutes: number,
  focus: Focus,
  custom: Muscle[],
  sore: Muscle[],
  now = Date.now(),
  soreLevels?: SoreLevels,
): Session {
  const place =
    data.locations.find((p) => p.id === data.selectedLocationId) ??
    data.locations[0];
  return {
    id: `session-${now}`,
    startedAt: now,
    locationId: place.id,
    locationName: place.name,
    minutes: Math.max(10, Math.min(60, minutes)),
    focus,
    targets: focus === "custom" ? custom : focusTargets[focus],
    sore,
    ...(soreLevels ? { soreLevels } : {}),
    excluded: [],
    unavailableEquipment: [],
    completed: [],
    current: null,
    restUntil: null,
    warmupDone: false,
    engine: "rules",
    intent: dailyIntent(data, now),
    style: chooseStyle(data, place.id, dailyIntent(data, now)),
  };
}
export function prescription(ex: Exercise, data: AppData) {
  return {
    sets: ex.conditioning ? 1 : data.profile?.level === "beginner" ? 2 : 3,
    reps: ex.reps,
    seconds: ex.seconds,
    rest: ex.rest,
  };
}
export function estimateSeconds(ex: Exercise, sets: number) {
  return (
    sets * (ex.seconds ?? ex.reps * 4) * (ex.unilateral ? 2 : 1) +
    (sets - 1) * ex.rest +
    30
  );
}
export function remainingSeconds(session: Session, now = Date.now()) {
  return Math.max(0, session.minutes * 60 - (now - session.startedAt) / 1000);
}
export function remainingWorkBudget(session: Session, now = Date.now()) {
  const used = session.completed.reduce((seconds, item) => {
    const ex = exerciseById[item.exerciseId];
    return seconds + (ex ? estimateSeconds(ex, item.sets.length) : 0);
  }, 0);
  // Reserve two minutes for warming up. Elapsed time and planned workload both limit a session.
  return Math.min(
    remainingSeconds(session, now),
    Math.max(0, session.minutes * 60 - 120 - used),
  );
}
export function eligible(
  data: AppData,
  session: Session,
  now = Date.now(),
): Exercise[] {
  const equipment =
    data.locations.find((p) => p.id === session.locationId)?.equipment ?? [];
  const used = new Set([
    ...session.excluded,
    ...session.completed.map((e) => e.exerciseId),
    ...(session.current ? [session.current.exerciseId] : []),
    ...data.disliked,
    ...data.tooAdvanced,
  ]);
  const avoidFloor = data.feedback.some(f => f.locationId === session.locationId && f.reason === "floor" && f.at >= session.startedAt);
  return exercises.filter(
    (ex) =>
      (!avoidFloor || !exerciseTraits(ex).floor) &&
      (!ex.conditioning || !session.completed.some(p => exerciseById[p.exerciseId]?.conditioning)) &&
      !used.has(ex.id) &&
      levels[ex.level] <= levels[data.profile?.level ?? "beginner"] &&
      ex.equipment.every(
        (e) =>
          equipment.includes(e) && !session.unavailableEquipment.includes(e),
      ) &&
      !blockedBySoreness(ex, session) &&
      ex.primary.some((m) => session.targets.includes(m)) &&
      estimateSeconds(ex, prescription(ex, data).sets) <=
        remainingWorkBudget(session, now),
  );
}
export function baseWeight(ex: Exercise, data: AppData, session: Session, memory?: TrainingMemory, now = Date.now()) {
  const recent = data.history
    .slice(-5)
    .flatMap((s) => s.completed.map((e) => e.exerciseId));
  const completed = session.completed
    .map((e) => exerciseById[e.exerciseId])
    .filter(Boolean);
  const patternCount = completed.filter((e) => e.pattern === ex.pattern).length;
  const overlap = completed.filter((e) =>
    e.primary.some((m) => ex.primary.includes(m)),
  ).length;
  const seen = recent.filter((id) => id === ex.id).length;
  const last = data.history
    .slice()
    .reverse()
    .flatMap((s) => s.completed)
    .find((e) => e.exerciseId === ex.id);
  const difficult = last?.sets.some((s) => s.effort === "hard");
  // Variation stays bounded; session balance outranks novelty and user preferences.
  return (
    ((seen ? 1 : 1.5) / (1 + seen * 0.35) / (1 + patternCount * 2 + overlap)) *
    (difficult ? 0.65 : 1) * preferenceWeight(ex, data, session) *
    sorenessWeight(ex, session) *
    (memory ? historyWeight(ex, memory, session.locationId, now) : 1)
  );
}
export function weightedPick(
  candidates: Exercise[],
  weights: number[],
  random = Math.random,
): Exercise | null {
  if (!candidates.length) return null;
  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0.01));
  const total = safe.reduce((a, b) => a + b, 0);
  let n = Math.min(0.999999999, Math.max(0, random())) * total;
  for (let i = 0; i < candidates.length; i++) {
    n -= safe[i];
    if (n < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
export function applyFeedback(
  data: AppData,
  reason: Rejection,
  muscles: Muscle[] = [],
  equipmentIds: Exercise["equipment"] = [],
  now = Date.now(),
): AppData {
  const session = data.session;
  if (!session?.current) return data;
  const id = session.current.exerciseId;
  const ex = exerciseById[id];
  const unique = <T>(xs: T[]) => [...new Set(xs)];
  return {
    ...data,
    feedback: [
      ...data.feedback,
      { exerciseId: id, reason, locationId: session.locationId, at: now },
    ],
    disliked:
      reason === "dislike" ? unique([...data.disliked, id]) : data.disliked,
    tooAdvanced:
      reason === "advanced"
        ? unique([...data.tooAdvanced, id])
        : data.tooAdvanced,
    locations:
      reason === "unavailable"
        ? data.locations.map((p) =>
            p.id === session.locationId
              ? {
                  ...p,
                  equipment: p.equipment.filter(
                    (e) => !equipmentIds.includes(e),
                  ),
                }
              : p,
          )
        : data.locations,
    session: {
      ...session,
      current: null,
      restUntil: null,
      excluded: unique([...session.excluded, id]),
      completed: session.current.sets.length
        ? [...session.completed, session.current]
        : session.completed,
      unavailableEquipment:
        reason === "busy"
          ? unique([...session.unavailableEquipment, ...equipmentIds])
          : session.unavailableEquipment,
      ...(reason === "sore"
        ? escalate(session, muscles.length ? muscles : ex.primary)
        : {}),
    },
  };
}
export function logSet(data: AppData, set: SetLog): AppData {
  if (
    !Number.isFinite(set.reps) ||
    set.reps <= 0 ||
    set.reps > 300 ||
    !Number.isFinite(set.weight) ||
    set.weight < 0 ||
    set.weight > 1000 ||
    !Number.isFinite(set.at)
  )
    return data;
  const session = data.session;
  if (
    !session?.current ||
    (session.restUntil !== null && session.restUntil > set.at)
  )
    return data;
  const current = { ...session.current, sets: [...session.current.sets, set] };
  const ex = exerciseById[current.exerciseId];
  const done = current.sets.length >= current.plannedSets;
  return {
    ...data,
    session: {
      ...session,
      current: done ? null : current,
      completed: done ? [...session.completed, current] : session.completed,
      restUntil: done ? null : set.at + ex.rest * 1000,
    },
  };
}
export function finishSession(data: AppData, now = Date.now()): AppData {
  if (!data.session) return data;
  const completed = [...data.session.completed];
  if (data.session.current?.sets.length) completed.push(data.session.current);
  const finished = {
    ...data.session,
    completed,
    current: null,
    restUntil: null,
    endedAt: now,
  };
  return {
    ...data,
    session: null,
    history: completed.length ? [...data.history, finished] : data.history,
  };
}
export function weekCount(data: AppData, now = new Date()) {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return data.history.filter((s) => s.endedAt && s.endedAt >= monday.getTime())
    .length;
}

// Cached SDK snapshots can be re-emitted while offline. Only a newer server snapshot
// may replace a known entitlement; the paid-through date still expires locally.
export function mergeBilling(data: AppData, billing: NonNullable<AppData['billing']>): AppData {
  if (!Number.isFinite(billing.verifiedAt)) return data;
  if (data.billing && billing.verifiedAt <= data.billing.verifiedAt) return data;
  return { ...data, billing };
}

export function diverseShortlist(data: AppData, session: Session, candidates: Exercise[], random = Math.random, memory = trainingMemory(data, session), now = Date.now()): Exercise[] {
  const picked: Exercise[] = [];
  for (const pattern of [...new Set(candidates.map(e => e.pattern))]) {
    const group = candidates.filter(e => e.pattern === pattern);
    const selected = weightedPick(group, group.map(e => baseWeight(e, data, session, memory, now)), random);
    if (selected) picked.push(selected);
  }
  let rest = candidates.filter(e => !picked.includes(e));
  while (picked.length < 6 && rest.length) {
    const selected = weightedPick(rest, rest.map(e => baseWeight(e, data, session, memory, now)), random)!;
    picked.push(selected); rest = rest.filter(e => e !== selected);
  }
  return picked.slice(0, 6);
}
export function acceptSelection(data: AppData, sessionId: string, result: Pick<Session, 'current' | 'engine'>, now = Date.now()): AppData {
  if (!data.session || data.session.id !== sessionId || data.session.current) return data;
  if (result.current && !eligible(data, data.session, now).some(e => e.id === result.current!.exerciseId)) return data;
  return { ...data,
    recommendations: result.current ? [...(data.recommendations ?? []), {
      exerciseId: result.current.exerciseId, sessionId, locationId: data.session.locationId, at: now,
    }] : data.recommendations,
    session: { ...data.session, ...result } };
}
