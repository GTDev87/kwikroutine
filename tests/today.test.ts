import { describe, it, expect } from "vitest";
import { finishSession, newSession } from "../src/domain/engine";
import { initialData, AppData } from "../src/domain/types";
import { dataSchema } from "../src/state/schema";
import {
  dayKey,
  recovery,
  todayCheckIn,
  todayFocus,
  whyThis,
} from "../src/domain/today";
import { exerciseById } from "../src/data/exercises";
const now = 1800000000000;
function setup(routine: "full" | "split" = "full"): AppData {
  const d = structuredClone(initialData);
  d.profile = { level: "beginner", routine, weeklyGoal: 3 };
  d.trialStartedAt = now;
  return d;
}
describe("daily check-in", () => {
  it("only applies on the day it was made", () => {
    const d = setup();
    d.checkIn = { day: dayKey(now), sore: ["quads"], pain: false };
    expect(todayCheckIn(d, now).sore).toEqual(["quads"]);
    expect(todayCheckIn(d, now + 86400000).sore).toEqual([]);
  });
  it("persists through the schema, and older saves without it still load", () => {
    const d = setup();
    d.checkIn = { day: dayKey(now), sore: ["chest"], pain: true };
    expect(dataSchema.parse(JSON.parse(JSON.stringify(d))).checkIn).toEqual(
      d.checkIn,
    );
    const legacy = JSON.parse(JSON.stringify(setup()));
    delete legacy.checkIn;
    expect(() => dataSchema.parse(legacy)).not.toThrow();
  });
});
describe("today's focus", () => {
  it("full body drops sore muscles from the targets", () => {
    const plan = todayFocus(setup(), ["quads"]);
    expect(plan.focus).toBe("full");
    expect(plan.targets).not.toContain("quads");
    expect(plan.why).toMatch(/quads/);
  });
  it("split alternates upper and lower days", () => {
    const d = setup("split");
    expect(todayFocus(d, []).focus).toBe("upper");
    d.session = newSession(d, 20, "upper", [], [], now);
    d.session.completed = [
      { exerciseId: "body-squat", sets: [], plannedSets: 1 },
    ];
    const done = finishSession(d, now);
    expect(todayFocus(done, []).focus).toBe("lower");
  });
  it("split swaps days when most of the planned half is sore", () => {
    const plan = todayFocus(setup("split"), ["chest", "shoulders", "triceps"]);
    expect(plan.focus).toBe("lower");
    expect(plan.why).toMatch(/upper body/);
  });
});
describe("recovery and reasons", () => {
  it("marks muscles trained in the last two days as recovering", () => {
    const d = setup();
    d.session = newSession(d, 20, "full", [], [], now);
    d.session.completed = [
      { exerciseId: "body-squat", sets: [], plannedSets: 1 },
    ];
    const done = finishSession(d, now);
    expect(recovery(done, now + 3600000).recovering).toContain("quads");
    expect(recovery(done, now + 3 * 86400000).recovering).toEqual([]);
  });
  it("explains a pick using facts the filters guarantee", () => {
    const d = setup();
    const session = newSession(d, 20, "full", [], ["quads"], now);
    const upper = Object.values(exerciseById).find(
      (ex) => ![...ex.primary, ...ex.secondary].includes("quads"),
    )!;
    const why = whyThis(d, session, upper, now);
    expect(why).toMatch(/haven’t done it yet/);
    expect(why).toMatch(/sore quads/);
  });
});

