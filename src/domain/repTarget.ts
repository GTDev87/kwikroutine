import { describeSoreness, soreLoad } from './soreness';
import { AppData, Exercise, Performed, Session } from './types';
import { TrainingMemory, trainingMemory } from './trainingMemory';

/** Rep-based strength work only; holds and conditioning are timed. */
export const supportsRepTarget = (ex: Exercise) => !ex.seconds && !ex.conditioning;
/** The lower option Laya may pick: about 20% fewer, always at least one rep below the plan. */
export const fewerReps = (target: number) => {
  const n = Math.max(1, Math.min(target - 1, Math.round(target * .8)));
  return n < target ? n : null;
};
export interface RepOptions {
  target: number;
  fewer: number | null;
  state: string;
}
/** The planned target is always the ceiling. Laya is only asked to choose "fewer" when there is a
 * concrete reason: a hard or short set, a heavier load, light soreness, hard sets today, or an easy day.
 * These are product guardrails, not a measurement of fatigue.
 */
export function repOptions(data: AppData, session: Session, ex: Exercise, current: Performed | null, now = Date.now(), memory?: TrainingMemory): RepOptions | null {
  if (!supportsRepTarget(ex)) return null;
  const target = ex.reps;
  const m = memory ?? trainingMemory(data, session, now);
  const sets = current?.exerciseId === ex.id ? current.sets : [];
  const lastSet = sets.at(-1);
  const lastVisit = m.exercises[ex.id]?.recent.find(v => v.locationId === session.locationId);
  const heavier = !sets.length && !!current?.load?.previous && current.load.suggested > current.load.previous;
  const muscles = [...ex.primary, ...ex.secondary];
  const reasons = [
    lastSet?.effort === 'hard' && 'last set rated hard',
    lastSet && lastSet.reps < target && `last set ${lastSet.reps} of ${target} reps`,
    !sets.length && heavier && 'heavier load than last time',
    !sets.length && lastVisit?.sets.some(s => s.effort === 'hard' || s.reps < target) && 'last visit had hard or short sets',
    soreLoad(ex, session).length > 0 && 'sore muscles involved',
    muscles.some(x => m.muscles[x].hardSets48h > 0) && 'hard sets for these muscles in 48 hours',
    m.currentHardSets > 0 && 'hard sets earlier today',
    session.intent === 'easy' && 'easy day requested',
  ].filter((r): r is string => !!r);
  const fewer = reasons.length ? fewerReps(target) : null;
  return {
    target, fewer,
    state: [
      `${ex.name}. ${data.profile?.level ?? 'beginner'}. Planned ${target} reps per set${ex.unilateral ? ' each side' : ''}. Set ${sets.length + 1} of ${current?.plannedSets ?? 1}.`,
      `Sets so far: ${sets.map(s => `${s.reps} reps ${s.effort}`).join(', ') || 'none'}.`,
      `Last visit here: ${lastVisit ? lastVisit.sets.map(s => `${s.reps} reps ${s.effort}`).join(', ') : 'none recorded'}.`,
      `Load ${current?.load ? `${current.load.suggested} kg (${current.load.source})` : 'bodyweight or unrecorded'}${heavier ? `, up from ${current!.load!.previous} kg` : ''}.`,
      `Today intent ${session.intent ?? 'auto'}. Sore muscles: ${describeSoreness(session) || 'none reported'}. Hard sets today ${m.currentHardSets}.`,
      `Signals: ${reasons.join('; ') || 'none'}.`,
    ].join(' '),
  };
}
/** Fewer reps only when Laya prefers it with finite, normalized scores; otherwise keep the plan. */
export function resolveReps(options: RepOptions, probabilities: Record<string, number> | null): NonNullable<Performed['repTarget']> {
  const p = probabilities;
  const valid = !!p && Number.isFinite(p.same) && Number.isFinite(p.fewer) && p.same >= 0 && p.fewer >= 0 &&
    p.same <= 1 && p.fewer <= 1 && Math.abs(p.same + p.fewer - 1) < .01;
  const fewer = options.fewer !== null && valid && p!.fewer > p!.same;
  return { target: options.target, suggested: fewer ? options.fewer! : options.target, source: valid && options.fewer !== null ? 'laya' : 'plan' };
}
