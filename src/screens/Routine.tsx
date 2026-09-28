import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, C, Card, Chip, ListGroup, ListRow, OptionCard, PageTitle, StepBar, T, s } from '../components/ui';
import { useStore } from '../state/store';
import { DayPlan, MUSCLES, Profile, WEEKDAYS, routineLabels, titleCase } from '../domain/types';
import { dayPlanLabel, defaultSchedule, validDayPlan, weekdayAt, weekdayNames } from '../domain/routine';
import { dayKey, todayFocus } from '../domain/today';

function DayPicker({ plan, onChange }: { plan: DayPlan; onChange: (plan: DayPlan)=>void }) {
  return <View style={{gap:14}}>
    <View style={s.wrap}>
      {(['full','upper','lower','custom','open','rest'] as const).map(focus=><Chip key={focus}
        label={focus==='custom'?'Pick muscles':dayPlanLabel({focus})}
        selected={plan.focus===focus} onPress={()=>onChange(focus==='custom'?{focus,muscles:plan.focus==='custom'?plan.muscles:[]}:{focus})} />)}
    </View>
    {plan.focus==='open' && <T style={[s.small,s.muted]}>No set focus. On the day, Laya picks each move from what you’ve recovered for.</T>}
    {plan.focus==='custom' && <>
      <T style={s.small}>Choose one or more muscle groups.</T>
      <View style={s.wrap}>{MUSCLES.map(m=><Chip key={m} small label={titleCase(m)} selected={plan.muscles.includes(m)}
        onPress={()=>onChange({focus:'custom',muscles:plan.muscles.includes(m)?plan.muscles.filter(x=>x!==m):[...plan.muscles,m]})} />)}</View>
    </>}
  </View>;
}
export function Routine({ go, todayOnly=false }: { go: (route:string)=>void; todayOnly?: boolean }) {
  const {data,update}=useStore();
  const [routine,setRoutine]=useState<Profile['routine']>(data.profile?.routine??'full');
  const [schedule,setSchedule]=useState(data.profile?.schedule??defaultSchedule());
  const [editing,setEditing]=useState(weekdayAt());
  const [today,setToday]=useState<DayPlan>(()=>{
    const current=todayFocus(data,[]);
    return current.rest?{focus:'rest'}:current.focus==='custom'?{focus:'custom',muscles:current.targets}:{focus:current.focus};
  });
  const valid=todayOnly?validDayPlan(today):routine!=='custom'||WEEKDAYS.every(day=>validDayPlan(schedule[day]));
  const save=()=>{
    if(!valid)return;
    update(d=>todayOnly?{...d,workoutOverride:{day:dayKey(),plan:today}}:
      {...d,profile:{...d.profile!,routine,schedule},workoutOverride:null});
    go(todayOnly?'today':'profile');
  };
  const back=()=>go(todayOnly?'today':'profile');
  return <View style={{flex:1}}>
  <StepBar onBack={back}/>
  <ScrollView contentContainerStyle={[s.page,{paddingTop:8}]}>
    <PageTitle title={todayOnly?'What fits today?':'Workout style'}
      subtitle={todayOnly?'Change this day only. Your weekly plan stays the same.':'Choose a default, or give each day its own focus.'}/>
    {!!data.session && <T style={s.notice}>Your current workout will stay as it is. Changes apply to your next workout.</T>}
    {todayOnly?<Card><DayPicker plan={today} onChange={setToday}/></Card>:<>
      <View style={{gap:12}}>{(['full','split','custom'] as const).map(value=><OptionCard key={value} title={routineLabels[value]}
        subtitle={{full:'Work your whole body each workout, around any soreness.',split:'Alternate upper-body and lower-body workouts.',custom:'Give each day of the week its own focus.'}[value]}
        selected={routine===value} onPress={()=>setRoutine(value)}/>)}</View>
      {routine==='custom' && <>
        <ListGroup>{WEEKDAYS.map(day=><View key={day}>
          <ListRow title={weekdayNames[day]} value={dayPlanLabel(schedule[day])}
            accessibilityLabel={`Edit ${weekdayNames[day]}`} onPress={()=>setEditing(day)}/>
          {editing===day && <View style={{padding:16,paddingTop:0}}>
            <DayPicker plan={schedule[day]} onChange={plan=>setSchedule(previous=>({...previous,[day]:plan}))}/>
          </View>}
        </View>)}</ListGroup>
      </>}
    </>}
    {!valid && <T accessibilityRole="alert" style={{color:C.danger,fontSize:14}}>Pick at least one muscle for each custom muscle day before saving.</T>}
    <Button title={todayOnly?'Use today':'Save workout style'} onPress={save} disabled={!valid}/>
    {todayOnly && data.workoutOverride?.day===dayKey() && <Button title="Use my regular plan" secondary onPress={()=>{update(d=>({...d,workoutOverride:null}));go('today');}}/>}
    <Button title="Cancel" ghost onPress={back}/>
  </ScrollView>
  </View>;
}
