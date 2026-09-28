export const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "core",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "forearms",
  "inner-thighs",
  "hips",
] as const;
export type Muscle = (typeof MUSCLES)[number];
export const EQUIPMENT = [
  "mat",
  "chair",
  "dumbbells",
  "bands",
  "bench",
  "barbell",
  "rack",
  "cable",
  "pullup-bar",
  "leg-press",
  "leg-curl",
  "leg-extension",
  "chest-press",
  "row-machine",
  "seated-cable-row",
  "kettlebells",
  "ez-bar",
  "smith-machine",
  "loop-bands",
  "suspension",
  "stability-ball",
  "rings",
  "plates",
  "dip-station",
  "lat-pulldown",
  "hack-squat",
  "standing-calf-machine",
  "shoulder-press",
  "lateral-raise-machine",
  "ab-wheel",
  "assisted-dip",
  "assisted-pullup",
  "trap-bar",
  "hip-abduction",
  "hip-adduction",
  "back-extension-machine",
  "biceps-machine",
  "pec-deck",
  "preacher-machine",
  "ab-machine",
  "triceps-machine",
  "nordic-bench",
  "donkey-calf-machine",
  "glute-drive",
  "shrug-machine",
  "seated-calf-machine",
  "wrist-roller",
  "seated-leg-curl",
  "roman-chair",
  "captains-chair",
  "preacher-bench",
  "decline-bench",
  "adjustable-bench",
  "landmine",
  "air-bike",
  "battle-ropes",
  "plyo-box",
  "treadmill",
  "elliptical",
  "jump-rope",
  "slam-ball",
  "rower",
  "sled",
  "stair-climber",
  "stationary-bike",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];
export const equipmentLabels: Record<Equipment, string> = {
  mat: "Exercise mat",
  chair: "Sturdy chair",
  dumbbells: "Dumbbells",
  bands: "Resistance bands",
  bench: "Weight bench",
  barbell: "Barbell",
  rack: "Squat rack",
  cable: "Cable station",
  "pullup-bar": "Pull-up bar",
  "leg-press": "Leg press",
  "leg-curl": "Lying leg curl",
  "leg-extension": "Leg extension",
  "chest-press": "Chest press",
  "row-machine": "Seated row machine",
  "seated-cable-row": "Seated cable row",
  "kettlebells": "Kettlebells",
  "ez-bar": "EZ curl bar",
  "smith-machine": "Smith machine",
  "loop-bands": "Loop bands",
  "suspension": "Suspension straps",
  "stability-ball": "Stability ball",
  "rings": "Gymnastic rings",
  "plates": "Weight plates",
  "dip-station": "Dip station",
  "lat-pulldown": "Lat pulldown machine",
  "hack-squat": "Hack squat machine",
  "standing-calf-machine": "Standing calf machine",
  "shoulder-press": "Shoulder press machine",
  "lateral-raise-machine": "Lateral raise machine",
  "ab-wheel": "Ab wheel",
  "assisted-dip": "Assisted dip machine",
  "assisted-pullup": "Assisted pull-up machine",
  "trap-bar": "Trap bar",
  "hip-abduction": "Hip abduction machine",
  "hip-adduction": "Hip adduction machine",
  "back-extension-machine": "Back extension machine",
  "biceps-machine": "Biceps curl machine",
  "pec-deck": "Pec deck / fly machine",
  "preacher-machine": "Preacher curl machine",
  "ab-machine": "Ab crunch machine",
  "triceps-machine": "Triceps extension machine",
  "nordic-bench": "Nordic curl bench",
  "donkey-calf-machine": "Donkey calf machine",
  "glute-drive": "Glute drive machine",
  "shrug-machine": "Shrug machine",
  "seated-calf-machine": "Seated calf machine",
  "wrist-roller": "Wrist roller",
  "seated-leg-curl": "Seated leg curl",
  "roman-chair": "Back extension bench",
  "captains-chair": "Captain\u2019s chair",
  "preacher-bench": "Preacher bench",
  "decline-bench": "Decline bench",
  "adjustable-bench": "Adjustable bench",
  "landmine": "Landmine attachment",
  "air-bike": "Air bike",
  "battle-ropes": "Battle ropes",
  "plyo-box": "Plyo box",
  "treadmill": "Treadmill",
  "elliptical": "Elliptical trainer",
  "jump-rope": "Jump rope",
  "slam-ball": "Slam ball",
  "rower": "Rowing ergometer",
  "sled": "Weight sled",
  "stair-climber": "Stair climber",
  "stationary-bike": "Stationary bike",


};
export type Level = "beginner" | "intermediate" | "advanced";
export type Pattern =
  "squat" | "hinge" | "push" | "pull" | "core" | "accessory";
// "open" days have no preset focus: the model chooses each move, or rest, on the day.
export type Focus = "full" | "upper" | "lower" | "open" | "custom";
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type DayPlan = { focus: 'full' | 'upper' | 'lower' | 'open' | 'rest' } | { focus: 'custom'; muscles: Muscle[] };
export type WeeklySchedule = Record<Weekday, DayPlan>;
export const routineLabels = { full: 'Full body', split: 'Splits', kwik: 'Kwik Pick', custom: 'Custom week' };
export type Rejection =
  "busy" | "unavailable" | "sore" | "advanced" | "today" | "dislike" | "setup" | "floor" | "crowded" | "repetitive";
