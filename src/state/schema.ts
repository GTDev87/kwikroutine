import { z } from "zod";
import { EQUIPMENT, MUSCLES, INTENTS, SESSION_STYLES, AppData } from "../domain/types";
const muscle = z.enum(MUSCLES),
  equipment = z.enum(EQUIPMENT);
const dayPlan = z.discriminatedUnion('focus', [
  z.object({ focus: z.literal('full') }), z.object({ focus: z.literal('upper') }),
  z.object({ focus: z.literal('lower') }), z.object({ focus: z.literal('rest') }),
  z.object({ focus: z.literal('open') }),
  z.object({ focus: z.literal('custom'), muscles: z.array(muscle).min(1) }),
]);
const soreLevels = z
  .partialRecord(muscle, z.union([z.literal(1), z.literal(2), z.literal(3)]))
  .optional();
const schedule = z.object({ mon: dayPlan, tue: dayPlan, wed: dayPlan, thu: dayPlan, fri: dayPlan, sat: dayPlan, sun: dayPlan });
const performed = z.object({
  exerciseId: z.string(),
  plannedSets: z.number().int().min(1).max(5),
  load: z.object({ previous: z.number().positive().max(1000).optional(), suggested: z.number().positive().max(1000), source: z.enum(['history', 'laya', 'estimate']) }).optional(),
  repTarget: z.object({ target: z.number().int().min(1).max(300), suggested: z.number().int().min(1).max(300), source: z.enum(['plan', 'laya']) }).optional(),
  sets: z.array(
    z.object({
      reps: z.number().nonnegative(),
      weight: z.number().nonnegative(),
      effort: z.enum(["easy", "right", "hard"]),
      at: z.number(),
    }),
  ),
});
const session = z.object({
  id: z.string(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  locationId: z.string(),
  locationName: z.string(),
  minutes: z.number().min(10).max(60),
  focus: z.enum(["full", "upper", "lower", "open", "custom"]),
  targets: z.array(muscle),
  sore: z.array(muscle),
  soreLevels,
  excluded: z.array(z.string()),
  unavailableEquipment: z.array(equipment),
  completed: z.array(performed),
  current: performed.nullable(),
  restUntil: z.number().nullable(),
  warmupDone: z.boolean(),
  engine: z.enum(["rules", "laya"]),
  intent: z.enum(INTENTS).optional(),
  style: z.enum(SESSION_STYLES).optional(),
});
export const dataSchema: z.ZodType<AppData> = z.object({
  version: z.literal(1),
  profile: z
    .object({
      level: z.enum(["beginner", "intermediate", "advanced"]),
      routine: z.enum(["full", "split", "kwik", "custom"]),
      schedule: schedule.optional(),
      weeklyGoal: z.number().int().min(1).max(7),
      weightUnit: z.enum(['lb', 'kg']).optional(),
    })
    .nullable(),
  locations: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        kind: z.enum(["bedroom", "home", "gym", "other"]),
        equipment: z.array(equipment),
      }),
    )
    .min(1),
  selectedLocationId: z.string(),
  history: z.array(session),
  session: session.nullable(),
  feedback: z.array(
    z.object({
      exerciseId: z.string(),
      reason: z.enum([
        "busy",
        "unavailable",
        "sore",
        "advanced",
        "today",
        "dislike", "setup", "floor", "crowded", "repetitive",
      ]),
      locationId: z.string(),
      at: z.number(),
    }),
  ),
  recommendations: z.array(z.object({
    exerciseId: z.string(), sessionId: z.string(), locationId: z.string(), at: z.number(),
  })).optional(),
  disliked: z.array(z.string()),
  tooAdvanced: z.array(z.string()),
  trialStartedAt: z.number().nullable(),
  lastSeenAt: z.number(),
  billing: z
    .object({
      active: z.boolean(),
      expiresAt: z.number().nullable(),
      verifiedAt: z.number(),
      managementURL: z.string().nullable(),
    })
    .nullable(),
  checkIn: z
    .object({ day: z.string(), sore: z.array(muscle), soreLevels, pain: z.boolean(), intent: z.enum(INTENTS).optional() })
    .nullable()
    .optional(),
  workoutOverride: z.object({ day: z.string(), plan: dayPlan }).nullable().optional(),
  restDecision: z.object({ day: z.string(), basis: z.string(), rest: z.boolean() }).nullable().optional(),
});
