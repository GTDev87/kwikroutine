import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { parseTokenizerJson, encodeWithData, TokenizerLike } from '../src/vendor/laya/tokenizer';
import { buildSequence, InternalQ } from '../src/vendor/laya/common';
import fixtures from './fixtures/laya-parity.json';
const path = 'assets/models/tokenizer.layajson';
describe.skipIf(!existsSync(path))('mobile Laya tokenizer parity with the upstream Python model', () => {
 const parsed = existsSync(path) ? parseTokenizerJson(JSON.parse(readFileSync(path, 'utf8'))) : null;
 for (const [i, f] of fixtures.entries()) {
  it(`encodes exercise scenario ${i + 1} identically, including all option markers`, () => {
   expect(parsed).not.toBeNull();
   const tok: TokenizerLike = { clsId: parsed!.ids.cls, sepId: parsed!.ids.sep, maskId: parsed!.ids.mask, padId: parsed!.ids.pad, maskToken: parsed!.maskToken, encode: text => encodeWithData(parsed!, text) };
   const {ids, markers} = buildSequence(tok, f.state, f.question as InternalQ);
   expect(ids).toEqual(f.ids); expect(markers).toEqual(f.markers);
   expect(f.maxProbabilityDrift).toBeLessThan(0.01); expect(f.sameTopChoice).toBe(true);
  });
 }
});
