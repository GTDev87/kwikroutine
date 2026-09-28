import { describeSoreness } from './soreness';
import { AppData, Equipment, Exercise, Level, Performed, Session } from './types';
import { TrainingMemory, trainingMemory } from './trainingMemory';
import { WeightUnit, fromKg, toKg, weightUnit } from './weightUnits';

const DAY = 86400000;
// Only equipment where a larger recorded load means more resistance. Assistance,
// elastic bands, bodyweight and conditioning need different progression models.
const loadEquipment = new Set<Equipment>([
  'dumbbells', 'kettlebells', 'barbell', 'ez-bar', 'trap-bar', 'plates', 'landmine',
  'cable', 'smith-machine', 'leg-press', 'leg-curl', 'seated-leg-curl', 'leg-extension',
  'chest-press', 'row-machine', 'seated-cable-row', 'lat-pulldown', 'hack-squat',
  'standing-calf-machine', 'shoulder-press', 'lateral-raise-machine', 'hip-abduction',
  'hip-adduction', 'back-extension-machine', 'biceps-machine', 'pec-deck',
  'preacher-machine', 'ab-machine', 'triceps-machine', 'donkey-calf-machine',
  'glute-drive', 'shrug-machine', 'seated-calf-machine', 'wrist-roller',
]);
export function supportsLoad(ex: Exercise) {
  return !ex.conditioning && !ex.seconds &&
    !ex.equipment.some(e => e === 'assisted-dip' || e === 'assisted-pullup') &&
    !/\bassisted\b/i.test(ex.name) && ex.equipment.some(e => loadEquipment.has(e));
}
/** The smallest sensible change in the user's unit: 2.5 lb / 1 kg for hand weights, 5 lb / 2.5 kg otherwise. */
export function loadStep(ex: Exercise, unit: WeightUnit) {
  const handWeights = ex.equipment.some(e => e === 'dumbbells' || e === 'kettlebells');
  return unit === 'lb' ? (handWeights ? 2.5 : 5) : (handWeights ? 1 : 2.5);
}
// Conservative first-visit loads in kg, per hand for dumbbells and kettlebells and the total
// for bars. "small" is isolation work for arms, shoulders, calves and grip.
const startingKg: Record<string, { small: number; medium: number; large: number }> = {
  barbell: { small: 20, medium: 20, large: 20 }, // an empty Olympic bar
  'trap-bar': { small: 25, medium: 25, large: 25 },
  'ez-bar': { small: 10, medium: 10, large: 10 },
  'smith-machine': { small: 10, medium: 10, large: 20 },
  dumbbells: { small: 4, medium: 7, large: 9 },
  kettlebells: { small: 6, medium: 8, large: 12 },
  landmine: { small: 5, medium: 10, large: 10 },
  plates: { small: 5, medium: 5, large: 10 },
  'leg-press': { small: 40, medium: 40, large: 40 },
  machine: { small: 10, medium: 20, large: 25 },
};
const levelScale = { beginner: 1, intermediate: 1.5, advanced: 2 };
const isolation = /curl|raise|fly|kickback|extension|pushdown|press-?down|wrist|rotation|face-pull|side-bend|halo|shrug|calf|crunch|pullover|reverse-fly|upright/;
/** A cautious starting weight for an exercise with no recorded load. A product default, not a strength estimate. */
export function estimateLoad(ex: Exercise, level: Level, unit: WeightUnit) {
  const kind = ['barbell', 'trap-bar', 'ez-bar', 'smith-machine', 'dumbbells', 'kettlebells', 'landmine', 'plates', 'leg-press']
    .find(e => ex.equipment.includes(e as Equipment)) ?? 'machine';
  const size = ex.pattern === 'squat' || ex.pattern === 'hinge' ? 'large'
    : ex.pattern === 'accessory' || isolation.test(ex.id) ? 'small' : 'medium';
  // Experience scales compound lifts more than isolation work.
  const scale = size === 'small' ? 1 + (levelScale[level] - 1) / 2 : levelScale[level];
  const step = loadStep(ex, unit);
  return toKg(Math.max(step, Math.round(fromKg(startingKg[kind][size] * scale, unit) / step) * step), unit);
}
/** A default for the weight field when progression has nothing to offer: the most recent
 * weight logged for this exercise anywhere, otherwise a cautious starting estimate. */
