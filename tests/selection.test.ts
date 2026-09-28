import { afterEach, expect, it, vi } from 'vitest';
import { initialData } from '../src/domain/types';
import { eligible, newSession } from '../src/domain/engine';
vi.mock('../src/services/laya', () => ({ scoreWithLaya: vi.fn().mockRejectedValue(new Error('ONNX native module is not registered')) }));
import { chooseNext } from '../src/services/selection';
afterEach(() => vi.unstubAllGlobals());
it('still reveals an eligible exercise when native AI initialization fails', async () => {
  vi.stubGlobal('__DEV__', false);
  const data = structuredClone(initialData);
  data.profile = { level: 'beginner', routine: 'full', weeklyGoal: 3 };
  const session = newSession(data, 30, 'full', [], ['shoulders']);
  const allowed = eligible(data, session).map(e => e.id);
  const result = await chooseNext(data, session);
  expect(result.engine).toBe('rules');
  expect(result.current).not.toBeNull();
  expect(allowed).toContain(result.current!.exerciseId);
});
