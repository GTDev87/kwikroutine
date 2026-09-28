import { weightUnit } from "../domain/weightUnits";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import {
  C,
  Chip,
  Label,
  ListGroup,
  ListRow,
  LogoMark,
  T,
  Tape,
  s,
} from "../components/ui";
import { Aurora, Chroma, Rise } from "../components/motion";
import { useStore } from "../state/store";
import { Level, equipmentLabels, titleCase, routineLabels } from "../domain/types";
import { exerciseById } from "../data/exercises";
import { access } from "../domain/engine";
import { layaStatus } from "../services/laya";

const levelNames: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Some experience",
  advanced: "Experienced",
};
const styleNames = routineLabels;
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ paddingHorizontal: 4, gap: 2 }}>
        <Label>{title}</Label>
        {!!hint && <T style={[s.small, s.muted]}>{hint}</T>}
      </View>
      {children}
    </View>
  );
}
export function Profile({ go }: { go: (route: string) => void }) {
  const { data, update } = useStore();
  const [open, setOpen] = useState<"level" | "goal" | "weight" | null>(null),
    [confirm, setConfirm] = useState(false);
  const profile = data.profile!;
  const membership = access(data);
  const setProfile = (patch: Partial<typeof profile>) =>
    update((d) => ({ ...d, profile: { ...d.profile!, ...patch } }));
  const toggle = (k: typeof open) => setOpen(open === k ? null : k);
  const skipped = [
    ...data.tooAdvanced.map((id) => ({
      id,
      why: "Too advanced",
      list: "tooAdvanced" as const,
    })),
    ...data.disliked.map((id) => ({
      id,
      why: "Not for you",
      list: "disliked" as const,
    })),
  ].filter((x) => exerciseById[x.id]);
  const picker = (children: React.ReactNode) => (
    <View style={[s.wrap, { paddingHorizontal: 16, paddingBottom: 14 }]}>
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
    <Aurora colors={[C.accent, C.violet, C.cyan]} intensity={0.18} height={300} />
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingTop: 14, gap: 22 }}
    >
      <Rise style={[s.row, { gap: 16, paddingHorizontal: 4 }]}>
        <View style={{ transform: [{ rotate: "-6deg" }], boxShadow: "0 10px 30px rgba(192,244,71,0.25)", borderRadius: 18 }}>
          <LogoMark size={64} />
        </View>
        <View style={{ gap: 6 }}>
          <Chroma size={40} echoes={[C.violet, C.accent]}>Profile</Chroma>
          <Tape color={C.surface2} ink={C.muted}>
            {levelNames[profile.level]} · {styleNames[profile.routine]}
          </Tape>
        </View>
      </Rise>
      <Section title="Training">
        <ListGroup>
          <View>
            <ListRow
              title="Experience"
              value={levelNames[profile.level]}
              onPress={() => toggle("level")}
            />
            {open === "level" &&
              picker(
                (["beginner", "intermediate", "advanced"] as Level[]).map(
                  (level) => (
                    <Chip
                      key={level}
                      small
                      label={levelNames[level]}
                      selected={profile.level === level}
                      onPress={() => setProfile({ level })}
                    />
                  ),
                ),
              )}
          </View>
          <View>
            <ListRow title="Weight units" value={weightUnit(profile) === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'} onPress={() => toggle('weight')} />
            {open === 'weight' && picker((['lb', 'kg'] as const).map(unit => (
              <Chip key={unit} small label={unit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                selected={weightUnit(profile) === unit} onPress={() => setProfile({weightUnit: unit})} />
            )))}
          </View>
          <ListRow title="Workout style" value={styleNames[profile.routine]}
            subtitle="Full body, splits, or your own weekly plan"
            onPress={() => go("routine")} />
          <View>
            <ListRow
              title="Weekly goal"
              value={`${profile.weeklyGoal} days`}
              onPress={() => toggle("goal")}
            />
            {open === "goal" &&
              picker(
                [2, 3, 4, 5].map((weeklyGoal) => (
                  <Chip
                    key={weeklyGoal}
                    small
                    label={`${weeklyGoal} days`}
                    selected={profile.weeklyGoal === weeklyGoal}
                    onPress={() => setProfile({ weeklyGoal })}
                  />
                )),
              )}
          </View>
        </ListGroup>
      </Section>
      <Section title="Places & equipment">
        <ListGroup>
          {data.locations.map((p) => (
            <ListRow
              key={p.id}
              title={p.name}
              accessibilityLabel={`Places: ${p.name}`}
              value={
                p.equipment.length
                  ? p.kind === "gym" && p.equipment.length >= 8
                    ? "Full equipment"
                    : p.equipment.map((e) => equipmentLabels[e]).join(", ")
                  : "Just your body"
              }
              onPress={() => go("places")}
            />
          ))}
          <ListRow title="Add or edit places" onPress={() => go("places")} />
        </ListGroup>
      </Section>
      <Section
        title="Skipped exercises"
        hint={
          skipped.length
            ? "Reset one to see it again."
            : "Exercises you hide while skipping show up here."
        }
      >
        {!!skipped.length && (
          <ListGroup>
            {skipped.map(({ id, why, list }) => (
              <ListRow
                key={`${list}-${id}`}
                title={exerciseById[id].name}
                subtitle={`${why} · ${titleCase(exerciseById[id].level)}`}
                action="Reset"
                onPress={() =>
                  update((d) => ({
                    ...d,
                    [list]: d[list].filter((x) => x !== id),
                  }))
                }
              />
            ))}
          </ListGroup>
        )}
      </Section>
      <Section title="Membership">
        <ListGroup>
          <ListRow
            title={
              membership.paid
                ? "Subscription active"
                : `${membership.trialLeft} free days left`
            }
            value="$2.99/mo or $19.99/yr"
            onPress={() => go("paywall")}
          />
        </ListGroup>
      </Section>
      <Section title="More">
        <ListGroup>
          {data.feedback.some(f => ["setup", "floor", "crowded", "repetitive"].includes(f.reason)) && <ListRow title="Reset learned preferences" subtitle="Forget setup, floor, crowding and variety feedback" onPress={() => update(d => ({...d, feedback: d.feedback.filter(f => !["setup", "floor", "crowded", "repetitive"].includes(f.reason))}))} />}
          <ListRow title="Exercise library" onPress={() => go("library")} />
          <ListRow title="Privacy & terms" onPress={() => go("privacy")} />
          <ListRow
            title={
              confirm
                ? "Tap again to erase workout history"
                : "Clear workout history"
            }
            accessibilityLabel={
              confirm ? "Confirm: erase workout history" : "Clear history"
            }
            onPress={() => {
              if (!confirm) return setConfirm(true);
              update((d) => ({ ...d, history: [], feedback: [], recommendations: [] }));
              setConfirm(false);
            }}
          />
          {confirm && (
            <ListRow
              title="Keep my history"
              onPress={() => setConfirm(false)}
            />
          )}
        </ListGroup>
        <T style={[s.small, { color: C.faint, paddingHorizontal: 4 }]}>
          Clearing erases completed workouts and skip feedback from this device.
          Places, trial, and subscription stay.
        </T>
      </Section>
      {__DEV__ && (
        <T style={[s.small, { color: C.faint, textAlign: "center" }]}>
          Development build · {layaStatus()}
        </T>
      )}
    </ScrollView>
    </View>
  );
}
