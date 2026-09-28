import { AppData } from '../domain/types';
import { resolveRest, restOptions } from '../domain/restDay';
import { scoreRestWithLaya } from './laya';

/** Whether a scheduled open day becomes a rest day. Trains when rest isn't an option or inference is unavailable. */
export async function chooseRest(data: AppData, now = Date.now()) {
  const options = restOptions(data, now);
  if (!options) return false;
  try { return resolveRest(await scoreRestWithLaya(options)); }
  catch { return false; }
}
