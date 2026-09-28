import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, C, Card, OptionCard, PageTitle, StepBar, T, s } from '../components/ui';
import { DayPicker, WeekEditor } from '../components/WeekEditor';
import { useStore } from '../state/store';
import { DayPlan, Profile, routineLabels } from '../domain/types';
import { defaultSchedule, validDayPlan, validSchedule } from '../domain/routine';
import { dayKey, todayFocus } from '../domain/today';

export function Routine({ go, todayOnly=false }: { go: (route:string)=>void; todayOnly?: boolean }) {
  const {data,update}=useStore();
  const [routine,setRoutine]=useState<Profile['routine']>(data.profile?.routine??'full');
  const [schedule,setSchedule]=useState(data.profile?.schedule??defaultSchedule());
  const [today,setToday]=useState<DayPlan>(()=>{
    const current=todayFocus(data,[]);
    return current.rest&&current.focus!=='open'?{focus:'rest'}:current.focus==='custom'?{focus:'custom',muscles:current.targets}:{focus:current.focus};
  });
  const valid=todayOnly?validDayPlan(today):routine!=='custom'||validSchedule(schedule);
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
      <View style={{gap:12}}>{(['full','split','kwik','custom'] as const).map(value=><OptionCard key={value} title={routineLabels[value]}
        subtitle={{full:'Work your whole body each workout, around any soreness.',split:'Alternate upper-body and lower-body workouts.',kwik:'Kwik Pick chooses your moves each day, and suggests rest when you need it.',custom:'Give each day of the week its own focus.'}[value]}
        selected={routine===value} onPress={()=>setRoutine(value)}/>)}</View>
      {routine==='custom' && <WeekEditor schedule={schedule} onChange={setSchedule}/>}
    </>}
    {!valid && <T accessibilityRole="alert" style={{color:C.danger,fontSize:14}}>Pick at least one muscle for each custom muscle day before saving.</T>}
    <Button title={todayOnly?'Use today':'Save workout style'} onPress={save} disabled={!valid}/>
    {todayOnly && data.workoutOverride?.day===dayKey() && <Button title="Use my regular plan" secondary onPress={()=>{update(d=>({...d,workoutOverride:null}));go('today');}}/>}
    <Button title="Cancel" ghost onPress={back}/>
  </ScrollView>
  </View>;
}
