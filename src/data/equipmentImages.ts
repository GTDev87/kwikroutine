import { Equipment } from '../domain/types';
// Identification examples showing the station in use, not manufacturer-specific models.
export const equipmentImageIds: Partial<Record<Equipment, string>> = {
  mat: 'plank', dumbbells: 'bicep-curl', bands: 'band-pull-apart', bench: 'db-bench-press',
  barbell: 'deadlift', cable: 'cable-curl', 'pullup-bar': 'pull-up',
  'leg-press': 'leg-press', 'leg-curl': 'leg-curl', 'leg-extension': 'leg-extension', 'chest-press': 'chest-press-machine',
  'seated-cable-row': 'seated-cable-row', kettlebells: 'kettlebell-deadlift', 'ez-bar': 'ez-bar-curl',
  'smith-machine': 'smith-machine-squat', 'loop-bands': 'banded-clamshell', suspension: 'trx-row',
  'stability-ball': 'ball-leg-curl', rings: 'ring-row', plates: 'plate-pinch', 'dip-station': 'dips',
  'lat-pulldown': 'v-bar-lat-pulldown', 'hack-squat': 'hack-squat', 'standing-calf-machine': 'standing-calf-raise',
  'shoulder-press': 'machine-shoulder-press', 'lateral-raise-machine': 'plate-loaded-lateral-raise',
  'ab-wheel': 'ab-wheel-rollout', 'assisted-dip': 'assisted-dips', 'assisted-pullup': 'assisted-pull-ups',
  'trap-bar': 'hex-bar-deadlift', 'hip-abduction': 'hip-abduction', 'hip-adduction': 'hip-adduction',
  'back-extension-machine': 'machine-back-extension', 'biceps-machine': 'machine-bicep-curl',
  'pec-deck': 'pec-deck', 'preacher-machine': 'machine-preacher-curl', 'ab-machine': 'machine-seated-crunch',
  'triceps-machine': 'machine-triceps-extension', 'nordic-bench': 'nordic-hamstring-curl',
  'donkey-calf-machine': 'plate-loaded-donkey-calf-raise', 'glute-drive': 'plate-loaded-glute-drive',
  'shrug-machine': 'plate-loaded-shrug', 'seated-calf-machine': 'seated-calf-raise', 'wrist-roller': 'wrist-roller',
  'seated-leg-curl': 'seated-leg-curl', 'roman-chair': 'back-extension', 'captains-chair': 'captains-chair-knee-raise',
  'preacher-bench': 'preacher-curl', 'decline-bench': 'decline-bench-press', 'adjustable-bench': 'incline-db-press',
  landmine: 'landmine-press',
};
