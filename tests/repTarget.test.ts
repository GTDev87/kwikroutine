import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialData, Performed } from '../src/domain/types';
import { applyRepTarget, DAY, logSet, newSession } from '../src/domain/engine';
import { exerciseById } from '../src/data/exercises';
import { fewerReps, repOptions, resolveReps } from '../src/domain/repTarget';
import { dataSchema } from '../src/state/schema';
import { toKg } from '../src/domain/weightUnits';
vi.mock('../src/services/laya', () => ({scoreRepsWithLaya: vi.fn()}));
import { scoreRepsWithLaya } from '../src/services/laya';
import { chooseReps } from '../src/services/repSelection';

const now = Date.now();
const ex = exerciseById['db-curl'];
function setup() {
  const d = structuredClone(initialData);
  d.profile = {level:'beginner',routine:'full',weeklyGoal:3,weightUnit:'lb'};
  d.session = {...newSession(d,30,'full',[],[],now), intent:'auto'};
  const current: Performed = {exerciseId:ex.id,plannedSets:3,sets:[]};
  d.session.current = current;
  return {d, current};
}
beforeEach(()=>{vi.mocked(scoreRepsWithLaya).mockReset();});
describe('rep targets',()=>{
  it('never offers more than the plan, and offers about 20% fewer',()=>{
    expect(fewerReps(10)).toBe(8);expect(fewerReps(5)).toBe(4);expect(fewerReps(2)).toBe(1);expect(fewerReps(1)).toBeNull();
    const {d,current}=setup();
    const o=repOptions(d,d.session!,ex,current,now)!;
    expect(o.target).toBe(ex.reps);
    for(const p of [null,{same:.9,fewer:.1},{same:.1,fewer:.9}])
      expect(resolveReps({...o,fewer:fewerReps(o.target)},p).suggested).toBeLessThanOrEqual(ex.reps);
  });
  it('keeps the plan without a reason to ease off',()=>{
    const {d,current}=setup();
    expect(repOptions(d,d.session!,ex,current,now)!.fewer).toBeNull();
    const easy={...current,sets:[{reps:ex.reps,weight:toKg(20,'lb'),effort:'right' as const,at:now-60000}]};
    expect(repOptions(d,d.session!,ex,easy,now)!.fewer).toBeNull();
  });
  it.each(['hard-set','short-set','heavier','easy-day','light-sore','hard-last-visit'])('offers fewer reps after %s',kind=>{
    const {d}=setup();let {current}=setup();
    const set={reps:ex.reps,weight:toKg(20,'lb'),effort:'right' as const,at:now-60000};
    if(kind==='hard-set')current={...current,sets:[{...set,effort:'hard'}]};
    if(kind==='short-set')current={...current,sets:[{...set,reps:ex.reps-3}]};
    if(kind==='heavier')current={...current,load:{previous:toKg(20,'lb'),suggested:toKg(22.5,'lb'),source:'laya'}};
    if(kind==='easy-day')d.session!.intent='easy';
    if(kind==='light-sore'){d.session!.sore=[ex.primary[0]];d.session!.soreLevels={[ex.primary[0]]:1};}
    if(kind==='hard-last-visit')d.history=[{...newSession(d,30,'full',[],[],now-3*DAY),id:'old',endedAt:now-3*DAY,
      completed:[{exerciseId:ex.id,plannedSets:2,sets:[{...set,effort:'hard',at:now-3*DAY}]}]}];
    const o=repOptions(d,d.session!,ex,current,now)!;
    expect(o.fewer).toBe(fewerReps(ex.reps));
    expect(o.state.length).toBeGreaterThan(0);
  });
  it('excludes timed holds and conditioning',()=>{
    const {d,current}=setup();
    const hold=Object.values(exerciseById).find(e=>e.seconds)!;
    expect(repOptions(d,d.session!,hold,current,now)).toBeNull();
  });
  it('lowers reps only when Laya clearly prefers it with valid scores',()=>{
    const o={target:10,fewer:8,state:''};
    expect(resolveReps(o,{same:.3,fewer:.7})).toEqual({target:10,suggested:8,source:'laya'});
    expect(resolveReps(o,{same:.7,fewer:.3})).toEqual({target:10,suggested:10,source:'laya'});
    for(const p of [null,{same:.5,fewer:.5},{same:NaN,fewer:.9},{same:-1,fewer:2},{same:.1,fewer:Infinity}])
      expect(resolveReps(o,p).suggested).toBe(10);
    expect(resolveReps({...o,fewer:null},{same:0,fewer:1})).toEqual({target:10,suggested:10,source:'plan'});
  });
  it('asks Laya only when fewer is an option, and survives errors',async()=>{
    const {d,current}=setup();
    expect((await chooseReps(d,d.session!,ex,current))?.suggested).toBe(ex.reps);
    expect(scoreRepsWithLaya).not.toHaveBeenCalled();
    const hard={...current,sets:[{reps:ex.reps,weight:0,effort:'hard' as const,at:now-60000}]};
    vi.mocked(scoreRepsWithLaya).mockResolvedValue({same:.2,fewer:.8});
    expect(await chooseReps(d,d.session!,ex,hard)).toEqual({target:ex.reps,suggested:fewerReps(ex.reps),source:'laya'});
    vi.mocked(scoreRepsWithLaya).mockRejectedValue(new Error('runtime failed'));
    expect((await chooseReps(d,d.session!,ex,hard))?.suggested).toBe(ex.reps);
  });
  it('stores a suggestion only for the same exercise and set, and logs the actual reps',()=>{
    let {d}=setup();
    d=logSet(d,{reps:ex.reps+2,weight:0,effort:'hard',at:now});
    expect(d.session!.current!.sets[0].reps).toBe(ex.reps+2);
    const t={target:ex.reps,suggested:8,source:'laya' as const};
    expect(applyRepTarget(d,ex.id,0,t)).toBe(d);
    expect(applyRepTarget(d,'other',1,t)).toBe(d);
    d=applyRepTarget(d,ex.id,1,t);
    expect(dataSchema.parse(JSON.parse(JSON.stringify(d))).session!.current!.repTarget).toEqual(t);
  });
});
