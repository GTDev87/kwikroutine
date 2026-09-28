/* Synthetic fixtures; never reads or changes on-device workout history. */
const fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {initialData}=require('../src/domain/types.ts'),{newSession,DAY}=require('../src/domain/engine.ts');
const {exerciseById}=require('../src/data/exercises.ts'),{loadOptions}=require('../src/domain/loadProgression.ts');
const {toKg}=require('../src/domain/weightUnits.ts'),{buildLoadInput}=require('../src/services/loadInput.ts');
const {parseTokenizerJson,encodeWithData}=require('../src/vendor/laya/tokenizer.ts');
const parsed=parseTokenizerJson(JSON.parse(fs.readFileSync('assets/models/tokenizer.layajson','utf8')));
const tok={clsId:parsed.ids.cls,sepId:parsed.ids.sep,maskId:parsed.ids.mask,padId:parsed.ids.pad,maskToken:parsed.maskToken,encode:text=>encodeWithData(parsed,text)};
const now=Date.now(),cases=[];
for(const id of ['db-curl','leg-press','db-row','goblet-squat']) {
 const ex=exerciseById[id];
for(const intent of ['auto','challenge','familiar']){
 const d=structuredClone(initialData);d.profile={level:'intermediate',routine:'full',weeklyGoal:3,weightUnit:'lb'};
 const s=newSession(d,30,'full',[],[],now);s.intent=intent;
 d.history=[3,6].map(n=>({...newSession(d,30,'full',[],[],now-n*DAY-1200000),id:`visit-${n}`,endedAt:now-n*DAY,
  completed:[{exerciseId:ex.id,plannedSets:2,sets:[0,1].map(i=>({reps:ex.reps+2,weight:toKg(50,'lb'),effort:'easy',at:now-n*DAY-i*60000}))}]}));
 const options=loadOptions(d,s,ex,now);if(!options?.increase)throw Error('Fixture did not qualify');
 const input=buildLoadInput(tok,options);if(input.ids.length>512||input.markers.length!==2)throw Error('Invalid model input');
 cases.push({name:`${id}-${intent}`,...input,candidates:['hold','increase']});
}
}
fs.mkdirSync('.expo',{recursive:true});fs.writeFileSync('.expo/load-scenarios.json',JSON.stringify(cases));
console.log(cases.map(c=>({name:c.name,tokens:c.ids.length})));
