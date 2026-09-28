import { AppData, Exercise, Session } from './types';
import { daysSince, performanceTrend, trainingMemory } from './trainingMemory';
import { exerciseTraits } from './exerciseTraits';

const rounded = (n: number | null) => n===null ? 'unknown' : String(Math.round(n));
const percent = (n: number | null) => n===null ? 'unknown' : `${Math.round(n*100)}%`;
const counts = (values: Record<string,number>) => Object.entries(values).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${k}:${v}`).join(',')||'none';

/** Facts are extracted from all history, then selected for this specific choice.
 * They are not inferred energy, diagnoses, readiness scores or model-generated explanations.
 */
export function personalizationContext(data: AppData, session: Session, candidates: Exercise[], now=Date.now()) {
  const m=trainingMemory(data,session,now);
  const elapsed=Math.max(0,(now-session.startedAt)/60000);
  const essentials=[
    `Experience:${data.profile?.level??'beginner'}. Intent: ${session.intent??'auto'}. Style:${session.style??'balanced'}. Focus:${session.focus==='open'?'open (no preset focus; choose what suits recovery and recent training)':session.focus}. Time left:${Math.max(0,Math.floor(session.minutes-elapsed))}min.`,
    `Sore:${session.sore.join(',')||'none reported'}. ${session.focus==='custom'?'Targets:'+session.targets.join(',')+'. ':''}All options passed equipment, soreness, level and time rules.`,
    `History:${m.workouts} workouts; ${m.workouts7} in 7d; last ${rounded(daysSince(m.lastWorkoutAt,now))}d ago. Recent hard sets:${percent(m.recentHardRate)}. Today:${m.currentSets} sets,${m.currentHardSets} hard.`,
  ];
  const criteria=Object.fromEntries(candidates.map((ex,i)=>[`option${i+1}`,`${ex.name}; ${ex.pattern}`]));
  const candidateFacts=candidates.map((ex,i)=>{
    const stat=m.exercises[ex.id];
    const visits=stat?.visits??0;
    const recent=stat?.recent.find(v=>v.locationId===session.locationId);
    const hard=recent?.sets.filter(s=>s.effort==='hard').length??0;
    const age=daysSince(stat?.lastAt??null,now);
    const trend=performanceTrend(ex,m,session.locationId,now);
    const muscleLoad=Math.max(...ex.primary.map(p=>m.muscles[p].sets7),0);
    const todayLoad=Math.max(...ex.primary.map(p=>m.muscles[p].setsToday),0);
    const skip=stat?.localSkips??0;
    const traits=exerciseTraits(ex);
    const short=`option${i+1}:${visits?`${visits} visits,last ${age}d`:'new'}; ${hard?'last hard':recent?'last not hard':'effort unknown'}; ${trend!=='unknown'?trend+'; ':''}local skips ${skip}; muscle sets7d:${muscleLoad},today:${todayLoad}.`;
    const detail=`option${i+1}:${visits} lifetime visits,${stat?.sets??0} sets; last ${age===null?'never':age+'d'}; local trend:${trend}; last effort:${recent?(hard?'hard':'not hard'):'unknown'}; local skips:${counts(stat?.localReasons??{})}; muscle sets7d:${muscleLoad},today:${todayLoad}; ${traits.setup},${traits.floor?'floor':'upright'},${traits.quiet?'quiet':'dynamic'}.`;
    return {short,detail};
  });
  const relevant=[...new Set(candidates.flatMap(ex=>ex.primary))];
  const muscleFacts=relevant.map(muscle=>{
    const x=m.muscles[muscle];
    return `${muscle}:last ${rounded(daysSince(x.lastAt,now))}d,7d ${x.sets7} primary/${x.secondarySets7} secondary sets,28d ${x.sets28},today ${x.setsToday},hard48h ${x.hardSets48h}.`;
  });
  const extraFacts=[
    `Already trained today (sets):${counts(m.currentPatterns)}. Prefer other patterns. Local skip reasons,28d:${counts(m.localSkipReasons)}.`,
    `Completed planned sets:${percent(m.completionRate)}. Last focus:${m.lastFocus??'unknown'}. Training days7d:${m.trainingDays7}. Workouts28d:${m.workouts28}.`,
    ...muscleFacts,
    `Usual duration:${rounded(m.usualMinutes)}min (${m.usualMinutesSamples} samples); at this place:${rounded(m.localMinutes)}min/${m.localWorkouts} workouts; same weekday:${rounded(m.sameWeekdayMinutes)}min.`,
    `Routine:${data.profile?.routine??'unknown'}; weekly goal:${data.profile?.weeklyGoal??'unknown'}. Lifetime logged sets:${m.totalSets}.`,
    ...candidates.map((ex,i)=>{
      const stat=m.exercises[ex.id], recent=stat?.recent.find(v=>v.locationId===session.locationId);
      const set=recent?.sets.at(-1);
      return `option${i+1} last local set:${set?`${set.reps} ${ex.seconds?'seconds':'reps'}, recorded load ${set.weight},${set.effort}`:'unknown'}; fully completed visits:${stat?.completedVisits??0}; shown since tracking:${stat?.shown??0}.`;
    }),
  ];
  return {criteria,essentials,candidateFacts,extraFacts,memory:m,
    state:[...essentials,...candidateFacts.map(f=>f.detail),...extraFacts].join('\n')};
}
