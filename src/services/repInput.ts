import { RepOptions } from '../domain/repTarget';
import { buildSequence } from '../vendor/laya/common';
import { TokenizerLike } from '../vendor/laya/tokenizer';

export function buildRepInput(tok: TokenizerLike, options: RepOptions, maxLen = 512, headMaxLen = 192) {
  return buildSequence(tok, options.state, {
    t: 'choice', ins: 'Choose the repetition target for the next set from recorded sets and current workout context.',
    crit: {
      same: `Keep ${options.target} reps: appropriate when recent sets were completed at target with manageable effort.`,
      fewer: `Do ${options.fewer} reps: appropriate after a hard or incomplete set, a heavier load, soreness, hard sets today, or an easier day.`,
    },
  }, maxLen, headMaxLen);
}
