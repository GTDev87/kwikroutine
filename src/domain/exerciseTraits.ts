import { Exercise } from './types';

export function exerciseTraits(ex: Exercise) {
  if (ex.traits) return ex.traits;
  const floor = /prone|supine|plank|bridge|dead-bug|bird-dog|heel-slide|clamshell|side-leg-raise|snow|knee-pushup|^pushup$|floor-press/.test(ex.id);
  return { floor, quiet: true, setup: ex.equipment.length > 1 || ex.equipment.includes('barbell') ? 'involved' as const : 'simple' as const };
}
