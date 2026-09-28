import { AppData, DayPlan, WEEKDAYS, Weekday, WeeklySchedule, focusLabels, titleCase } from './types';
export const weekdayNames: Record<Weekday, string> = { mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday' };
export const defaultSchedule = (): WeeklySchedule => Object.fromEntries(WEEKDAYS.map(day=>[day,{focus:'full'}])) as WeeklySchedule;
export const weekdayAt = (now=Date.now()): Weekday => WEEKDAYS[(new Date(now).getDay()+6)%7];
// The plan the routine sets for a day. Kwik Pick leaves every day open; full and split pick on the day.
export function scheduledPlan(data: AppData, now=Date.now()): DayPlan | null {
  if(data.profile?.routine==='kwik')return {focus:'open'};
  return data.profile?.routine==='custom' ? (data.profile.schedule ?? defaultSchedule())[weekdayAt(now)] : null;
}
export function dayPlanLabel(plan: DayPlan) {
  if(plan.focus==='rest')return 'Rest day';
  if(plan.focus==='open')return '? Kwik Pick';
  if(plan.focus==='custom')return plan.muscles.map(titleCase).join(' + ') || 'Pick muscles';
  return focusLabels[plan.focus];
}
export const validDayPlan = (plan: DayPlan) => plan.focus!=='custom' || plan.muscles.length>0;
export const validSchedule = (schedule: WeeklySchedule) => WEEKDAYS.every(day=>validDayPlan(schedule[day]));
