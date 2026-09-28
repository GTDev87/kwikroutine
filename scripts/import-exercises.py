"""Build Kwikroutine's in-app catalog and bundled artwork. Python 3 + Pillow.
Pinned RepDB free tier, never premium samples. No runtime network requests.
Run: python3 scripts/import-exercises.py
"""
import json, re, io, hashlib, subprocess, concurrent.futures
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
REV='9ed9357f09c7566ea0256c57ebd6374ebb8b575e'
BASE=f'https://raw.githubusercontent.com/RepDB/exercise-dataset/{REV}/'
CACHE=ROOT/'.firecrawl/repdb-source.json'
def fetch(path):
    return subprocess.check_output(['curl', '-LfsS', '--retry', '3', '--max-time', '45', BASE+path])
CACHE.parent.mkdir(exist_ok=True)
if not CACHE.exists(): CACHE.write_bytes(fetch('exercises.json'))
source=json.loads(CACHE.read_text())['exercises']
# Specific stations are requirements, never a catch-all "machine" flag.
GEAR={
'dumbbell':'dumbbells','barbell':'barbell','kettlebell':'kettlebells','cable':'cable','pull_up_bar':'pullup-bar','ez_bar':'ez-bar','smith_machine':'smith-machine','loop_band':'loop-bands','resistance_band':'bands','suspension_trainer':'suspension','flat_bench':'bench','stability_ball':'stability-ball','rings':'rings','leg_press':'leg-press','plates':'plates','dip_station':'dip-station','leg_curl':'leg-curl','lat_pulldown_machine':'lat-pulldown','hack_squat':'hack-squat','leg_extension':'leg-extension','standing_calf_raise_machine':'standing-calf-machine','shoulder_press_machine':'shoulder-press','plate_loaded_lateral_raise_machine':'lateral-raise-machine','ab_wheel':'ab-wheel','dip_machine':'assisted-dip','assisted_pullup_machine':'assisted-pullup','chest_press_machine':'chest-press','trap_bar':'trap-bar','hip_abduction_machine':'hip-abduction','hip_adduction_machine':'hip-adduction','back_extension_machine':'back-extension-machine','bicep_curl_machine':'biceps-machine','chest_fly_machine':'pec-deck','preacher_curl_machine':'preacher-machine','ab_crunch_machine':'ab-machine','tricep_extension_machine':'triceps-machine','glute_ham_developer':'nordic-bench','pec_deck':'pec-deck','donkey_calf_raise_machine':'donkey-calf-machine','hip_thrust_machine':'glute-drive','shrug_machine':'shrug-machine','seated_calf_raise_machine':'seated-calf-machine','wrist_roller':'wrist-roller'}
GEAR.update({'air_bike':'air-bike','battle_rope':'battle-ropes','plyo_box':'plyo-box','treadmill':'treadmill','elliptical':'elliptical','jump_rope':'jump-rope','slam_ball':'slam-ball','rower':'rower','sled':'sled','stair_climber':'stair-climber','stationary_bike':'stationary-bike'})
EXTRA = {'air-bike','battle-ropes','box-jump','incline-treadmill-walk','elliptical-trainer','jump-rope','medicine-ball-slam','rowing-machine','sled-row','stair-climber','stationary-bike'}
MUSCLE={
'gluteus_maximus':'glutes','gluteus_medius':'glutes','abductors':'glutes','quadriceps':'quads','pectoralis_major':'chest','latissimus_dorsi':'back','anterior_deltoid':'shoulders','hamstrings':'hamstrings','rectus_abdominis':'core','triceps_brachii':'triceps','erector_spinae':'back','lateral_deltoid':'shoulders','trapezius':'back','biceps_brachii':'biceps','obliques':'core','rhomboids':'back','hip_flexors':'hips','gastrocnemius':'calves','posterior_deltoid':'shoulders','adductors':'inner-thighs','forearm_flexors':'forearms','transverse_abdominis':'core','brachialis':'biceps','soleus':'calves','forearm_extensors':'forearms','brachioradialis':'forearms','quadratus_lumborum':'core','serratus_anterior':'chest','forearms':'forearms','supraspinatus':'shoulders'}
# Preserve installed users' exercise IDs and history; remove their duplicate imports.
ALIASES={
'body-squat':'bodyweight-squat','wall-sit':'wall-sit','reverse-lunge':'bodyweight-reverse-lunge','barbell-squat':'squat','leg-press':'leg-press','glute-bridge':'glute-bridge','bridge-hold':'glute-bridge-hold','standing-hinge':'bodyweight-good-morning','single-bridge':'single-leg-glute-bridge','db-deadlift':'dumbbell-romanian-deadlift','hip-thrust':'dumbbell-hip-thrust','wall-pushup':'wall-push-ups','incline-pushup':'incline-push-ups','knee-pushup':'knee-push-ups','pushup':'push-up','db-floor-press':'dumbbell-floor-press','db-bench-press':'db-bench-press','machine-press':'chest-press-machine','db-shoulder-press':'dumbbell-shoulder-press','barbell-bench':'bench-press','band-pullapart':'band-pull-apart','db-supported-row':'single-arm-db-row','db-row':'bent-over-db-row','cable-row':'seated-cable-row','lat-pulldown':'lat-pulldown','pullup':'pull-up','dead-bug':'dead-bug','bird-dog':'bird-dog','plank':'plank','side-plank':'side-plank','db-curl':'bicep-curl','hammer-curl':'hammer-curl','cable-curl':'cable-curl','tricep-pressdown':'tricep-pushdown','db-kickback':'tricep-kickback','lateral-raise':'lateral-raise','front-raise':'dumbbell-front-raise','calf-raise':'bodyweight-calf-raise','db-calf':'dumbbell-calf-raise','side-leg-raise':'side-lying-hip-abduction','clamshell':'clamshells','leg-curl':'leg-curl','leg-extension':'leg-extension'}
# Omit duplicate aliases and movements outside this strength-session scope.
OMIT={'db-skull-crusher','lying-tricep-extension','overhead-tricep-extension','bodyweight-lateral-raise','bodyweight-overhead-press','high-plank','kettlebell-squat','machine-calf-raise','machine-chest-fly','rings-inverted-row','downward-dog-to-knee-drive','stability-ball-push-up-hands-on-ball','wrist-curl','chin-tuck-hold','isometric-neck-side','jefferson-curl','cheat-curl','human-flag','back-lever','front-lever','planche','rope-climb','sled-row','medicine-ball-slam','donkey-calf-raise','deficit-deadlift','deficit-push-ups','weighted-dips','weighted-pull-up'}
OMIT.update(e['id'] for e in source if any(k in e['id'] for k in ['pose','warrior','pilates','downward-dog','shoulderstand','behind-the-neck']))
byid={e['id']:e for e in source}
def muscle(values): return list(dict.fromkeys(MUSCLE[x] for x in values))
def gear(e):
    id=e['id']; text=' '.join(e['instructions_en']).lower(); equipment=[]
    if e.get('equipment'): equipment.append(GEAR[e['equipment']])
    if 'lat-pulldown' in id or id=='lat-pulldown': equipment=['lat-pulldown']
    if 'seated-cable-row' in id: equipment=['seated-cable-row']
    if id=='seated-leg-curl': equipment=['seated-leg-curl']
    if id=='back-extension': equipment=['roman-chair']
    if 'captains-chair' in id: equipment=['captains-chair']
    if 'preacher' in id and 'machine' not in id: equipment.append('preacher-bench')
    elif re.search(r'\bbench\b',text) or id in ['incline-push-ups','decline-push-up','box-squat','step-ups']:
        equipment.append('decline-bench' if 'decline' in id else 'adjustable-bench' if re.search(r'incline|chest-supported|spider',id) else 'bench')
    if e.get('equipment')=='barbell' and (re.search('squat|bench|overhead-press|ohp|good-morning|rack-pull|inverted-row',id)): equipment.append('rack')
    if 'landmine' in id or id=='t-bar-row': equipment.append('landmine')
    if id=='band-assisted-pull-ups': equipment.append('pullup-bar')
    if id=='negative-pull-ups': equipment.append('bench')
    if 'heel-elevated' in id: equipment.append('plates')
    return list(dict.fromkeys(equipment))
