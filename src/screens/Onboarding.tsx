import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { HeroArt } from "../components/art";
import { BodyMap } from "../components/BodyMap";
import { PainCheck } from "../components/PainCheck";
import {
  EquipmentGrid,
  EXTRA_GYM_EQUIPMENT,
  EXTRA_HOME_EQUIPMENT,
  GYM_EQUIPMENT,
  GYM_FREE,
  GYM_MACHINES,
  HOME_EQUIPMENT,
} from "../components/EquipmentGrid";
import {
  Button,
  C,
  Check,
  Heading,
  Icon,
  LevelBars,
  Logo,
  OptionCard,
  PageTitle,
  Placeholder,
  R,
  StepBar,
  T,
  Toggle,
  fonts,
  s,
  sizes,
} from "../components/ui";
import { useStore } from "../state/store";
import { Equipment, Level, Muscle, Place } from "../domain/types";
import { dayKey } from "../domain/today";

type Step = "welcome" | "level" | "style" | "where" | "home" | "gym" | "sore";
const levels: [Level, string, string][] = [
  [
    "beginner",
    "I’m new to this",
    "Bodyweight and simple moves, with form tips on every exercise.",
  ],
  [
    "intermediate",
    "Some experience",
    "I know the basics. Mix in dumbbells and machines.",
  ],
  [
    "advanced",
    "Experienced",
    "Barbells, complex lifts and higher volume are fine.",
  ],
];
const week = ["M", "T", "W", "T", "F", "S", "S"];
function Week({ days }: { days: string[] }) {
  return (
    <View style={{ marginTop: 16, gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {week.map((d, i) => (
          <T
            key={i}
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: fonts.mono,
              fontSize: 11,
              color: C.muted,
            }}
          >
            {d}
          </T>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {days.map((d, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 30,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: d === "All" ? C.accentSoft : C.surface2,
            }}
          >
            <T
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: d === "All" ? C.accent : C.muted,
              }}
            >
              {d}
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}
function Intro({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body: string;
}) {
  return <PageTitle eyebrow={eyebrow} title={title} subtitle={body} />;
}
export function Onboarding() {
  const { update } = useStore();
  const [step, setStep] = useState<Step>("welcome"),
    [level, setLevel] = useState<Level>("beginner"),
    [routine, setRoutine] = useState<"full" | "split">("full"),
    [home, setHome] = useState(true),
    [gym, setGym] = useState(false),
    [homeEq, setHomeEq] = useState<Equipment[]>(["mat", "dumbbells", "bands"]),
    [gymEq, setGymEq] = useState<Equipment[]>(GYM_EQUIPMENT),
    [sore, setSore] = useState<Muscle[]>([]),
    [pain, setPain] = useState(false);
  const flow: Step[] = [
    "welcome",
    "level",
    "style",
    "where",
    ...(home ? (["home"] as Step[]) : []),
    ...(gym ? (["gym"] as Step[]) : []),
    "sore",
  ];
  const at = flow.indexOf(step);
  const next = () => setStep(flow[at + 1]);
  const back = () => setStep(flow[at - 1]);
  const progress =
    step === "level" ? 1 : step === "style" ? 2 : step === "sore" ? 4 : 3;
  const finish = (withCheckIn: boolean) => {
    const locations: Place[] = [
      ...(home
        ? [
            {
              id: "home",
              name: "Home",
              kind: "home" as const,
              equipment: homeEq,
            },
          ]
        : []),
      ...(gym
        ? [{ id: "gym", name: "Gym", kind: "gym" as const, equipment: gymEq }]
        : []),
    ];
    update((d) => ({
      ...d,
      profile: { level, routine, weeklyGoal: d.profile?.weeklyGoal ?? 3 },
      locations: locations.length ? locations : d.locations,
      selectedLocationId: locations[0]?.id ?? d.selectedLocationId,
      checkIn: withCheckIn ? { day: dayKey(), sore, pain } : null,
      trialStartedAt: d.trialStartedAt ?? Date.now(),
      lastSeenAt: Math.max(d.lastSeenAt, Date.now()),
    }));
  };
  if (step === "welcome")
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 28, paddingTop: 12 }}>
          <Logo />
        </View>
        {/* Hero photo slot: someone training at home. */}
        <Placeholder
          radius={28}
          style={{
            flex: 1,
            marginHorizontal: 20,
            marginTop: 24,
            justifyContent: "center",
          }}
        >
          <HeroArt height={240} />
        </Placeholder>
        <View style={{ paddingHorizontal: 28, paddingTop: 28, gap: 12 }}>
          <Heading size={sizes.display}>
            A fresh workout every day, built around how you feel.
          </Heading>
          <T style={{ fontSize: 16, lineHeight: 23, color: C.muted }}>
            Tell us what’s sore and how much time you have. We’ll pick the
            moves.
          </T>
        </View>
        <View style={{ padding: 24, paddingBottom: 28, gap: 14 }}>
          <Button title="Get started" onPress={next} />
          <T style={{ textAlign: "center", color: C.muted, fontSize: 14 }}>
            14 days free · No account or payment details
          </T>
        </View>
      </View>
    );
  const footer = (
    <View
      style={{
        padding: 24,
        paddingTop: 12,
        gap: 14,
        borderTopWidth: step === "home" || step === "gym" ? 1 : 0,
        borderTopColor: C.line2,
      }}
    >
      {step === "level" && (
        <T style={{ textAlign: "center", color: C.muted, fontSize: 14 }}>
          You can change this anytime.
        </T>
      )}
      {step === "sore" ? (
        <Button title="Continue" onPress={() => finish(true)} />
      ) : (
        <Button
          title="Continue"
          disabled={step === "where" && !home && !gym}
          onPress={next}
        />
      )}
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <StepBar
        onBack={back}
        step={progress}
        action={
          step === "sore"
            ? { label: "Skip", onPress: () => finish(false) }
            : undefined
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 20, gap: 24 }}
      >
        {step === "level" && (
          <>
            <Intro
              eyebrow="Step 1 of 4"
              title="How much have you trained before?"
              body="This keeps technical lifts out until you’re ready."
            />
            <View style={{ gap: 12 }}>
              {levels.map(([l, title, body], i) => (
                <OptionCard
                  key={l}
                  title={title}
                  subtitle={body}
                  selected={level === l}
                  onPress={() => setLevel(l)}
                  trailing={<LevelBars level={(i + 1) as 1 | 2 | 3} />}
                />
              ))}
            </View>
          </>
        )}
        {step === "style" && (
          <>
            <Intro
              eyebrow="Step 2 of 4"
              title="How do you want to train?"
              body="You can switch any day."
            />
            <View style={{ gap: 14 }}>
              <OptionCard
                title="Full body"
                subtitle="Every session hits everything. Good for 2–3 days a week."
                selected={routine === "full"}
                onPress={() => setRoutine("full")}
              >
                <Week days={["All", "", "All", "", "All", "", ""]} />
              </OptionCard>
              <OptionCard
                title="Split"
                subtitle="Upper body one day, legs and core the next. Good for 4 or more days a week."
                selected={routine === "split"}
                onPress={() => setRoutine("split")}
              >
                <Week days={["Up", "Leg", "", "Up", "Leg", "", ""]} />
              </OptionCard>
            </View>
          </>
        )}
        {step === "where" && (
          <>
            <Intro
              eyebrow="Step 3 of 4"
              title="Where do you usually work out?"
              body="Pick both if you switch. You’ll confirm each day."
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(
                [
                  ["At home", "home", home, setHome],
                  ["At a gym", "gym", gym, setGym],
                ] as const
              ).map(([title, icon, on, set]) => (
                <Pressable
                  key={title}
                  accessibilityRole="checkbox"
                  accessibilityLabel={title}
                  accessibilityState={{ checked: on }}
                  onPress={() => set(!on)}
                  style={{
                    flex: 1,
                    borderRadius: R.card,
                    backgroundColor: C.surface,
                    borderWidth: 2,
                    borderColor: on ? C.accent : C.line,
                    padding: 6,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      height: 96,
                      borderRadius: R.card - 6,
                      backgroundColor: C.plate,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={icon} color={C.plateIcon} size={36} />
                  </View>
                  <View
                    style={[
                      s.between,
                      { paddingHorizontal: 8, paddingBottom: 8 },
                    ]}
                  >
                    <T style={{ fontSize: 17, fontFamily: fonts.semibold }}>
                      {title}
                    </T>
                    <Check on={on} />
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {step === "home" && (
          <>
            <Intro
              eyebrow="Step 3 of 4 · Home"
              title="What do you have at home?"
              body="From a living room to a full home gym. Choose any equipment you have."
            />
            <EquipmentGrid
              items={HOME_EQUIPMENT}
              selected={homeEq}
              onChange={setHomeEq}
              bodyweightTile
            />
            <EquipmentGrid
              title="Machines & more equipment"
              items={EXTRA_HOME_EQUIPMENT}
              selected={homeEq}
              onChange={setHomeEq}
              initiallyCollapsed
            />
          </>
        )}
        {step === "gym" && (
          <>
            <Intro
              eyebrow="Step 3 of 4 · Gym"
              title="What’s at your gym?"
              body="Most gyms have these. Untick anything yours is missing."
            />
            <View
              style={[
                s.between,
                {
                  padding: 14,
                  paddingHorizontal: 16,
                  borderRadius: R.card,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.line2,
                },
              ]}
            >
              <View>
                <T style={{ fontSize: 16, fontFamily: fonts.semibold }}>
                  Common gym equipment
                </T>
                <T style={[s.small, s.muted]}>
                  {GYM_EQUIPMENT.filter(e => gymEq.includes(e)).length} of {GYM_EQUIPMENT.length} selected
                </T>
              </View>
              <Toggle
                label="Common gym equipment"
                value={GYM_EQUIPMENT.every(e => gymEq.includes(e))}
                onChange={(all) => setGymEq(all ? [...new Set([...gymEq, ...GYM_EQUIPMENT])] : gymEq.filter(e => !GYM_EQUIPMENT.includes(e)))}
              />
            </View>
            <EquipmentGrid
              title="Machines"
              items={GYM_MACHINES}
              selected={gymEq}
              onChange={setGymEq}
            />
            <EquipmentGrid
              title="Free weights & racks"
              items={GYM_FREE}
              selected={gymEq}
              onChange={setGymEq}
            />
            <EquipmentGrid title="More machines & equipment" items={EXTRA_GYM_EQUIPMENT} selected={gymEq} onChange={setGymEq} initiallyCollapsed />
          </>
        )}
        {step === "sore" && (
          <>
            <Intro
              eyebrow="Step 4 of 4"
              title="Anything sore right now?"
              body="Tap where you feel it. We’ll give those muscles a rest."
            />
            <BodyMap selected={sore} onChange={setSore} />
            <PainCheck value={pain} onChange={setPain} />
          </>
        )}
      </ScrollView>
      {footer}
    </View>
  );
}
