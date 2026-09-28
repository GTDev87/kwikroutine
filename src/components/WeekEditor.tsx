import React, { useState } from 'react';
import { View } from 'react-native';
import { Chip, ListGroup, ListRow, T, s } from './ui';
import { DayPlan, MUSCLES, WEEKDAYS, WeeklySchedule, titleCase } from '../domain/types';
import { dayPlanLabel, weekdayAt, weekdayNames } from '../domain/routine';

export function DayPicker({ plan, onChange }: { plan: DayPlan; onChange: (plan: DayPlan)=>void }) {
  return <View style={{gap:14}}>
    <View style={s.wrap}>
      {(['full','upper','lower','custom','open','rest'] as const).map(focus=><Chip key={focus}
        label={focus==='custom'?'Pick muscles':dayPlanLabel({focus})}
        selected={plan.focus===focus} onPress={()=>onChange(focus==='custom'?{focus,muscles:plan.focus==='custom'?plan.muscles:[]}:{focus})} />)}
    </View>
    {plan.focus==='open' && <T style={[s.small,s.muted]}>No set focus. On the day, Kwik Pick chooses each move from what you’ve recovered for.</T>}
    {plan.focus==='custom' && <>
      <T style={s.small}>Choose one or more muscle groups.</T>
      <View style={s.wrap}>{MUSCLES.map(m=><Chip key={m} small label={titleCase(m)} selected={plan.muscles.includes(m)}
        onPress={()=>onChange({focus:'custom',muscles:plan.muscles.includes(m)?plan.muscles.filter(x=>x!==m):[...plan.muscles,m]})} />)}</View>
    </>}
  </View>;
}
// One row per weekday; tap a day to choose its focus.
export function WeekEditor({ schedule, onChange }: { schedule: WeeklySchedule; onChange: (schedule: WeeklySchedule)=>void }) {
  const [editing,setEditing]=useState(weekdayAt());
  return <ListGroup>{WEEKDAYS.map(day=><View key={day}>
    <ListRow title={weekdayNames[day]} value={dayPlanLabel(schedule[day])}
      accessibilityLabel={`Edit ${weekdayNames[day]}`} onPress={()=>setEditing(day)}/>
    {editing===day && <View style={{padding:16,paddingTop:0}}>
      <DayPicker plan={schedule[day]} onChange={plan=>onChange({...schedule,[day]:plan})}/>
    </View>}
  </View>)}</ListGroup>;
}
