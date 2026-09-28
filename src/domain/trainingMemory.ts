import { exerciseById } from '../data/exercises';
import { AppData, Exercise, Muscle, MUSCLES, Performed, Session, SetLog } from './types';

const DAY = 86400000;
const mean = (values: number[]) => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
const median = (values: number[]) => {
  const xs = values.slice().sort((a,b)=>a-b), i = Math.floor(xs.length/2);
  return xs.length ? (xs.length%2 ? xs[i] : (xs[i-1]+xs[i])/2) : null;
};
const rate = (n: number, total: number) => total ? n/total : null;
const validSets = (item: Performed, now: number) => item.sets.filter(s =>
  Number.isFinite(s.at) && s.at <= now && Number.isFinite(s.reps) && s.reps > 0 &&
  Number.isFinite(s.weight) && s.weight >= 0);
export type Exposure = { at: number; locationId: string; sets: SetLog[]; plannedSets: number };
export type MuscleMemory = { lastAt: number | null; sets7: number; sets28: number; secondarySets7: number; setsToday: number; hardSets48h: number };
export type ExerciseMemory = {
  visits: number; sets: number; lastAt: number | null; recent: Exposure[];
  completedVisits: number; hardSets: number; easySets: number;
  skips: number; localSkips: number; localReasons: Record<string, number>;
  localRecentReasons: Record<string, number>;
  shown: number; localShown: number;
};
export interface TrainingMemory {
  workouts: number; workouts7: number; workouts28: number; trainingDays7: number;
  lastWorkoutAt: number | null; lastFocus: string | null; totalSets: number;
  recentHardRate: number | null; completionRate: number | null;
  usualMinutes: number | null; usualMinutesSamples: number; sameWeekdayMinutes: number | null;
  localWorkouts: number; localMinutes: number | null; currentSets: number; currentHardSets: number;
  currentPatterns: Record<string, number>; localSkipReasons: Record<string, number>;
  muscles: Record<Muscle, MuscleMemory>; exercises: Record<string, ExerciseMemory>;
}
function blankExercise(): ExerciseMemory {
  return {visits:0,sets:0,lastAt:null,recent:[],completedVisits:0,hardSets:0,easySets:0,
    skips:0,localSkips:0,localReasons:{},localRecentReasons:{},shown:0,localShown:0};
}
const increment = (counts: Record<string,number>, key: string, n=1) => { counts[key]=(counts[key]??0)+n; };

/** All saved sessions contribute; only the small comparison window per exercise is bounded.
 * Missing measurements stay unknown. Timed sets are never interpreted as repetitions or load.
 */
