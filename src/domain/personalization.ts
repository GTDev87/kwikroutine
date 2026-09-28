import { exerciseTraits } from './exerciseTraits';
import { AppData, DailyIntent, Exercise, Session, SessionStyle } from './types';
import { exerciseById } from '../data/exercises';

export function dailyIntent(data: AppData, now = Date.now()): DailyIntent {
  const d = new Date(now);
  const day = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  return data.checkIn?.day === day ? data.checkIn.intent ?? 'auto' : 'auto';
}
export function chooseStyle(data: AppData, locationId: string, intent: DailyIntent): SessionStyle {
  if (intent === 'familiar') return 'familiar';
  if (intent === 'surprise') return 'discovery';
  if (intent === 'easy') return 'minimal';
  const recent = data.feedback.filter(f => f.locationId === locationId).slice(-12);
  if (recent.some(f => f.reason === 'setup' || f.reason === 'crowded')) return 'minimal';
  if (data.locations.find(p => p.id === locationId)?.kind === 'bedroom') return 'quiet';
  return 'balanced';
}
export function preferenceWeight(ex: Exercise, data: AppData, session: Session) {
  const traits = exerciseTraits(ex);
  const known = new Set(data.history.flatMap(s => s.completed.filter(p => p.sets.length).map(p => p.exerciseId)));
  const familiar = known.has(ex.id);
  const style = session.style ?? 'balanced';
  let weight = 1;
  if (style === 'quiet' && !traits.quiet) weight *= .15;
  if (style === 'minimal') {
    if (traits.setup === 'involved') weight *= .25;
    const previous = session.completed.at(-1);
    const last = previous && exerciseById[previous.exerciseId];
    if (last && ex.equipment.some(e => !last.equipment.includes(e))) weight *= .4;
  }
  if (style === 'familiar' && known.size) weight *= familiar ? 2.5 : .35;
  if (style === 'discovery' && known.size) {
    const newAlready = session.completed.some(p => !known.has(p.exerciseId));
    weight *= newAlready ? (familiar ? 2 : .25) : (familiar ? .8 : 1.8);
  }
  if (session.intent === 'easy') {
    if (ex.level !== 'beginner') weight *= .35;
    if (traits.setup === 'involved') weight *= .5;
  }
  // Challenge changes variety/complexity only within the user's existing level.
  if (session.intent === 'challenge') {
    if (ex.level === data.profile?.level) weight *= 1.4;
    if (['squat', 'hinge', 'push', 'pull'].includes(ex.pattern)) weight *= 1.3;
  }
  const feedback = data.feedback.filter(f => f.locationId === session.locationId).slice(-24);
  for (const reason of ['setup','floor','crowded','repetitive'] as const) {
    const signals = feedback.filter(f => f.reason === reason);
    if (!signals.length) continue;
    const current = signals.some(f => f.at >= session.startedAt);
    const strength = current ? .12 : Math.max(.3, 1 / (1 + signals.length * .6));
    if (reason === 'setup' && traits.setup === 'involved') weight *= strength;
    if (reason === 'floor' && traits.floor) weight *= strength;
    if (reason === 'crowded' && ex.equipment.length) weight *= strength;
    if (reason === 'repetitive' && signals.some(f => f.exerciseId === ex.id)) weight *= strength;
  }
  return weight;
}
export { personalizationContext } from './coachContext';
export { exerciseTraits } from './exerciseTraits';
