import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { exercises } from '../src/data/exercises';
import { EQUIPMENT, type Equipment, type Exercise } from '../src/domain/types';

// Execute the actual Metro image modules, replacing asset IDs with local paths.
// This catches missing mappings, broken imports and absent files without React Native.
function loadImageModule(file: string): Record<string, unknown> {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, { exports, require: (request: string) => {
    const target = resolve(dirname(file), request);
    if (/\.(png|jpg)$/.test(target)) return target;
    return loadImageModule(target + '.ts');
  } });
  return exports;
}

function expectImage(picture: string) {
  const bytes = readFileSync(picture);
  expect(bytes.length, picture).toBeGreaterThan(1000);
  const signature = bytes.subarray(0, 4).toString('hex');
  expect(signature === '89504e47' || signature.startsWith('ffd8ff'), picture).toBe(true);
}

describe('complete offline exercise pictures', () => {
  it('resolves a real local image for every exercise through the production resolver', () => {
    const { picturesFor } = loadImageModule(resolve('src/data/picturesFor.ts')) as {
      picturesFor: (exercise: Exercise) => string[];
    };
    expect(exercises.length).toBeGreaterThan(300);
    for (const exercise of exercises) {
      const pictures = picturesFor(exercise);
      expect(pictures.length, exercise.id).toBeGreaterThan(0);
      for (const picture of pictures) expectImage(picture);
    }
  });
  it('resolves a real local image for every equipment choice', () => {
    const { equipmentPicture } = loadImageModule(resolve('src/data/equipmentImages.ts')) as {
      equipmentPicture: (equipment: Equipment) => string | undefined;
    };
    for (const equipment of EQUIPMENT) {
      const picture = equipmentPicture(equipment);
      expect(picture, equipment).toBeTruthy();
      expectImage(picture!);
    }
  });
  it('keeps provenance and distinct artwork for each new illustration', () => {
    const manifest = JSON.parse(readFileSync('assets/exercises-original/manifest.json', 'utf8'));
    const hashes = new Set<string>();
    for (const asset of manifest.assets) {
      expect(exercises.some(ex => ex.id === asset.exerciseId)).toBe(true);
      expect(asset.prompt.length).toBeGreaterThan(30);
      const bytes = readFileSync(resolve('assets/exercises-original', asset.file));
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
    }
    expect(hashes.size).toBe(manifest.assets.length);
  });
});
