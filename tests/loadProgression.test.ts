import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialData } from '../src/domain/types';
import { newSession, DAY, logSet } from '../src/domain/engine';
import { exerciseById, exercises } from '../src/data/exercises';
import { loadOptions, resolveLoad, supportsLoad } from '../src/domain/loadProgression';
import { displayWeight, toKg, weightUnit } from '../src/domain/weightUnits';
import { dataSchema } from '../src/state/schema';
vi.mock('../src/services/laya', () => ({scoreLoadWithLaya: vi.fn()}));
import { scoreLoadWithLaya } from '../src/services/laya';
import { chooseLoad } from '../src/services/weightSelection';
const now = Date.now();
const ex = exerciseById['db-curl'];
function setup() {
  const d = structuredClone(initialData);
  d.profile = {level:'beginner',routine:'full',weeklyGoal:3,weightUnit:'lb'};
  d.session = newSession(d,30,'full',[],[],now);
  d.history = [3,6].map(n => ({...newSession(d,30,'full',[],[],now-n*DAY-20*60000),id:`visit-${n}`,endedAt:now-n*DAY,
    completed:[{exerciseId:ex.id,plannedSets:2,sets:[0,1].map(i => ({reps:ex.reps+2,weight:toKg(50,'lb'),effort:'easy' as const,at:now-n*DAY-i*60000}))}]}));
  return d;
}
beforeEach(()=>{vi.mocked(scoreLoadWithLaya).mockReset();});
describe('load progression',()=>{
  it('offers a bounded pounds increment after two complete easy comparable visits',()=>{
    const d=setup(), o=loadOptions(d,d.session!,ex,now)!;
    expect(displayWeight(o.increase!,'lb')).toBe('52.5');
    expect(resolveLoad(o,{hold:.1,increase:.9})).toEqual({previous:toKg(50,'lb'),suggested:toKg(52.5,'lb'),source:'laya'});
  });
  it.each(['hard','right','short-reps','incomplete','different-load','zero','other-place','old','one-visit','same-day','easy-today','sore','hard-today'])(
    'does not increase for %s', kind=>{
      const d=setup(), latest=d.history[0].completed[0];
      if(kind==='hard'||kind==='right')latest.sets[0].effort=kind;
      if(kind==='short-reps')latest.sets[0].reps=ex.reps;
      if(kind==='incomplete')latest.sets.pop();
      if(kind==='different-load')latest.sets[0].weight=20;
      if(kind==='zero')latest.sets.forEach(s=>s.weight=0);
      if(kind==='other-place')d.history[0].locationId='somewhere-else';
      if(kind==='old')d.history[1].endedAt=now-40*DAY;
      if(kind==='one-visit')d.history.pop();
      if(kind==='same-day')d.history[1]={...d.history[0],id:'second'};
      if(kind==='easy-today')d.session!.intent='easy';
      if(kind==='sore')d.session!.sore=[ex.primary[0]];
      if(kind==='hard-today')d.session!.completed=[{...latest,sets:[{...latest.sets[0],effort:'hard',at:now}]}];
      expect(loadOptions(d,d.session!,ex,now)?.increase ?? null).toBeNull();
    });
  it('does not invent initial weights, count duplicates, or exceed the percentage cap',()=>{
    const d=setup();d.history=[];expect(loadOptions(d,d.session!,ex,now)).toBeNull();
    const v=setup();v.history=[v.history[0],v.history[0]];expect(loadOptions(v,v.session!,ex,now)?.increase).toBeNull();
    const small=setup();small.history.forEach(s=>s.completed[0].sets.forEach(set=>set.weight=toKg(10,'lb')));
    expect(loadOptions(small,small.session!,ex,now)?.increase).toBeNull();
  });
  it('excludes bodyweight, assistance machines, timed exercises, and conditioning',()=>{
    for(const e of exercises.filter(e=>e.conditioning||e.seconds||e.equipment.some(g=>g==='assisted-dip'||g==='assisted-pullup')))
      expect(supportsLoad(e),e.name).toBe(false);
    expect(supportsLoad(exerciseById['body-squat'])).toBe(false);
  });
  it('holds when the model is unavailable, uncertain, or returns malformed scores',()=>{
    const d=setup(),o=loadOptions(d,d.session!,ex,now)!;
    for(const p of [null,{hold:.5,increase:.5},{hold:NaN,increase:.9},{hold:-1,increase:2},{hold:.1,increase:Infinity}])
      expect(resolveLoad(o,p).suggested).toBe(o.previous);
    expect(resolveLoad({...o,increase:null},{hold:0,increase:1}).suggested).toBe(o.previous);
  });
  it('runs actual load decision service only when an increase is permitted, and survives errors',async()=>{
    const d=setup();vi.mocked(scoreLoadWithLaya).mockResolvedValue({hold:.1,increase:.9});
    expect((await chooseLoad(d,d.session!,ex))?.source).toBe('laya');expect(scoreLoadWithLaya).toHaveBeenCalledOnce();
    vi.mocked(scoreLoadWithLaya).mockRejectedValue(new Error('offline runtime failed'));
    expect((await chooseLoad(d,d.session!,ex))?.suggested).toBe(toKg(50,'lb'));
    vi.mocked(scoreLoadWithLaya).mockClear();d.session!.intent='easy';await chooseLoad(d,d.session!,ex);
    expect(scoreLoadWithLaya).not.toHaveBeenCalled();
  });
  it('persists advice and logs the actual edited weight, never the recommendation',()=>{
    let d=setup();d.session!.current={exerciseId:ex.id,plannedSets:2,sets:[],load:{previous:toKg(50,'lb'),suggested:toKg(52.5,'lb'),source:'laya'}};
    d=dataSchema.parse(JSON.parse(JSON.stringify(d)));
    d=logSet(d,{weight:toKg(45,'lb'),reps:10,effort:'right',at:now});
    expect(d.session!.current!.sets[0].weight).toBe(toKg(45,'lb'));
    expect(d.session!.current!.load!.suggested).toBe(toKg(52.5,'lb'));
  });
});
it('defaults to pounds, converts legacy kg without rewriting history, and preserves preferred units',()=>{
  const d=setup();delete d.profile!.weightUnit;expect(weightUnit(d.profile)).toBe('lb');
  expect(displayWeight(20,'lb')).toBe('44.09');expect(displayWeight(toKg(52.5,'lb'),'lb')).toBe('52.5');
  expect(toKg(20,'kg')).toBe(20);d.profile!.weightUnit='kg';
  expect(dataSchema.parse(d).profile!.weightUnit).toBe('kg');
});
