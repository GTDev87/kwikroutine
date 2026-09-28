import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { EQUIPMENT, Equipment, initialData, AppData } from '../src/domain/types';
import { eligible, newSession, prescription } from '../src/domain/engine';
import { exercises, exerciseById } from '../src/data/exercises';
import { dataSchema } from '../src/state/schema';
const newEquipment: Equipment[]=['air-bike','battle-ropes','plyo-box','treadmill','elliptical','jump-rope','slam-ball','rower','sled','stair-climber','stationary-bike'];
const now=1800000000000;
function setup():AppData {const d=structuredClone(initialData);d.profile={level:'advanced',routine:'full',weeklyGoal:3};return d;}
describe('expanded equipment',()=>{
  it('each addition has local licensed imagery and a usable matching exercise',()=>{
    const manifest=JSON.parse(readFileSync('assets/equipment/manifest.json','utf8'));
    expect(manifest.license).toBe('RepDB Free Tier v1.0');
    for(const id of newEquipment){
      expect(EQUIPMENT).toContain(id);
      const asset=manifest.assets.find((a:{equipment:string})=>a.equipment===id);
      expect(asset,id).toBeTruthy();expect(existsSync(asset.file)).toBe(true);
      const d=setup();d.locations[0].equipment=[id];
      const allowed=eligible(d,newSession(d,30,'full',[],[],now),now);
      expect(allowed.some(e=>e.equipment.includes(id)),id).toBe(true);
      d.locations[0].equipment=[];
      expect(eligible(d,newSession(d,30,'full',[],[],now),now).some(e=>e.equipment.includes(id)),id).toBe(false);
    }
  });
  it('preserves the selected equipment through storage without granting it to other places',()=>{
    const d=setup();d.locations[0].equipment=[...newEquipment];
    const parsed=dataSchema.parse(JSON.parse(JSON.stringify(d)));
    expect(parsed.locations[0].equipment).toEqual(newEquipment);
    expect(parsed.locations[1].equipment).toEqual(initialData.locations[1].equipment);
    expect(dataSchema.parse(initialData).locations).toEqual(initialData.locations);
  });
  it('uses timed sets for conditioning and keeps it to one exercise per session',()=>{
    const d=setup();d.locations[0].equipment=[...newEquipment];
    const session=newSession(d,30,'full',[],[],now);
    const rower=exerciseById['repdb-rowing-machine'];
    expect(rower.seconds).toBe(60);expect(prescription(rower,d).sets).toBe(1);
    session.completed=[{exerciseId:rower.id,plannedSets:1,sets:[{reps:60,weight:0,effort:'right',at:now}]}];
    const allowed=eligible(d,session,now);
    expect(allowed.some(e=>e.conditioning)).toBe(false);
    expect(allowed.length).toBeGreaterThan(0);
  });
  it('respects soreness and technique level for the new movements',()=>{
    const d=setup();d.profile!.level='beginner';d.locations[0].equipment=[...newEquipment];
    let ids=eligible(d,newSession(d,30,'full',[],[],now),now).map(e=>e.id);
    expect(ids).not.toContain('repdb-box-jump');expect(ids).not.toContain('repdb-medicine-ball-slam');
    d.profile!.level='advanced';ids=eligible(d,newSession(d,30,'full',[],['shoulders'],now),now).map(e=>e.id);
    expect(ids).not.toContain('repdb-air-bike');expect(ids).not.toContain('repdb-medicine-ball-slam');
    expect(exercises.length).toBeGreaterThan(457);
  });
});
