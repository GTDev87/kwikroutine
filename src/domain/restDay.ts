import { describeSoreness, resting } from './soreness';
import { restBasis, todayCheckIn } from './today';
import { AppData } from './types';

const DAY = 86400000;
export interface RestOptions { basis: string; state: string }
/** Rest is only on the table for a scheduled open day soon after training, or when something
 * is sore or painful. A long gap always means train, so open days can't rest indefinitely.
 */
export function restOptions(data: AppData, now = Date.now()): RestOptions | null {
  const checkIn = todayCheckIn(data, now);
  const done = data.history
    .filter(s => s.completed.some(p => p.sets.length))
    .map(s => ({ at: s.endedAt ?? s.startedAt, sets: s.completed.flatMap(p => p.sets) }))
    .filter(s => s.at <= now);
  const last = Math.max(-Infinity, ...done.map(s => s.at));
  const recovering = resting(checkIn).length > 0 || checkIn.pain;
  if (!(now - last < 2 * DAY || (recovering && now - last < 3 * DAY))) return null;
  const week = done.filter(s => s.at >= now - 7 * DAY);
  const days3 = new Set(done.filter(s => s.at >= now - 3 * DAY).map(s => new Date(s.at).toDateString())).size;
  const sets = week.flatMap(s => s.sets);
  const hard = sets.length ? (sets.filter(s => s.effort === 'hard').length / sets.length).toFixed(2) : 'unknown';
  return {
    basis: restBasis(data, now),
    state: [
      `Open training day with no set focus. ${data.profile?.level ?? 'beginner'}. Weekly goal ${data.profile?.weeklyGoal ?? 3} workouts.`,
      `Workouts in 7 days: ${week.length}; training days in the last 3 days: ${days3}; hours since last workout: ${Math.round((now - last) / 3600000)}.`,
      `Sore muscles: ${describeSoreness(checkIn) || 'none reported'}. Pain reported: ${checkIn.pain ? 'yes' : 'no'}.`,
      `Recent hard-set fraction ${hard}.`,
    ].join(' '),
  };
}
// Training is the default; rest needs a clear, well-formed preference.
export function resolveRest(probabilities: Record<string, number> | null) {
  const p = probabilities;
  return !!p && Number.isFinite(p.rest) && Number.isFinite(p.train) && p.rest >= .6 && p.rest <= 1 &&
    p.train >= 0 && Math.abs(p.rest + p.train - 1) < .01;
}
