import { LoadOptions } from '../domain/loadProgression';
import { buildSequence } from '../vendor/laya/common';
import { TokenizerLike } from '../vendor/laya/tokenizer';

export function buildLoadInput(tok: TokenizerLike, options: LoadOptions, maxLen = 512, headMaxLen = 192) {
  return buildSequence(tok, options.state, {
    t: 'choice', ins: 'Choose the appropriate next training load from the recorded performance and current workout context.',
    crit: {
      hold: `Keep ${options.previous.toFixed(2)} kg: appropriate for fatigue, difficult or incomplete sets, uncertain progress, or an easier day.`,
      increase: `Try ${options.increase!.toFixed(2)} kg: appropriate after repeated easy completed sets exceeding target reps, with no current soreness or hard sets.`,
    },
  }, maxLen, headMaxLen);
}
