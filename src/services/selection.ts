import { AppData, Session } from "../domain/types";
import {
  baseWeight,
  diverseShortlist,
  eligible,
  prescription,
  weightedPick,
} from "../domain/engine";
import { scoreWithLaya } from "./laya";
import { chooseLoad } from './weightSelection';
import { chooseReps } from './repSelection';
import { trainingMemory } from '../domain/trainingMemory';
export async function chooseNext(data: AppData, session: Session) {
  const candidates = eligible(data, session);
  const now = Date.now();
  const memory = trainingMemory(data, session, now);
  // Keep the question compact and prioritize balanced candidates before inference.
  const shortlist = diverseShortlist(data, session, candidates, Math.random, memory, now);
  let modelWeights: Record<string, number> | null = null;
  try {
    modelWeights = await scoreWithLaya(data, session, shortlist);
  } catch (error) {
    if (__DEV__)
      console.warn(
        "Local Laya unavailable; using constrained local selection.",
        error,
      );
  }
  // Recheck elapsed time after inference; never admit an exercise the hard filters excluded.
  const stillAllowed = new Set(eligible(data, session).map((e) => e.id));
  const available = shortlist.filter((e) => stillAllowed.has(e.id));
  const ex = weightedPick(
    available,
    available.map(
      (e) =>
        baseWeight(e, data, session, memory, now) *
        (modelWeights ? 0.15 + (modelWeights[e.id] ?? 0) : 1),
    ),
  );
  const load = ex ? await chooseLoad(data, session, ex) : undefined;
  const plannedSets = ex ? prescription(ex, data).sets : 0;
  const repTarget = ex ? await chooseReps(data, session, ex, { exerciseId: ex.id, sets: [], plannedSets, load }) : undefined;
  return {
    current: ex
      ? {
          exerciseId: ex.id,
          sets: [],
          plannedSets,
          load,
          repTarget,
        }
      : null,
    engine: modelWeights ? ("laya" as const) : ("rules" as const),
  };
}