describe('custom weekly routines and daily changes', () => {
  const monday = new Date(2026,8,28,12).getTime();
  it('uses local weekdays, persists the plan, and passes custom targets to exercise selection', async () => {
    const { defaultSchedule } = await import('../src/domain/routine');
    const { eligible } = await import('../src/domain/engine');
    const d=setup(); d.profile!.routine='custom'; d.profile!.schedule=defaultSchedule();
    d.profile!.schedule.mon={focus:'custom',muscles:['back','biceps']};
    d.profile!.schedule.tue={focus:'lower'};d.profile!.schedule.sun={focus:'rest'};
    const saved=dataSchema.parse(JSON.parse(JSON.stringify(d)));
    const plan=todayFocus(saved,['biceps'],monday);
    expect(plan.focus).toBe('custom');expect(plan.targets).toEqual(['back']);
    const session=newSession(saved,30,plan.focus,plan.targets,['biceps'],monday);
    expect(eligible(saved,session,monday).every(ex=>ex.primary.includes('back')&&!ex.secondary.includes('biceps')&&!ex.primary.includes('biceps'))).toBe(true);
    expect(todayFocus(saved,[],monday+86400000).focus).toBe('lower');
    expect(todayFocus(saved,[],monday-86400000).rest).toBe(true);
  });
  it('daily override wins and expires on the next local date',async()=>{
    const {defaultSchedule}=await import('../src/domain/routine');
    const d=setup();d.profile!.routine='custom';d.profile!.schedule=defaultSchedule();d.profile!.schedule.mon={focus:'rest'};
    d.workoutOverride={day:dayKey(monday),plan:{focus:'upper'}};
    expect(todayFocus(d,[],monday).focus).toBe('upper');expect(todayFocus(d,[],monday).rest).toBe(false);
    expect(todayFocus(d,[],monday+86400000).focus).toBe('full');
    expect(dataSchema.parse(d).workoutOverride).toEqual(d.workoutOverride);
  });
  it('switching defaults preserves saved custom plans and in-progress sessions',async()=>{
    const {defaultSchedule}=await import('../src/domain/routine');
    const d=setup();d.profile!.schedule=defaultSchedule();d.profile!.schedule.mon={focus:'lower'};
    d.session=newSession(d,30,'upper',[],[],monday);const existing=structuredClone(d.session);
    d.profile!.routine='custom';expect(todayFocus(d,[],monday).focus).toBe('lower');
    d.profile!.routine='full';expect(todayFocus(d,[],monday).focus).toBe('full');
    expect(d.session).toEqual(existing);expect(d.profile!.schedule.mon.focus).toBe('lower');
  });
  it('rejects empty custom muscle days while old profiles still load',async()=>{
    const {defaultSchedule}=await import('../src/domain/routine');
    expect(dataSchema.safeParse(setup()).success).toBe(true);
    const d=setup();d.profile!.routine='custom';d.profile!.schedule=defaultSchedule();
    d.profile!.schedule.mon={focus:'custom',muscles:[]};
    expect(dataSchema.safeParse(d).success).toBe(false);
  });
});

