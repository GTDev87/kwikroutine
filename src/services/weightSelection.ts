import { AppData, Exercise, Session } from '../domain/types';
import { defaultLoad, loadOptions, resolveLoad } from '../domain/loadProgression';
import { scoreLoadWithLaya } from './laya';

export async function chooseLoad(data: AppData, session: Session, ex: Exercise) {
  const options = loadOptions(data, session, ex);
  // No recent comparable visit here: still pre-fill the weight field with a sensible default.
  if (!options) return defaultLoad(data, session, ex);
  let probabilities: Record<string, number> | null = null;
  if (options.increase !== null) {
    try { probabilities = await scoreLoadWithLaya(options); }
    catch { /* Keep the last recorded load if inference is unavailable. */ }
  }
  return resolveLoad(options, probabilities);
}