export function defaultLoad(data: AppData, session: Session, ex: Exercise, now = Date.now()): NonNullable<Performed['load']> | undefined {
  if (!supportsLoad(ex)) return undefined;
  const last = data.history.filter(s => s.id !== session.id && s.startedAt <= now)
    .flatMap(s => s.completed.filter(p => p.exerciseId === ex.id).flatMap(p => p.sets))
    .filter(set => set.at <= now && Number.isFinite(set.weight) && set.weight > 0 && set.weight <= 1000)
    .sort((a, b) => b.at - a.at)[0];
  if (last) return { previous: last.weight, suggested: last.weight, source: 'history' };
  return { suggested: estimateLoad(ex, data.profile?.level ?? 'beginner', weightUnit(data.profile)), source: 'estimate' };
}
export interface LoadOptions {
  previous: number;
  increase: number | null;
  state: string;
}
/** Two complete, comparable visits; no increases from a single easy set.
 * These are conservative product bounds, not a measurement of readiness.
 */
export function loadOptions(data: AppData, session: Session, ex: Exercise, now = Date.now(), memory?: TrainingMemory): LoadOptions | null {
  if (!supportsLoad(ex)) return null;
  const visits = [...new Map(data.history.filter(s => s.id !== session.id && s.locationId === session.locationId &&
    s.endedAt && s.endedAt <= now && s.startedAt <= now).map(s => [s.id, s])).values()]
    .filter(s => s.completed.some(p => p.exerciseId === ex.id && p.sets.length))
    .sort((a, b) => b.endedAt! - a.endedAt!);
  const latest = visits[0];
  if (!latest || latest.endedAt! < now - 28 * DAY) return null;
  const item = latest.completed.find(p => p.exerciseId === ex.id && p.sets.length)!;
  const last = item.sets[item.sets.length - 1];
  const previous = last.weight;
  if (!Number.isFinite(previous) || previous <= 0 || previous > 1000 || last.at > now) return null;
  const unit = weightUnit(data.profile);
  const step = loadStep(ex, unit);
  const next = toKg((Math.floor((fromKg(previous, unit) + .001) / step) + 1) * step, unit);
  const increment = next - previous;
  const m = memory ?? trainingMemory(data, session, now);
  const muscles = [...ex.primary, ...ex.secondary];
  const comparable = visits.slice(0, 2).length === 2 && visits[0].startedAt - visits[1].endedAt! >= DAY &&
    visits.slice(0, 2).every(s => s.endedAt! >= now - 28 * DAY && s.completed.filter(p => p.exerciseId === ex.id).length === 1 &&
      s.completed.filter(p => p.exerciseId === ex.id).every(p => p.sets.length >= Math.max(2, p.plannedSets) &&
        p.sets.every(set => Math.abs(set.weight - previous) < .005 && Number.isFinite(set.reps) && set.reps >= ex.reps + 2 && set.reps <= 300 &&
          set.effort === 'easy' && set.at >= s.startedAt && set.at <= s.endedAt!)));
  const allowed = comparable && next <= 1000 && increment / previous <= .100001 && increment / previous >= .02 &&
    session.startedAt - latest.endedAt! >= DAY && session.intent !== 'easy' &&
    !muscles.some(muscle => session.sore.includes(muscle) || m.muscles[muscle].hardSets48h > 0) &&
    m.currentHardSets === 0 && !session.current?.sets.length;
  return {
    previous, increase: allowed ? next : null,
    state: [
      `${ex.name}. ${data.profile?.level ?? 'beginner'}. Target ${ex.reps} reps per set. Load recorded in kg at this location: ${previous}.`,
      `Last two visits: ${comparable ? 'all planned sets completed, at least two extra reps each, all rated easy at the same weight' : 'not qualified for an increase'}.`,
      `Today intent ${session.intent ?? 'auto'}, style ${session.style ?? 'balanced'}. Sore muscles: ${describeSoreness(session) || 'none reported'}.`,
      `Workouts in 7 days: ${m.workouts7}; lifetime workouts ${m.workouts}; sets today ${m.currentSets}; hard sets today ${m.currentHardSets}.`,
      `Recent hard-set fraction ${m.recentHardRate === null ? 'unknown' : m.recentHardRate.toFixed(2)}. Completion fraction ${m.completionRate === null ? 'unknown' : m.completionRate.toFixed(2)}.`,
      `Same exercise lifetime visits ${m.exercises[ex.id]?.visits ?? 0}.`,
    ].join(' '),
  };
}
export function resolveLoad(options: LoadOptions, probabilities: Record<string, number> | null): NonNullable<Performed['load']> {
  const p = probabilities;
  const increase = options.increase !== null && p && Number.isFinite(p.increase) && Number.isFinite(p.hold) &&
    p.increase >= .6 && p.increase <= 1 && p.hold >= 0 && p.hold <= 1 && Math.abs(p.increase + p.hold - 1) < .01 && p.increase > p.hold;
  return { previous: options.previous, suggested: increase ? options.increase! : options.previous, source: increase ? 'laya' : 'history' };
}
