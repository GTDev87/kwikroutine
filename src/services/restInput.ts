import { RestOptions } from '../domain/restDay';
import { buildSequence } from '../vendor/laya/common';
import { TokenizerLike } from '../vendor/laya/tokenizer';

export function buildRestInput(tok: TokenizerLike, options: RestOptions, maxLen = 512, headMaxLen = 192) {
  return buildSequence(tok, options.state, {
    t: 'choice', ins: 'Decide whether today should be a training day or a rest day from recent training and current recovery.',
    crit: {
      train: 'Train today: appropriate when recovered, with few recent workouts and little soreness.',
      rest: 'Rest today: appropriate after consecutive training days, many hard sets, soreness or pain.',
    },
  }, maxLen, headMaxLen);
}