export function trainingMemory(data: AppData, current: Session, now = Date.now()): TrainingMemory {
  const muscles = Object.fromEntries(MUSCLES.map(m=>[m,{lastAt:null,sets7:0,sets28:0,secondarySets7:0,setsToday:0,hardSets48h:0}])) as Record<Muscle,MuscleMemory>;
  const memory: TrainingMemory = {workouts:0,workouts7:0,workouts28:0,trainingDays7:0,lastWorkoutAt:null,lastFocus:null,totalSets:0,
    recentHardRate:null,completionRate:null,usualMinutes:null,usualMinutesSamples:0,sameWeekdayMinutes:null,
    localWorkouts:0,localMinutes:null,currentSets:0,currentHardSets:0,currentPatterns:{},localSkipReasons:{},muscles,exercises:{}};
  const durations:number[]=[], localDurations:number[]=[], weekdayDurations:number[]=[];
  const days = new Set<string>(); let planned=0, completed=0, recentSets=0, recentHard=0;
  const unique = new Map(data.history.filter(s=>s.id!==current.id && s.startedAt<=now).map(s=>[s.id,s]));
  for (const session of unique.values()) {
    const entries = session.completed.map(item=>({item,sets:validSets(item,now)})).filter(p=>p.sets.length);
    if (!entries.length) continue;
    const lastAt = Math.max(...entries.flatMap(p=>p.sets.map(s=>s.at)));
    memory.workouts++;
    if (memory.lastWorkoutAt===null || lastAt>memory.lastWorkoutAt) { memory.lastWorkoutAt=lastAt;memory.lastFocus=session.focus; }
    if (lastAt>=now-7*DAY) { memory.workouts7++;days.add(new Date(lastAt).toDateString()); }
    if (lastAt>=now-28*DAY) memory.workouts28++;
    const local=session.locationId===current.locationId;
    if(local) memory.localWorkouts++;
    // Wall-clock durations may include an app left open. Exclude implausible spans.
    const duration=session.endedAt ? (session.endedAt-session.startedAt)/60000 : null;
    if(duration!==null && duration>=2 && duration<=Math.max(90,session.minutes*2)) {
      durations.push(duration);if(local)localDurations.push(duration);
      if(new Date(session.startedAt).getDay()===new Date(now).getDay())weekdayDurations.push(duration);
    }
    for(const {item,sets} of entries) {
      const ex=exerciseById[item.exerciseId];
      const stats=memory.exercises[item.exerciseId]??=blankExercise();
      const at=Math.max(...sets.map(s=>s.at));
      stats.visits++; stats.sets+=sets.length;stats.lastAt=Math.max(stats.lastAt??0,at);
      stats.completedVisits+=Number(sets.length>=item.plannedSets);
      stats.hardSets+=sets.filter(s=>s.effort==='hard').length;stats.easySets+=sets.filter(s=>s.effort==='easy').length;
      stats.recent.push({at,locationId:session.locationId,sets,plannedSets:item.plannedSets});
      // Retain enough local comparisons even if the user frequently changes locations.
      stats.recent.sort((a,b)=>b.at-a.at);
      stats.recent=stats.recent.filter((v,i,all)=>all.slice(0,i).filter(p=>p.locationId===v.locationId).length<6);
      memory.totalSets+=sets.length;planned+=item.plannedSets;completed+=Math.min(item.plannedSets,sets.length);
      for(const set of sets) {
        if(set.at>=now-7*DAY){recentSets++;recentHard+=Number(set.effort==='hard');}
        if(!ex)continue;
        for(const m of ex.primary) {
          const stat=muscles[m];stat.lastAt=Math.max(stat.lastAt??0,set.at);
          if(set.at>=now-7*DAY)stat.sets7++;
          if(set.at>=now-28*DAY)stat.sets28++;
          if(set.at>=now-2*DAY && set.effort==='hard')stat.hardSets48h++;
        }
        if(set.at>=now-7*DAY) for(const m of ex.secondary) if(!ex.primary.includes(m))muscles[m].secondarySets7++;
      }
    }
  }
  for(const item of [...current.completed,...(current.current?[current.current]:[])]) {
    const sets=validSets(item,now), ex=exerciseById[item.exerciseId];
    memory.currentSets+=sets.length;memory.currentHardSets+=sets.filter(s=>s.effort==='hard').length;
    if(ex && sets.length) {increment(memory.currentPatterns,ex.pattern,sets.length);for(const m of ex.primary)muscles[m].setsToday+=sets.length;}
  }
  for(const f of data.feedback.filter(f=>f.at<=now)) {
    const stat=memory.exercises[f.exerciseId]??=blankExercise();stat.skips++;
    if(f.locationId===current.locationId) {
      stat.localSkips++;increment(stat.localReasons,f.reason);
      if(f.at>=now-28*DAY){increment(memory.localSkipReasons,f.reason);increment(stat.localRecentReasons,f.reason);}
    }
  }
  for(const event of data.recommendations??[]) if(event.at<=now) {
    const stat=memory.exercises[event.exerciseId]??=blankExercise();stat.shown++;
    if(event.locationId===current.locationId)stat.localShown++;
  }
  memory.trainingDays7=days.size;memory.recentHardRate=rate(recentHard,recentSets);memory.completionRate=rate(completed,planned);
  memory.usualMinutes=median(durations);memory.usualMinutesSamples=durations.length;
  memory.localMinutes=median(localDurations);memory.sameWeekdayMinutes=weekdayDurations.length>=3?median(weekdayDurations):null;
  return memory;
}

/** Compare the same movement, location, and load; do not claim strength gains from incomparable logs. */
export function performanceTrend(ex: Exercise, memory: TrainingMemory, locationId: string, now: number) {
  const visits=memory.exercises[ex.id]?.recent.filter(v=>v.locationId===locationId && v.at>=now-42*DAY)??[];
  if(visits.length<3)return 'unknown';
  const latest=visits[0], previous=visits.slice(1,3);
  const load=latest.sets[0].weight;
  if([...latest.sets,...previous.flatMap(v=>v.sets)].some(s=>s.weight!==load))return 'changed load';
  const current=mean(latest.sets.map(s=>s.reps))!;
  const before=mean(previous.flatMap(v=>v.sets.map(s=>s.reps)))!;
  if(!before)return 'unknown';
  const ratio=current/before;
  return ratio>1.1 ? (ex.seconds?'longer holds':'more reps') : ratio<.9 ? (ex.seconds?'shorter holds':'fewer reps') : 'steady';
}
export const daysSince = (at: number | null, now: number) => at===null ? null : Math.max(0,Math.floor((now-at)/DAY));

/** Soft shortlist preference, never a claim of measured recovery or a relaxation of eligibility. */
export function historyWeight(ex: Exercise, memory: TrainingMemory, locationId: string, now: number) {
  let weight=1;
  const stats=memory.exercises[ex.id];
  const trend=performanceTrend(ex,memory,locationId,now);
  if(trend==='fewer reps'||trend==='shorter holds')weight*=.7;
  const hard=ex.primary.reduce((n,m)=>n+memory.muscles[m].hardSets48h,0);
  if(hard)weight*=1/(1+hard*.15);
  // Only preference-like skips persist as a soft signal. Equipment and soreness are not dislikes.
  const preferenceSkips=['today','repetitive','setup'].reduce((n,r)=>n+(stats?.localRecentReasons[r]??0),0);
  if(preferenceSkips)weight*=Math.max(.4,1/(1+preferenceSkips*.15));
  return weight;
}
