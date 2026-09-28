import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { exercises, exerciseById } from '../src/data/exercises';
import { AppData, EQUIPMENT, MUSCLES, initialData } from '../src/domain/types';
import { applyFeedback, eligible, newSession } from '../src/domain/engine';
import { chooseStyle, dailyIntent, personalizationContext, preferenceWeight } from '../src/domain/personalization';
import { dayKey } from '../src/domain/today';
import { dataSchema } from '../src/state/schema';
import { encodeWithData, parseTokenizerJson, TokenizerLike } from '../src/vendor/laya/tokenizer';
import { buildSequence } from '../src/vendor/laya/common';
const now = 1800000000000;
function setup(): AppData {
  const data = structuredClone(initialData);
  data.profile = {level:'beginner', routine:'full', weeklyGoal:3};
  return data;
}
describe('daily intent and implicit session styles', () => {
  it('needs no check-in and limits intent to the current day', () => {
    const d = setup();
    expect(dailyIntent(d,now)).toBe('auto');
    expect(newSession(d,30,'full',[],[],now).style).toBe('quiet');
    d.checkIn = {day:dayKey(now),sore:[],pain:false,intent:'surprise'};
    expect(newSession(d,30,'full',[],[],now).style).toBe('discovery');
    expect(dailyIntent(d,now+86400000)).toBe('auto');
  });
  it('loads old saves and preserves new intent, styles, and feedback', () => {
    const d=setup();d.session=newSession(d,30,'full',[],[],now);
    delete d.session.intent; delete d.session.style;
    expect(dataSchema.parse(d).session).toBeTruthy();
    d.checkIn={day:dayKey(now),sore:[],pain:false,intent:'easy'};
    d.session=newSession(d,30,'full',[],[],now);
    d.session.current={exerciseId:'plank',sets:[],plannedSets:2};
    const next=applyFeedback(d,'floor',[],[],now+1);
    expect(dataSchema.parse(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });
  it('generalizes floor feedback to other floor exercises only at that place', () => {
    const d=setup();d.session=newSession(d,30,'full',[],[],now);
    d.session.current={exerciseId:'plank',sets:[],plannedSets:2};
    const next=applyFeedback(d,'floor',[],[],now+1);
    const floor=exerciseById['dead-bug'];const standing=exerciseById['body-squat'];
    expect(preferenceWeight(floor,next,next.session!)).toBeLessThan(preferenceWeight(floor,d,d.session!));
    expect(preferenceWeight(standing,next,next.session!)).toBe(preferenceWeight(standing,d,d.session!));
    const other={...next.session!,locationId:'home'};
    expect(preferenceWeight(floor,next,other)).toBe(preferenceWeight(floor,d,other));
    expect(next.disliked).not.toContain('plank');
    expect(eligible(next,next.session!,now+2).map(e=>e.id)).not.toContain('dead-bug');
  });
  it('reduces setup and favors practiced movements without changing eligibility', () => {
    const d=setup();d.feedback=[{exerciseId:'barbell-squat',reason:'setup',locationId:'home',at:now}];
    expect(chooseStyle(d,'home','auto')).toBe('minimal');
    d.selectedLocationId='home';d.locations[1].equipment=[...EQUIPMENT];
    d.checkIn={day:dayKey(now),sore:[],pain:false,intent:'challenge'};
    const session=newSession(d,30,'full',[],['shoulders'],now);
    expect(eligible(d,session,now).every(e=>e.level==='beginner' && ![...e.primary,...e.secondary].includes('shoulders'))).toBe(true);
    const history={...session,completed:[{exerciseId:'body-squat',plannedSets:2,sets:[{reps:10,weight:0,effort:'right' as const,at:now}]}]};
    d.history=[history];
    expect(preferenceWeight(exerciseById['body-squat'],d,{...session,style:'familiar'})).toBeGreaterThan(preferenceWeight(exerciseById['wall-sit'],d,{...session,style:'familiar'}));
  });
});
describe('expanded offline catalog', () => {
  it('has over 300 distinct exercises with valid muscle and equipment mappings', () => {
    expect(exercises.length).toBeGreaterThan(300);
    expect(new Set(exercises.map(e=>e.id)).size).toBe(exercises.length);
    for(const ex of exercises) {
      expect(ex.primary.length,ex.id).toBeGreaterThan(0);
      expect(ex.steps.length,ex.id).toBeGreaterThan(1);
      for(const m of [...ex.primary,...ex.secondary]) expect(MUSCLES,ex.id).toContain(m);
      for(const e of ex.equipment) expect(EQUIPMENT,ex.id).toContain(e);
      expect(ex.steps.join(' '),ex.id).not.toContain('undefined');
    }
  });
  it('requires the actual machine and every additional piece of equipment', () => {
    const d=setup();d.profile!.level='advanced';d.locations[0].equipment=['cable'];
    let session=newSession(d,60,'full',[],[],now);
    let ids=eligible(d,session,now).map(e=>e.id);
    expect(ids).not.toContain('repdb-smith-machine-squat');
    expect(ids).not.toContain('lat-pulldown');
    expect(ids).not.toContain('repdb-incline-db-press');
    d.locations[0].equipment=['smith-machine','dumbbells','adjustable-bench'];
    session=newSession(d,60,'full',[],[],now);ids=eligible(d,session,now).map(e=>e.id);
    expect(ids).toContain('repdb-smith-machine-squat');
    expect(ids).toContain('repdb-incline-db-press');
    session.unavailableEquipment=['smith-machine'];
    expect(eligible(d,session,now).map(e=>e.id)).not.toContain('repdb-smith-machine-squat');
  });
  it('bundles every referenced image locally with license and provenance', () => {
    const code=readFileSync('src/data/exerciseImages.ts','utf8');
    const refs=[...code.matchAll(/require\("\.\.\/\.\.\/(.*?)"\)/g)].map(m=>m[1]);
    expect(refs.length).toBeGreaterThan(600);
    for(const file of refs) expect(existsSync(file),file).toBe(true);
    const manifest=JSON.parse(readFileSync('assets/exercises/manifest.json','utf8'));
    expect(manifest.license).toBe('RepDB Free Tier v1.0');
    expect(existsSync('assets/exercises/LICENSE-DATA.md')).toBe(true);
    for(const ex of exercises.filter(e=>e.sourceId)) expect(code).toContain(`"${ex.sourceId}": [`);
  });
  it('keeps six personalized choices inside the real Laya token budget', () => {
    const parsed=parseTokenizerJson(JSON.parse(readFileSync('assets/models/tokenizer.layajson','utf8')))!;
    const tok:TokenizerLike={clsId:parsed.ids.cls,sepId:parsed.ids.sep,maskId:parsed.ids.mask,padId:parsed.ids.pad,maskToken:parsed.maskToken,encode:t=>encodeWithData(parsed,t)};
    const d=setup();const session=newSession(d,30,'full',[],[],now);session.intent='easy';
    const candidates=exercises.filter(e=>e.sourceId).sort((a,b)=>b.name.length-a.name.length).slice(0,6);
    const context=personalizationContext(d,session,candidates);
    const {ids,markers}=buildSequence(tok,context.state,{t:'choice',ins:'Which exercise best fits the user next?',crit:context.criteria},512,192);
    expect(markers.length).toBe(6);expect(ids.length).toBeLessThanOrEqual(512);
    for (const [i, criterion] of Object.values(context.criteria).entries()) expect(criterion).toContain(candidates[i].name);
    expect(context.state).toContain('Intent: easy');
  });
});
