import { DayPlan, WEEKDAYS, Weekday, WeeklySchedule, focusLabels, titleCase } from './types';
export const weekdayNames: Record<Weekday, string> = { mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday' };
export const defaultSchedule = (): WeeklySchedule => Object.fromEntries(WEEKDAYS.map(day=>[day,{focus:'full'}])) as WeeklySchedule;
export const weekdayAt = (now=Date.now()): Weekday => WEEKDAYS[(new Date(now).getDay()+6)%7];
export function dayPlanLabel(plan: DayPlan) {
  if(plan.focus==='rest')return 'Rest day';
  if(plan.focus==='open')return '? Laya decides';
  if(plan.focus==='custom')return plan.muscles.map(titleCase).join(' + ') || 'Pick muscles';
  return focusLabels[plan.focus];
}
export const validDayPlan = (plan: DayPlan) => plan.focus!=='custom' || plan.muscles.length>0;
