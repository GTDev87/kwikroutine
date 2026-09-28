import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { exercises, exerciseById } from '../src/data/exercises';
import { initialData, Session } from '../src/domain/types';
import { acceptSelection, applyFeedback, newSession, DAY } from '../src/domain/engine';
import { historyWeight, performanceTrend, trainingMemory } from '../src/domain/trainingMemory';
import { buildPersonalizedInput } from '../src/services/layaInput';
import { personalizationContext } from '../src/domain/coachContext';
import { parseTokenizerJson, encodeWithData, TokenizerLike } from '../src/vendor/laya/tokenizer';
import { dataSchema } from '../src/state/schema';
const now = new Date(2026,8,27,18).getTime();
function setup() { const data=structuredClone(initialData);data.profile={level:'beginner',routine:'full',weeklyGoal:3};return data; }
function workout(id:string, at:number, reps=10, weight=0, locationId='home'):Session {
  const d=setup();d.selectedLocationId=locationId;
  return {...newSession(d,30,'full',[],[],at-20*60000),id:`${id}-${at}`,endedAt:at,
    completed:[{exerciseId:id,plannedSets:2,sets:[0,1].map(i=>({reps,weight,effort:'right' as const,at:at-i*60000}))}]};
}
const parsed=parseTokenizerJson(JSON.parse(readFileSync('assets/models/tokenizer.layajson','utf8')))!;
const tok:TokenizerLike={clsId:parsed.ids.cls,sepId:parsed.ids.sep,maskId:parsed.ids.mask,padId:parsed.ids.pad,maskToken:parsed.maskToken,encode:s=>encodeWithData(parsed,s)};
describe('training memory',()=>{
 it('uses the entire saved history rather than a recent tail',()=>{
  const d=setup();d.history=Array.from({length:200},(_,i)=>workout('body-squat',now-(i+1)*DAY));
  const session=newSession(d,30,'full',[],[],now);const m=trainingMemory(d,session,now);
  expect(m.workouts).toBe(200);expect(m.totalSets).toBe(400);expect(m.exercises['body-squat'].visits).toBe(200);
  expect(m.workouts7).toBe(7);expect(m.workouts28).toBe(28);
  expect(m.muscles.quads.sets7).toBe(13); // boundary set from exactly seven days ago only
  expect(m.exercises['body-squat'].recent.length).toBe(6);
 });
 it('keeps missing history unknown and excludes empty, duplicate, future and active records',()=>{
  const d=setup(),s=newSession(d,30,'full',[],[],now);
  const empty=trainingMemory(d,s,now);expect(empty.recentHardRate).toBeNull();expect(empty.usualMinutes).toBeNull();
  const old=workout('body-squat',now-DAY);d.history=[old,old,workout('body-squat',now+DAY),s];
  const m=trainingMemory(d,s,now);expect(m.workouts).toBe(1);expect(m.totalSets).toBe(2);
 });
 it('compares three sessions only at the same location and load',()=>{
  const d=setup();d.selectedLocationId='home';const s=newSession(d,30,'full',[],[],now), ex=exerciseById['db-curl'];
  d.history=[workout(ex.id,now-3*DAY,10,5),workout(ex.id,now-2*DAY,10,5),workout(ex.id,now-DAY,13,5),workout(ex.id,now-1000,20,1,'bedroom')];
  expect(performanceTrend(ex,trainingMemory(d,s,now),'home',now)).toBe('more reps');
  d.history[2].completed[0].sets[0].weight=10;
  expect(performanceTrend(ex,trainingMemory(d,s,now),'home',now)).toBe('changed load');
  expect(performanceTrend(ex,trainingMemory(d,s,now),'bedroom',now)).toBe('unknown');
 });
 it('does not mistake timed seconds for strength repetitions',()=>{
  const d=setup(),s=newSession(d,30,'full',[],[],now),ex=exercises.find(e=>e.seconds)!;
  d.history=[3,2,1].map((n)=>workout(ex.id,now-n*DAY,n===1?15:30));
  expect(performanceTrend(ex,trainingMemory(d,s,now),'home',now)).toBe('shorter holds');
 });
 it('keeps current workload and location feedback distinct from lifetime performance',()=>{
  const d=setup();d.selectedLocationId='home';const s=newSession(d,30,'full',[],[],now-60000);
  s.completed=[{exerciseId:'body-squat',plannedSets:2,sets:[{reps:10,weight:0,effort:'hard',at:now}]}];
  d.feedback=[{exerciseId:'body-squat',reason:'busy',locationId:'bedroom',at:now},{exerciseId:'body-squat',reason:'setup',locationId:'home',at:now}];
  const m=trainingMemory(d,s,now);expect(m.currentHardSets).toBe(1);expect(m.muscles.quads.setsToday).toBe(1);
  expect(m.workouts).toBe(0);expect(m.exercises['body-squat'].localReasons).toEqual({setup:1});
  expect(m.exercises['body-squat'].visits).toBe(0);
 });
 it('does not infer duration from an app left open overnight',()=>{
  const d=setup(),s=newSession(d,30,'full',[],[],now);const old=workout('body-squat',now-DAY);old.startedAt-=10*3600000;
  d.history=[old];expect(trainingMemory(d,s,now).usualMinutes).toBeNull();
 });
 it('records only accepted reveals, once, survives reload and skips without counting a completion',()=>{
  let d=setup();d.session=newSession(d,30,'full',[],[],now);
  const result={current:{exerciseId:'body-squat',sets:[],plannedSets:2},engine:'rules' as const};
  d=acceptSelection(d,d.session.id,result,now);d=acceptSelection(d,d.session!.id,result,now);
  expect(d.recommendations).toHaveLength(1);
  d=applyFeedback(d,'today',[],[],now+1);d=dataSchema.parse(JSON.parse(JSON.stringify(d)));
  const m=trainingMemory(d,d.session!,now+2);expect(m.exercises['body-squat'].shown).toBe(1);expect(m.exercises['body-squat'].visits).toBe(0);
  expect(dataSchema.parse(initialData).recommendations).toBeUndefined();
 });
 it('uses declining performance as a soft signal, not a new hard exclusion',()=>{
  const d=setup();d.selectedLocationId='home';const s=newSession(d,30,'full',[],[],now),ex=exerciseById['db-curl'];
  d.history=[3,2,1].map(n=>workout(ex.id,now-n*DAY,n===1?6:10,5));
  expect(historyWeight(ex,trainingMemory(d,s,now),'home',now)).toBe(.7);
 });
});
describe('real-tokenizer coaching context',()=>{
 it('preserves every candidate history and fits complete facts for a long history',()=>{
  const d=setup();d.selectedLocationId='home';const s=newSession(d,30,'full',[],[],now);
  const candidates=exercises.filter(e=>e.sourceId).sort((a,b)=>b.name.length-a.name.length).slice(0,6);
  d.history=Array.from({length:200},(_,i)=>workout(candidates[i%6].id,now-(i+1)*DAY));
  const input=buildPersonalizedInput(tok,d,s,candidates,now);
  expect(input.ids.length).toBeLessThanOrEqual(512);expect(input.markers).toHaveLength(6);
  expect(input.stateTokens).toBeLessThanOrEqual(input.stateBudget);expect(input.historyWorkouts).toBe(200);
  candidates.forEach((_,i)=>expect(input.state).toContain(`option${i+1}:`));
  expect(input.state).toContain('History:200');expect(input.state).not.toContain('undefined');
  expect(input.stateTokens).toBe(tok.encode(input.state).length);
 });
 it('changes the actual encoded model input when old history changes',()=>{
  const d=setup(),s=newSession(d,30,'full',[],[],now);const candidates=exercises.slice(0,6);
  const first=buildPersonalizedInput(tok,d,s,candidates,now);
  d.history=[workout(candidates[0].id,now-300*DAY)];
  const second=buildPersonalizedInput(tok,d,s,candidates,now);
  expect(second.ids).not.toEqual(first.ids);expect(second.state).toMatch(/1 (lifetime )?visits/);
 });
 it('keeps current effort and measured performance in candidate context',()=>{
  const d=setup();d.selectedLocationId='home';const s=newSession(d,30,'full',[],[],now), ex=exerciseById['db-curl'];
  d.history=[3,2,1].map(n=>workout(ex.id,now-n*DAY,n===1?6:10,5));
  expect(personalizationContext(d,s,[ex],now).candidateFacts[0].short).toContain('fewer reps');
  expect(buildPersonalizedInput(tok,d,s,[ex,exerciseById['body-squat']],now).state).toContain('fewer reps');
 });
});

it('fits dense context across all intents and catalog candidate groups without partial facts',()=>{
 const d=setup();d.selectedLocationId='home';
 const s=newSession(d,60,'custom',['chest','back','shoulders','glutes','quads','hamstrings','core'],['calves','forearms','hips'],now-120000);
 d.history=Array.from({length:200},(_,i)=>workout(exercises[i%exercises.length].id,now-(i+1)*DAY,i%2?8:12));
 d.feedback=Array.from({length:100},(_,i)=>({exerciseId:exercises[i%20].id,reason:'today' as const,locationId:'home',at:now-i*DAY}));
 for(const intent of ['auto','easy','challenge','familiar','surprise'] as const) {
  s.intent=intent;
  for(let i=0;i<exercises.length;i+=6) {
   const candidates=exercises.slice(i,i+6);
   const input=buildPersonalizedInput(tok,d,s,candidates,now);
   expect(input.ids.length).toBeLessThanOrEqual(512);
   expect(input.markers).toHaveLength(candidates.length);
   expect(input.stateTokens).toBeLessThanOrEqual(input.stateBudget);
   for(let n=1;n<=candidates.length;n++)expect(input.state).toContain(`option${n}:`);
  }
 }
});
