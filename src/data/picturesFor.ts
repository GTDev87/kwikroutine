import type { Exercise } from '../domain/types';
import { exerciseImages, legacyImageIds } from './exerciseImages';
import { supplementalExerciseImages } from './supplementalExerciseImages';

export function picturesFor(ex: Exercise): number[] {
  return supplementalExerciseImages[ex.id]
    ?? exerciseImages[ex.sourceId ?? legacyImageIds[ex.id]]
    ?? [];
}
