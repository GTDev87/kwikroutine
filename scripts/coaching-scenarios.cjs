/* Synthetic scenarios only; never reads the user's on-device history. */
const fs=require('node:fs'), ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {initialData}=require('../src/domain/types.ts');
const {newSession,DAY,baseWeight,eligible}=require('../src/domain/engine.ts');
const {exerciseById}=require('../src/data/exercises.ts');
const {parseTokenizerJson,encodeWithData}=require('../src/vendor/laya/tokenizer.ts');
const {buildPersonalizedInput}=require('../src/services/layaInput.ts');
const {trainingMemory}=require('../src/domain/trainingMemory.ts');
const now=new Date(2026,8,27,18).getTime();
const parsed=parseTokenizerJson(JSON.parse(fs.readFileSync('assets/models/tokenizer.layajson','utf8')));
const tok={clsId:parsed.ids.cls,sepId:parsed.ids.sep,maskId:parsed.ids.mask,padId:parsed.ids.pad,maskToken:parsed.maskToken,encode:text=>encodeWithData(parsed,text)};
const candidates=['body-squat','wall-pushup','standing-hinge','prone-w','dead-bug','calf-raise'].map(id=>exerciseById[id]);
function setup(){const d=structuredClone(initialData);d.profile={level:'beginner',routine:'full',weeklyGoal:3};d.locations[0].equipment=['chair','bands','mat'];d.session=newSession(d,30,'full',[],[],now);return d;}
function performed(id,reps=10,effort='right',at=now){return {exerciseId:id,plannedSets:2,sets:[{reps,weight:0,effort,at},{reps,weight:0,effort,at:at-60000}]};}
const scenarios=[];
function add(name,change){const d=setup();change(d);const input=buildPersonalizedInput(tok,d,d.session,candidates,now);const memory=trainingMemory(d,d.session,now);const allowed=new Set(eligible(d,d.session,now).map(e=>e.id));if(candidates.some(e=>!allowed.has(e.id)))throw Error('Ineligible synthetic candidate');scenarios.push({name,candidates:candidates.map(e=>e.id),baseWeights:candidates.map(e=>baseWeight(e,d,d.session,memory,now)),...input});}
add('new_user',()=>{});
add('legs_already_worked',d=>{d.session.completed=[performed('chair-squat',10,'hard'),performed('seated-calf',12,'hard')];});
add('upper_already_worked',d=>{d.session.completed=[performed('knee-pushup'),performed('seated-band-row')];});
add('repeated_local_squat_rejections',d=>{d.feedback=Array.from({length:8},(_,i)=>({exerciseId:'body-squat',reason:'today',locationId:'bedroom',at:now-i*DAY}));});
add('declining_squat_reps',d=>{d.history=[3,2,1].map(n=>({...newSession(d,30,'full',[],[],now-n*DAY-20*60000),endedAt:now-n*DAY,completed:[performed('body-squat',n===1?5:10,n===1?'hard':'right',now-n*DAY)]}));});
fs.mkdirSync('.expo',{recursive:true});fs.writeFileSync('.expo/coaching-scenarios.json',JSON.stringify(scenarios,null,2));
console.log(scenarios.map(s=>({name:s.name,tokens:s.ids.length,stateTokens:s.stateTokens,omittedFacts:s.omittedFacts})));
