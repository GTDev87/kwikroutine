import { AppData, Exercise, Performed, Session } from '../domain/types';
import { repOptions, resolveReps } from '../domain/repTarget';
import { scoreRepsWithLaya } from './laya';

/** Reps to suggest for the next set of `current`. Keeps the plan if inference is unavailable. */
export async function chooseReps(data: AppData, session: Session, ex: Exercise, current: Performed | null) {
  const options = repOptions(data, session, ex, current);
  if (!options) return undefined;
  let probabilities: Record<string, number> | null = null;
  if (options.fewer !== null) {
    try { probabilities = await scoreRepsWithLaya(options); }
    catch { /* Keep the planned reps if inference is unavailable. */ }
  }
  return resolveReps(options, probabilities);
}
