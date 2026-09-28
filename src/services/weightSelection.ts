import { AppData, Exercise, Session } from '../domain/types';
import { loadOptions, resolveLoad } from '../domain/loadProgression';
import { scoreLoadWithLaya } from './laya';

export async function chooseLoad(data: AppData, session: Session, ex: Exercise) {
  const options = loadOptions(data, session, ex);
  if (!options) return undefined;
  let probabilities: Record<string, number> | null = null;
  if (options.increase !== null) {
    try { probabilities = await scoreLoadWithLaya(options); }
    catch { /* Keep the last recorded load if inference is unavailable. */ }
  }
  return resolveLoad(options, probabilities);
}
