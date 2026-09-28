import { describe, it, expect } from "vitest";
import {
  access,
  applyFeedback,
  baseWeight,
  DAY,
  eligible,
  finishSession,
  logSet,
  newSession,
  remainingWorkBudget,
  weightedPick,
  weekCount,
} from "../src/domain/engine";
import { initialData, AppData, EQUIPMENT, MUSCLES } from "../src/domain/types";
import { exercises, exerciseById } from "../src/data/exercises";
import { dataSchema } from "../src/state/schema";
const now = 1800000000000;
function setup(): AppData {
  const d = structuredClone(initialData);
  d.profile = { level: "beginner", routine: "full", weeklyGoal: 3 };
  d.trialStartedAt = now;
  d.session = newSession(d, 20, "full", [], [], now);
  return d;
}
function current(id = "body-squat") {
  const d = setup();
  d.session!.current = { exerciseId: id, sets: [], plannedSets: 2 };
  return d;
}
describe("exercise catalog", () => {
  it("has unique complete exercise records and valid muscle and equipment references", () => {
    expect(exercises.length).toBeGreaterThanOrEqual(60);
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
    for (const ex of exercises) {
      expect(ex.primary.length).toBeGreaterThan(0);
      expect(ex.steps.length).toBeGreaterThanOrEqual(3);
      for (const m of [...ex.primary, ...ex.secondary])
        expect(MUSCLES).toContain(m);
      for (const e of ex.equipment) expect(EQUIPMENT).toContain(e);
      expect(ex.primary.some((m) => ex.secondary.includes(m))).toBe(false);
    }
  });
  it("offers beginner exercises in every muscle group with appropriate equipment", () => {
    const d = setup();
    d.locations[0].equipment = [...EQUIPMENT];
    const candidates = eligible(d, d.session!, now);
    for (const m of MUSCLES)
      expect(candidates.some((ex) => ex.primary.includes(m))).toBe(true);
  });
});
describe("hard exercise constraints", () => {
  it("never gives beginners barbell back squats even with a rack", () => {
    const d = setup();
    d.locations[0].equipment = [...EQUIPMENT];
    expect(
      eligible(d, d.session!, now).every((e) => e.level === "beginner"),
    ).toBe(true);
  });
  it("requires all equipment, not just some of it", () => {
    const d = setup();
    d.profile!.level = "advanced";
    d.locations[0].equipment = ["barbell"];
    expect(eligible(d, d.session!, now).map((e) => e.id)).not.toContain(
      "barbell-squat",
    );
  });
  it("filters sore secondary muscles as well as primary muscles", () => {
    const d = setup();
    d.session!.sore = ["triceps"];
    const ids = eligible(d, d.session!, now).map((e) => e.id);
    expect(ids).not.toContain("wall-pushup");
    expect(ids).toContain("body-squat");
  });
  it("never leaks soreness restrictions into another day", () => {
    const d = setup();
    d.session!.sore = [...MUSCLES];
    expect(eligible(d, d.session!, now)).toEqual([]);
    expect(
      eligible(d, newSession(d, 20, "full", [], [], now), now).length,
    ).toBeGreaterThan(0);
  });
  it("selects only requested muscle groups", () => {
    const d = setup();
    d.session = newSession(d, 20, "custom", ["calves"], [], now);
    expect(
      eligible(d, d.session, now).every((e) => e.primary.includes("calves")),
    ).toBe(true);
  });
  it("returns no exercise if none fit the remaining time", () => {
    const d = setup();
    expect(eligible(d, d.session!, now + 20 * 60000)).toEqual([]);
  });
  it("caps workload even when a user taps through sets quickly", () => {
    const d = setup();
    d.session!.minutes = 10;
    d.session!.completed = Array.from({ length: 4 }, () => ({
      exerciseId: "body-squat",
      sets: [
        { reps: 10, weight: 0, effort: "right" as const, at: now },
        { reps: 10, weight: 0, effort: "right" as const, at: now },
      ],
      plannedSets: 2,
    }));
    expect(remainingWorkBudget(d.session!, now)).toBe(0);
    expect(eligible(d, d.session!, now)).toEqual([]);
  });
  it("does not repeat completed, excluded or current exercises", () => {
    const d = current();
    d.session!.excluded = ["wall-pushup"];
    const ids = eligible(d, d.session!, now).map((e) => e.id);
    expect(ids).not.toContain("wall-pushup");
    expect(ids).not.toContain("body-squat");
  });
});
describe("feedback scope", () => {
  it("equipment busy expires with the session and does not edit saved equipment", () => {
    const d = current("db-curl");
    d.locations[0].equipment = ["dumbbells"];
    const next = applyFeedback(d, "busy", [], ["dumbbells"], now);
    expect(next.locations[0].equipment).toContain("dumbbells");
    expect(next.session!.unavailableEquipment).toContain("dumbbells");
    expect(
      eligible(next, next.session!, now).some((e) =>
        e.equipment.includes("dumbbells"),
      ),
    ).toBe(false);
  });
  it("missing equipment updates only the current location", () => {
    const d = current("db-curl");
    d.locations[0].equipment = ["dumbbells"];
    const next = applyFeedback(d, "unavailable", [], ["dumbbells"], now);
    expect(next.locations[0].equipment).not.toContain("dumbbells");
    expect(next.locations[1].equipment).toContain("dumbbells");
  });
  it("too advanced and dislikes persist across sessions", () => {
    for (const reason of ["advanced", "dislike"] as const) {
      const next = applyFeedback(current(), reason, [], [], now);
      const fresh = newSession(next, 20, "full", [], [], now);
      expect(eligible(next, fresh, now).map((e) => e.id)).not.toContain(
        "body-squat",
      );
    }
  });
  it("not today does not become a permanent dislike", () => {
    const next = applyFeedback(current(), "today", [], [], now);
    expect(next.disliked).toEqual([]);
    expect(
      eligible(next, newSession(next, 20, "full", [], [], now), now).map(
        (e) => e.id,
      ),
    ).toContain("body-squat");
  });
  it("sore triceps exclude other pushing exercises", () => {
    const next = applyFeedback(
      current("wall-pushup"),
      "sore",
      ["triceps"],
      [],
      now,
    );
    expect(next.session!.sore).toContain("triceps");
    expect(eligible(next, next.session!, now).map((e) => e.id)).not.toContain(
      "knee-pushup",
    );
  });
  it("preserves completed sets when replacing a partially completed exercise", () => {
    let d = current();
    d = logSet(d, { reps: 8, weight: 0, effort: "right", at: now });
    d = applyFeedback(d, "today", [], [], now + 1);
    expect(d.session!.completed[0].sets).toHaveLength(1);
    expect(d.session!.current).toBeNull();
  });
});
describe("exercise loop and persistence", () => {
  it("enforces rest before logging another set and completes only after all sets", () => {
    let d = current();
    d = logSet(d, { reps: 10, weight: 0, effort: "right", at: now });
    expect(d.session!.current!.sets).toHaveLength(1);
    const blocked = logSet(d, {
      reps: 10,
      weight: 0,
      effort: "right",
      at: now + 1,
    });
    expect(blocked).toBe(d);
    d = logSet(d, { reps: 10, weight: 0, effort: "right", at: now + 45000 });
    expect(d.session!.current).toBeNull();
    expect(d.session!.completed[0].sets).toHaveLength(2);
  });
  it("rejects invalid set input at the domain boundary", () => {
    const d = current();
    expect(logSet(d, { reps: NaN, weight: 0, effort: "right", at: now })).toBe(
      d,
    );
    expect(logSet(d, { reps: 10, weight: -1, effort: "right", at: now })).toBe(
      d,
    );
  });
  it("roundtrips a live workout including its rest deadline", () => {
    const d = logSet(current(), {
      reps: 10,
      weight: 0,
      effort: "hard",
      at: now,
    });
    expect(dataSchema.parse(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
  it("does not silently accept corrupted persistence", () => {
    expect(dataSchema.safeParse({ version: 1, history: "oops" }).success).toBe(
      false,
    );
  });
  it("saves partial workouts but not empty workouts", () => {
    expect(finishSession(setup(), now).history).toHaveLength(0);
    const done = finishSession(
      logSet(current(), { reps: 8, weight: 0, effort: "right", at: now }),
      now + 1000,
    );
    expect(done.history).toHaveLength(1);
    expect(done.session).toBeNull();
  });
  it("balances movements without eliminating familiar exercises", () => {
    const d = setup();
    d.session!.completed = [
      { exerciseId: "body-squat", sets: [], plannedSets: 2 },
    ];
    expect(
      baseWeight(exerciseById["wall-pushup"], d, d.session!),
    ).toBeGreaterThan(baseWeight(exerciseById["sumo-squat"], d, d.session!));
  });
  it("weighted sampling has stable boundary behavior", () => {
    const list = exercises.slice(0, 2);
    expect(weightedPick([], [], () => 0)).toBeNull();
    expect(weightedPick(list, [1, 3], () => 0)).toBe(list[0]);
    expect(weightedPick(list, [1, 3], () => 0.99)).toBe(list[1]);
    expect(weightedPick(list, [NaN, 0], () => 0)).toBe(list[0]);
  });
});
describe("billing and trial", () => {
  it("provides exactly 14 days without a purchase", () => {
    const d = setup();
    expect(access(d, now).trialLeft).toBe(14);
    expect(access(d, now + 14 * DAY - 1).allowed).toBe(true);
    expect(access(d, now + 14 * DAY).allowed).toBe(false);
  });
  it("does not extend the trial when the clock moves backwards", () => {
    const d = setup();
    d.lastSeenAt = now + 15 * DAY;
    expect(access(d, now).allowed).toBe(false);
  });
  it("honors the verified paid-through date offline", () => {
    const d = setup();
    d.billing = {
      active: true,
      expiresAt: now + 30 * DAY,
      verifiedAt: now,
      managementURL: null,
    };
    expect(access(d, now + 20 * DAY).paid).toBe(true);
    expect(access(d, now + 30 * DAY).allowed).toBe(false);
  });
  it("does not grant indefinite access for unknown expiration or revoked access", () => {
    const d = setup();
    d.trialStartedAt = now - 20 * DAY;
    d.billing = {
      active: true,
      expiresAt: null,
      verifiedAt: now,
      managementURL: null,
    };
    expect(access(d, now + 4 * DAY).allowed).toBe(false);
    d.billing = { ...d.billing, active: false, expiresAt: now + DAY };
    expect(access(d, now).paid).toBe(false);
  });
});

describe('offline subscription snapshots', () => {
 it('retains a known paid-through date when the SDK re-emits a stale offline snapshot', async () => {
  const { mergeBilling } = await import('../src/domain/engine');
  const d = setup(); d.billing = { active: true, expiresAt: now + 30 * DAY, verifiedAt: now, managementURL: null };
  expect(mergeBilling(d, { ...d.billing, active: false })).toBe(d);
  const revoked = mergeBilling(d, { ...d.billing, active: false, verifiedAt: now + DAY });
  expect(revoked.billing!.active).toBe(false);
 });
});

describe('model candidate diversity and stale-result rejection', () => {
 it('includes each eligible movement pattern instead of taking the first six catalog rows', async () => {
  const { diverseShortlist } = await import('../src/domain/engine'); const d = setup();
  const all = eligible(d, d.session!, now); const shortlist = diverseShortlist(d, d.session!, all, () => 0.2);
  expect(new Set(shortlist.map(e => e.pattern)).size).toBe(new Set(all.map(e => e.pattern)).size);
  expect(new Set(shortlist.map(e => e.id)).size).toBe(shortlist.length);
 });
 it('rejects a delayed model suggestion after equipment availability changes', async () => {
  const { acceptSelection } = await import('../src/domain/engine'); const d = setup();
  const result = { current: { exerciseId: 'db-curl', sets: [], plannedSets: 2 }, engine: 'laya' as const };
  expect(acceptSelection(d, d.session!.id, result, now)).toBe(d);
 });
});