def traits(e,eq):
    id=e['id'];text=' '.join(e['instructions_en']).lower()
    floor=bool(re.search(r'\b(kneel|kneeling|supine|prone|lie|lying)\b',text) and not any(x in eq for x in ['bench','adjustable-bench','decline-bench','leg-curl','pec-deck'])) or ('plank' in id and 'reverse' not in id)
    impact=bool(re.search('clap|jump|slam|snatch|clean|jerk',id))
    return {'floor':floor,'quiet':not impact and not bool(re.search('swing|push-press|thruster|battle-rope|air-bike|rowing-machine|treadmill|sled',id)), 'setup':'involved' if len(eq)>1 or any(x in eq for x in ['barbell','smith-machine','ez-bar','landmine','rings','suspension']) else 'simple'}
def transform(e):
    eq=gear(e); primary=muscle(e['primary_muscles']); secondary=[x for x in muscle(e.get('secondary_muscles',[])) if x not in primary]; id=e['id']
    if id in EXTRA:
        extra_secondary = {'air-bike':['shoulders','biceps','triceps','calves'], 'battle-ropes':['glutes'], 'medicine-ball-slam':['shoulders','triceps','quads'], 'rowing-machine':['core'], 'elliptical-trainer':['shoulders','biceps'], 'incline-treadmill-walk':['hips'], 'jump-rope':['shoulders','core']}
        secondary=list(dict.fromkeys(secondary+[m for m in extra_secondary.get(id,[]) if m not in primary]))
    pattern='core' if primary and all(m in ['core','hips'] for m in primary) else 'squat' if re.search('squat|lunge|leg-press|step-up',id) else 'hinge' if re.search('deadlift|rdl|good-morning|hip-thrust|glute-bridge|glute-drive|swing',id) else 'push' if e['mechanic']=='compound' and e['force_type']=='push' else 'pull' if e['mechanic']=='compound' and e['force_type']=='pull' else 'accessory'
    level=e['difficulty']
    if any(x in eq for x in ['barbell','smith-machine','ez-bar','rings','suspension']) and level=='beginner':level='intermediate'
    if re.search('snatch|clean|jerk|turkish|windmill|overhead-squat',id):level='advanced'
    if id in ['box-jump','medicine-ball-slam']: level='intermediate'
    conditioning = e['category']=='cardio' or id=='sled-row'
    timed=conditioning or e['force_type']=='static' or bool(re.search('hold|plank|carry|walk|hang$|l-sit|v-sit',id))
    return dict(id='repdb-'+id,name=e['name_en'],primary=primary,secondary=secondary,equipment=eq,level=level,pattern=pattern,reps=1 if timed else 5 if id=='box-jump' else 8,**({'seconds':60 if conditioning and id not in ['battle-ropes','jump-rope','sled-row'] else 20} if timed else {}),**({'conditioning':True} if conditioning else {}),unilateral=e.get('is_unilateral',False),rest=90 if level=='advanced' else 60,steps=e['instructions_en'],tip=' '.join(e.get('tips_en',[])[:2]) or 'Move slowly through a comfortable range. Stop if it causes pain.',traits=traits(e,eq),sourceId=id)