describe('open “?” days', () => {
  const monday = new Date(2026, 8, 28, 12).getTime();
  it('leaves every rested muscle available, persists, and tells Laya the day is open', async () => {
    const { defaultSchedule } = await import('../src/domain/routine');
    const { eligible } = await import('../src/domain/engine');
    const { personalizationContext } = await import('../src/domain/coachContext');
    const d = setup(); d.profile!.routine = 'custom'; d.profile!.schedule = defaultSchedule();
    d.profile!.schedule.mon = { focus: 'open' };
    const saved = dataSchema.parse(JSON.parse(JSON.stringify(d)));
    expect(saved.profile!.schedule!.mon).toEqual({ focus: 'open' });
    const plan = todayFocus(saved, ['quads'], monday);
    expect(plan.focus).toBe('open');
    expect(plan.rest).toBe(false);
    expect(plan.targets).not.toContain('quads');
    expect(plan.targets).toContain('chest');
    expect(plan.why).toMatch(/Kwik Pick chooses each move/);
    const session = newSession(saved, 30, plan.focus, plan.targets, ['quads'], monday);
    expect(dataSchema.parse(JSON.parse(JSON.stringify({ ...saved, session }))).session!.focus).toBe('open');
    const options = eligible(saved, session, monday);
    expect(options.length).toBeGreaterThan(0);
    expect(options.some(ex => [...ex.primary, ...ex.secondary].includes('quads'))).toBe(false);
    expect(personalizationContext(saved, session, options.slice(0, 3), monday).state).toMatch(/Focus:open \(no preset focus/);
  });
});

describe('soreness levels', () => {
  const find = (pred: (ex: (typeof exerciseById)[string]) => boolean) => Object.values(exerciseById).find(pred)!;
  it('light allows, medium only as a helper, very sore not at all', async () => {
    const { blockedBySoreness, sorenessWeight } = await import('../src/domain/soreness');
    const leadsQuads = find(ex => ex.primary.includes('quads'));
    const assistsQuads = find(ex => !ex.primary.includes('quads') && ex.secondary.includes('quads'));
    const at = (level: 1 | 2 | 3) => ({ sore: ['quads' as const], soreLevels: { quads: level } });
    expect(blockedBySoreness(leadsQuads, at(1))).toBe(false);
    expect(sorenessWeight(leadsQuads, at(1))).toBeLessThan(1);
    expect(blockedBySoreness(leadsQuads, at(2))).toBe(true);
    expect(blockedBySoreness(assistsQuads, at(2))).toBe(false);
    expect(blockedBySoreness(assistsQuads, at(3))).toBe(true);
    // Check-ins saved before levels existed keep excluding the muscle entirely.
    expect(blockedBySoreness(assistsQuads, { sore: ['quads'] })).toBe(true);
  });
  it('keeps lightly sore muscles in today’s plan, rests medium ones, and persists levels', () => {
    const d = setup();
    const plan = todayFocus(d, ['quads', 'chest'], now, { quads: 1, chest: 2 });
    expect(plan.targets).toContain('quads');
    expect(plan.targets).not.toContain('chest');
    expect(plan.why).toMatch(/quads is a little sore/);
    d.checkIn = { day: dayKey(now), sore: ['quads', 'chest'], soreLevels: { quads: 1, chest: 2 }, pain: false };
    expect(dataSchema.parse(JSON.parse(JSON.stringify(d))).checkIn!.soreLevels).toEqual({ quads: 1, chest: 2 });
  });
  it('tells Laya each level and which candidates load sore muscles', async () => {
    const { personalizationContext } = await import('../src/domain/coachContext');
    const { eligible } = await import('../src/domain/engine');
    const d = setup();
    const session = newSession(d, 30, 'full', [], ['quads'], now, { quads: 1 });
    const options = eligible(d, session, now);
    const loaded = options.filter(ex => ex.primary.includes('quads')).slice(0, 2);
    expect(loaded.length).toBeGreaterThan(0);
    const state = personalizationContext(d, session, loaded, now).state;
    expect(state).toMatch(/Sore:quads\(light\)/);
    expect(state).toMatch(/loads sore quads light \(primary\)/);
  });
  it('“Too sore for this” marks the exercise’s muscles very sore', async () => {
    const { applyFeedback } = await import('../src/domain/engine');
    const d = setup();
    d.session = newSession(d, 30, 'full', [], ['quads'], now, { quads: 1 });
    const ex = find(e => e.primary.includes('quads'));
    d.session.current = { exerciseId: ex.id, sets: [], plannedSets: 2 };
    const next = applyFeedback(d, 'sore', [], [], now);
    expect(next.session!.soreLevels!.quads).toBe(3);
  });
});

describe('open days the app turns into rest days', () => {
  const monday = new Date(2026, 8, 28, 12).getTime();
  const openMonday = async () => {
    const { defaultSchedule } = await import('../src/domain/routine');
    const d = setup(); d.profile!.routine = 'custom'; d.profile!.schedule = defaultSchedule();
    d.profile!.schedule.mon = { focus: 'open' };
    return d;
  };
  const trained = (d: AppData, at: number) => d.history.push({ ...newSession(d, 30, 'full', ['chest'], [], at - 1800000), endedAt: at,
    completed: [{ exerciseId: Object.keys(exerciseById)[0], sets: [{ reps: 10, weight: 0, effort: 'hard', at }], plannedSets: 2 }] });
  it('only considers rest soon after training, or with soreness', async () => {
    const { restOptions } = await import('../src/domain/restDay');
    const d = await openMonday();
    expect(restOptions(d, monday)).toBeNull();
    trained(d, monday - 4 * 86400000);
    expect(restOptions(d, monday)).toBeNull();
    trained(d, monday - 20 * 3600000);
    expect(restOptions(d, monday)!.state).toMatch(/hours since last workout: 20/);
  });
  it('rests only on a confident call, and trains when inference is missing', async () => {
    const { resolveRest } = await import('../src/domain/restDay');
    expect(resolveRest(null)).toBe(false);
    expect(resolveRest({ train: .45, rest: .55 })).toBe(false);
    expect(resolveRest({ train: .2, rest: .8 })).toBe(true);
    expect(resolveRest({ train: .2, rest: NaN })).toBe(false);
  });
  it('shows a rest day for the decided check-in, persists, and lets you change today', async () => {
    const { restBasis, restPending } = await import('../src/domain/today');
    const d = await openMonday();
    expect(restPending(d, monday)).toBe(true);
    d.restDecision = { day: dayKey(monday), basis: restBasis(d, monday), rest: true };
    const saved = dataSchema.parse(JSON.parse(JSON.stringify(d)));
    expect(restPending(saved, monday)).toBe(false);
    expect(todayFocus(saved, [], monday)).toMatchObject({ rest: true, auto: true, focus: 'open' });
    // A new check-in asks again; until then the day stays open for training.
    saved.checkIn = { day: dayKey(monday), sore: ['quads'], soreLevels: { quads: 2 }, pain: false };
    expect(restPending(saved, monday)).toBe(true);
    expect(todayFocus(saved, ['quads'], monday, { quads: 2 }).rest).toBe(false);
    // Changing today, even to the app's pick, means training.
    d.workoutOverride = { day: dayKey(monday), plan: { focus: 'open' } };
    expect(restPending(d, monday)).toBe(false);
    expect(todayFocus(d, [], monday).rest).toBe(false);
  });
  it('decides rest at the start of the day and never stops someone ready to train', async () => {
    const { restBasis, restPending } = await import('../src/domain/today');
    // A train call holds even if soreness is updated later, e.g. at the gym.
    const d = await openMonday();
    d.restDecision = { day: dayKey(monday), basis: restBasis(d, monday), rest: false };
    d.checkIn = { day: dayKey(monday), sore: ['quads'], soreLevels: { quads: 2 }, pain: false };
    expect(restPending(d, monday)).toBe(false);
    expect(todayFocus(d, ['quads'], monday, { quads: 2 }).rest).toBe(false);
    // A workout in progress, or one already done today, is never overruled by a late rest call.
    const busy = await openMonday();
    busy.session = newSession(busy, 30, 'open', [], [], monday - 600000);
    expect(restPending(busy, monday)).toBe(false);
    busy.restDecision = { day: dayKey(monday), basis: restBasis(busy, monday), rest: true };
    expect(todayFocus(busy, [], monday).rest).toBe(false);
    const done = await openMonday();
    trained(done, monday - 3600000);
    expect(restPending(done, monday)).toBe(false);
    done.restDecision = { day: dayKey(monday), basis: restBasis(done, monday), rest: true };
    expect(todayFocus(done, [], monday).rest).toBe(false);
  });
});

describe('Kwik Pick every day', () => {
  it('makes every day open, persists, and can still turn a day into rest', async () => {
    const { restBasis, restPending } = await import('../src/domain/today');
    const d = setup(); d.profile!.routine = 'kwik';
    const saved = dataSchema.parse(JSON.parse(JSON.stringify(d)));
    for (let i = 0; i < 7; i++) {
      const day = now + i * 86400000;
      expect(todayFocus(saved, [], day)).toMatchObject({ focus: 'open', rest: false });
      expect(restPending(saved, day)).toBe(true);
    }
    saved.restDecision = { day: dayKey(now), basis: restBasis(saved, now), rest: true };
    expect(todayFocus(saved, [], now)).toMatchObject({ rest: true, auto: true });
  });
});
