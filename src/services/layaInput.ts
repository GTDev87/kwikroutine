import { AppData, Exercise, Session } from '../domain/types';
import { personalizationContext } from '../domain/coachContext';
import { buildQuestionPrefix, sequenceWithState } from '../vendor/laya/common';
import { TokenizerLike } from '../vendor/laya/tokenizer';

/** Pack complete facts with the real tokenizer. Never silently cut an option or history row.
 * Every candidate keeps a history row before optional detail can consume the remaining space.
 */
export function buildPersonalizedInput(tok: TokenizerLike, data: AppData, session: Session, candidates: Exercise[], now=Date.now(), maxLen=512, headMaxLen=192) {
  const context=personalizationContext(data,session,candidates,now);
  const instruction='Choose a manageable next exercise. Prefer underworked muscles; avoid repeating today\'s workload and repeated skips. Novelty is secondary.';
  const headTokens=tok.encode(`choice question: ${instruction}`).length;
  const optionBudget=Math.min(47,Math.floor((headMaxLen-Math.max(16,headTokens))/Math.max(1,candidates.length))-1);
  if(optionBudget<4 || candidates.length>6)throw new Error('Unsupported Laya choice budget');
  const criteria=Object.fromEntries(Object.entries(context.criteria).map(([key,value])=>{
    let words=value.split(' ');
    while(tok.encode(` ${key}: ${words.join(' ')}`).length>optionBudget && words.length>1)words=words.slice(0,-1);
    if(tok.encode(` ${key}: ${words.join(' ')}`).length>optionBudget)throw new Error('Option exceeds Laya budget');
    return [key,words.join(' ')];
  }));
  const question={t:'choice' as const,ins:instruction,crit:criteria};
  const prefix=buildQuestionPrefix(tok,question,maxLen,headMaxLen);
  const budget=maxLen-prefix.ids.length-1;
  const clean=(text:string)=>text.split(tok.maskToken).join(' ');
  const length=(facts:string[])=>tok.encode(clean(facts.join('\n'))).length;
  const facts=[...context.essentials,...context.candidateFacts.map(f=>f.short)];
  if(length(facts)>budget)throw new Error('Essential coaching context exceeds Laya budget');
  const included:string[]=[];
  // Workload and current feedback outrank less relevant lifetime detail.
  for(const fact of context.extraFacts.slice(0,2))if(length([...facts,fact])<=budget){facts.push(fact);included.push(fact);}
  const detailed=facts.slice();
  context.candidateFacts.forEach((fact,i)=>{detailed[context.essentials.length+i]=fact.detail;});
  // Give the same level of detail to every candidate; the first option gets no extra advantage.
  if(length(detailed)<=budget)facts.splice(0,facts.length,...detailed);
  for(const fact of context.extraFacts.slice(2))if(length([...facts,fact])<=budget){facts.push(fact);included.push(fact);}
  const state=facts.join('\n'), stateIds=tok.encode(clean(state));
  const sequence=sequenceWithState(prefix,stateIds,tok.sepId,maxLen);
  return {...sequence,state,criteria,stateTokens:stateIds.length,stateBudget:budget,
    omittedFacts:context.extraFacts.length-included.length,historyWorkouts:context.memory.workouts};
}