export const INTENTS = ["auto", "easy", "challenge", "familiar", "surprise"] as const;
export type DailyIntent = (typeof INTENTS)[number];
export const intentLabels: Record<DailyIntent, string> = { auto: "Choose for me", easy: "Keep it easy", challenge: "Challenge me", familiar: "Keep it familiar", surprise: "Surprise me" };
export const SESSION_STYLES = ["balanced", "quiet", "minimal", "discovery", "familiar"] as const;
export type SessionStyle = (typeof SESSION_STYLES)[number];
export const styleLabels: Record<SessionStyle, string> = { balanced: "A balanced mix", quiet: "Quiet & steady", minimal: "Less setup", discovery: "A little discovery", familiar: "Familiar favorites" };
export interface Exercise {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment[];
  level: Level;
  pattern: Pattern;
  reps: number;
  seconds?: number;
  unilateral?: boolean;
  rest: number;
  steps: string[];
  tip: string;
  alternative?: string;
  sourceId?: string;
  conditioning?: boolean;
  traits?: { floor: boolean; quiet: boolean; setup: "simple" | "involved" };
}
export interface Place {
  id: string;
  name: string;
  kind: "bedroom" | "home" | "gym" | "other";
  equipment: Equipment[];
}
export interface Profile {
  weightUnit?: 'lb' | 'kg';
  level: Level;
  routine: "full" | "split" | "kwik" | "custom";
  schedule?: WeeklySchedule;
  weeklyGoal: number;
}
export interface SetLog {
  reps: number;
  weight: number;
  effort: "easy" | "right" | "hard";
  at: number;
}
export interface Performed {
  exerciseId: string;
  sets: SetLog[];
  plannedSets: number;
  /** history: last logged weight; laya: a model-approved increase; estimate: a first-time starting weight. */
  load?: { previous?: number; suggested: number; source: 'history' | 'laya' | 'estimate' };
  /** Reps suggested for the next set: the planned target or, when Laya chooses it, fewer. */
  repTarget?: { target: number; suggested: number; source: 'plan' | 'laya' };
}
// 1 light, 2 medium, 3 very sore. A muscle listed as sore without a level is very sore,
// which is how every check-in was treated before levels existed.
export type SoreLevel = 1 | 2 | 3;
export type SoreLevels = Partial<Record<Muscle, SoreLevel>>;
export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  locationId: string;
  locationName: string;
  minutes: number;
  focus: Focus;
  targets: Muscle[];
  sore: Muscle[];
  soreLevels?: SoreLevels;
  excluded: string[];
  unavailableEquipment: Equipment[];
  completed: Performed[];
  current: Performed | null;
  restUntil: number | null;
  warmupDone: boolean;
  engine: "rules" | "laya";
  intent?: DailyIntent;
  style?: SessionStyle;
}
export interface Feedback {
  exerciseId: string;
  reason: Rejection;
  locationId: string;
  at: number;
}
export interface Billing {
  active: boolean;
  expiresAt: number | null;
  verifiedAt: number;
  managementURL: string | null;
}
export interface CheckIn {
  day: string;
  sore: Muscle[];
  soreLevels?: SoreLevels;
  pain: boolean;
  intent?: DailyIntent;
}
export interface AppData {
  version: 1;
  profile: Profile | null;
  locations: Place[];
  selectedLocationId: string;
  history: Session[];
  session: Session | null;
  feedback: Feedback[];
  /** Recommendations actually revealed, collected locally from this version onward. */
  recommendations?: { exerciseId: string; sessionId: string; locationId: string; at: number }[];
  disliked: string[];
  tooAdvanced: string[];
  trialStartedAt: number | null;
  lastSeenAt: number;
  billing: Billing | null;
  checkIn?: CheckIn | null;
  workoutOverride?: { day: string; plan: DayPlan } | null;
  /** The app's train-or-rest call for a scheduled open day, tied to that day's check-in. */
  restDecision?: { day: string; basis: string; rest: boolean } | null;
}
export const initialData: AppData = {
  version: 1,
  profile: null,
  locations: [
    { id: "bedroom", name: "My bedroom", kind: "bedroom", equipment: [] },
    {
      id: "home",
      name: "Home gym",
      kind: "home",
      equipment: ["mat", "dumbbells"],
    },
  ],
  selectedLocationId: "bedroom",
  history: [],
  session: null,
  feedback: [],
  disliked: [],
  tooAdvanced: [],
  trialStartedAt: null,
  lastSeenAt: 0,
  billing: null,
  checkIn: null,
};
export const focusLabels: Record<Focus, string> = {
  full: "Full body",
  upper: "Upper body",
  lower: "Legs & Core",
  open: "Kwik Pick",
  custom: "My muscle groups",
};
export const focusTargets: Record<Exclude<Focus, "custom">, Muscle[]> = {
  full: [...MUSCLES],
  open: [...MUSCLES],
  upper: ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "core"],
  lower: ["glutes", "quads", "hamstrings", "calves", "inner-thighs", "hips", "core"],
};
export const titleCase = (s: string) => s === "inner-thighs" ? "Inner thighs" : s === "hips" ? "Hip flexors" : s.charAt(0).toUpperCase() + s.slice(1);