selected=[e for e in source if (e['category']=='strength' and e['id'] not in OMIT or e['id'] in EXTRA) and e.get('equipment') in [None,*GEAR]]
records=[transform(e) for e in selected if e['id'] not in ALIASES.values()]
assert len(records)>260, len(records)
# Only import the free artwork actually used in this app.
needed={e['id']:e for e in selected}
needed.update({id:byid[id] for id in ALIASES.values()})
paths=sorted({p for e in needed.values() for p in e['images']['flat'].values()})
out=ROOT/'assets/exercises';out.mkdir(parents=True,exist_ok=True)
def download(path):
    target=out/(Path(path).stem+'.jpg')
    if not target.exists():
        image=Image.open(io.BytesIO(fetch(path))).convert('RGB')
        image.save(target,'JPEG',quality=85,optimize=True)
    return {'source':BASE+path,'file':str(target.relative_to(ROOT)), 'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: assets=list(pool.map(download,paths))
(ROOT/'src/data/importedExercises.json').write_text(json.dumps(records,indent=2)+'\n')
photo={e['id']:[Path(p).stem+'.jpg' for p in e['images']['flat'].values()] for e in needed.values()}
lines=['// Generated by scripts/import-exercises.py. Bundled JPEGs work offline on iOS/Android.', 'export const exerciseImages: Record<string, number[]> = {']
for id,images in sorted(photo.items()): lines.append('  '+json.dumps(id)+': ['+', '.join('require("../../assets/exercises/'+p+'")' for p in images)+'],')
lines+=['};','export const legacyImageIds: Record<string, string> = '+json.dumps(ALIASES,indent=2)+';']
(ROOT/'src/data/exerciseImages.ts').write_text('\n'.join(lines)+'\n')
credit=ROOT/'assets/exercises/LICENSE-DATA.md';credit.write_bytes(fetch('LICENSE-DATA.md'))
(ROOT/'assets/exercises/manifest.json').write_text(json.dumps({'source':'https://github.com/RepDB/exercise-dataset','revision':REV,'license':'RepDB Free Tier v1.0','attribution':'Exercise data by RepDB (repdb.co)','transformation':'Free flat WebP converted to JPEG, quality 85. In-app use only. No generative image processing.','assets':assets},indent=2)+'\n')
print(f'Imported {len(records)} additional exercises and {len(assets)} local pictures.')
