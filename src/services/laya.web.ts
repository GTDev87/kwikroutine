import { AppData, Exercise, Session } from "../domain/types";
export async function scoreWithLaya(
  _data: AppData,
  _session: Session,
  _candidates: Exercise[],
): Promise<Record<string, number> | null> {
  return null;
}
export const layaStatus = () => "Browser preview uses local exercise rules";

export async function scoreLoadWithLaya(_options: import("../domain/loadProgression").LoadOptions): Promise<Record<string, number> | null> { return null; }
