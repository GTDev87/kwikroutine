import { levelsOf, soreLevel, soreLevelLabels } from "../domain/soreness";
import { DailyIntent } from "../components/DailyIntent";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import {
  Button,
  C,
  Heading,
  Label,
  LogoMark,
  R,
  SectionHeader,
  T,
  Tag,
  TextLink,
  fonts,
  s,
  sizes,
} from "../components/ui";
import { useStore } from "../state/store";
import { access, eligible, newSession } from "../domain/engine";
import { focusLabels, equipmentLabels } from "../domain/types";
import { muscleName, todayCheckIn, todayFocus } from "../domain/today";

const TIMES = [15, 20, 30, 45, 60];
const greeting = (h: number) =>
  h < 5 ? "Evening" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
function Choice({
  on,
  onPress,
  children,
  label,
  style,
}: {
  on: boolean;
  onPress: () => void;
  children: React.ReactNode;
  label: string;
  style?: object;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      {...(Platform.OS === "web" ? { "aria-checked": on } : {})}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: R.control,
          backgroundColor: C.surface,
          borderWidth: 2,
          borderColor: on ? C.accent : C.line,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
export function Today({ go }: { go: (route: string) => void }) {
  const { data, update } = useStore();
  const [minutes, setMinutes] = useState(data.history.at(-1)?.minutes ?? 30),
    [message, setMessage] = useState("");
  const membership = access(data),
    checkIn = todayCheckIn(data),
    plan = todayFocus(data, checkIn.sore, Date.now(), checkIn.soreLevels);
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const start = () => {
    if (plan.rest) return;
    if (!membership.allowed) return go("paywall");
    const session = newSession(data, minutes, plan.focus, plan.targets, checkIn.sore, Date.now(), levelsOf(checkIn));
    if (!eligible(data, session).length) {
      setMessage(
        "Nothing fits this combination today. Try more time, another place, or take a rest day.",
      );
      return;
    }
    setMessage("");
    update((d) => ({ ...d, session }));
    go("workout");
  };
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View
        style={[
          s.between,
          { paddingHorizontal: 24, paddingTop: 12, alignItems: "flex-start" },
        ]}
      >
        <View>
          <T style={{ color: C.muted, fontSize: 14 }}>{date}</T>
          <Heading size={sizes.title} style={{ marginTop: 4 }}>
            {greeting(now.getHours())}
          </Heading>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => go("profile")}
        >
          <LogoMark size={40} />
        </Pressable>
      </View>
      {data.session ? (
        <View style={[card, { gap: 10 }]}>
          <Label color={C.accent}>In progress</Label>
          <Heading size={sizes.card}>{focusLabels[data.session.focus]}</Heading>
          <T style={s.muted}>
            {data.session.completed.length} of your moves done at{" "}
            {data.session.locationName}. Pick up where you left off.
          </T>
          <Button
            title="Continue my workout"
            onPress={() => go("workout")}
            style={{ marginTop: 6 }}
          />
        </View>
      ) : plan.rest ? (
        <View style={[card, { gap: 16 }]}>
          <View style={s.between}>
            <Label color={C.accent}>Today’s plan</Label>
            <TextLink title="Edit week" label="Edit weekly plan" onPress={() => go("routine")} />
          </View>
          <Heading size={sizes.card}>Rest day</Heading>
          <T style={s.muted}>{plan.why}</T>
          <Button title="Change today" secondary onPress={() => go("today-style")} />
        </View>
      ) : (
        <>
          <View style={card}>
            <View style={s.between}>
              <Label color={C.accent}>Today’s focus</Label>
              <TextLink title="Change" label="Change today" onPress={() => go("today-style")} />
            </View>
            <Heading size={sizes.card} style={{ marginTop: 6 }}>
              {focusLabels[plan.focus]}
            </Heading>
            <View style={[s.wrap, { marginTop: 12, gap: 6 }]}>
              {(plan.focus === "open" ? ["Decided move by move"] : plan.focus === "full" ? [
                ...(plan.targets.some(m => ["chest", "back", "shoulders", "biceps", "triceps", "forearms"].includes(m)) ? ["Upper body"] : []),
                ...(plan.targets.some(m => ["glutes", "quads", "hamstrings", "calves", "inner-thighs", "hips"].includes(m)) ? ["Legs & hips"] : []),
                ...(plan.targets.includes("core") ? ["Core"] : []),
              ] : plan.targets.map(muscleName)).map(label => <Tag key={label} label={label} />)}
            </View>
            <View
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: C.line2,
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <T style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>
                <T style={{ color: C.muted, fontSize: 14 }}>Sore: </T>
                <T style={{ fontFamily: fonts.semibold, fontSize: 14 }}>
                  {checkIn.sore.length
                    ? checkIn.sore
                        .map((m) => `${muscleName(m)} (${soreLevelLabels[soreLevel(checkIn, m)].toLowerCase()})`)
                        .join(", ")
                    : "Nothing"}
                </T>
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Update soreness"
                hitSlop={10}
                onPress={() => go("checkin")}
              >
                <T
                  style={{
                    color: C.accent,
                    fontFamily: fonts.semibold,
                    fontSize: 14,
                  }}
                >
                  Update
                </T>
              </Pressable>
            </View>
            {!!plan.why && (
              <T style={[s.small, s.muted, { marginTop: 10 }]}>{plan.why}</T>
            )}
          </View>
          <View style={section}>
            <SectionHeader
              title="Where are you today?"
              action={{ title: "Add place", label: "Add a place", onPress: () => go("places?add=1") }}
            />
            <View style={s.wrap}>
              {data.locations.map((p) => (
                <Choice
                  key={p.id}
                  label={p.name}
                  on={p.id === data.selectedLocationId}
                  onPress={() =>
                    update((d) => ({ ...d, selectedLocationId: p.id }))
                  }
                  style={{ padding: 14, flexGrow: 1, flexBasis: "45%" }}
                >
                  <T
                    style={{ fontSize: 16, fontFamily: fonts.semibold }}
                    numberOfLines={1}
                  >
                    {p.name}
                  </T>
                  <T
                    style={[s.small, s.muted, { marginTop: 3 }]}
                    numberOfLines={1}
                  >
                    {p.equipment.length
                      ? p.kind === "gym" && p.equipment.length >= 8
                        ? "Full equipment"
                        : p.equipment.map((e) => equipmentLabels[e]).join(", ")
                      : "Just your body"}
                  </T>
                </Choice>
              ))}
            </View>
          </View>
          <View style={section}>
            <SectionHeader title="How much time do you have?" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {TIMES.map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityLabel={`${n} minutes`}
                  accessibilityState={{ checked: minutes === n }}
                  onPress={() => setMinutes(n)}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: R.control,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: minutes === n ? C.accentSoft : C.surface,
                    borderWidth: 1.5,
                    borderColor: minutes === n ? C.accent : C.line,
                  }}
                >
                  <T
                    style={{
                      fontSize: 18,
                      lineHeight: 22,
                      fontFamily: fonts.bold,
                      color: C.ink,
                    }}
                  >
                    {n}
                  </T>
                  <T
                    style={{
                      fontSize: 11,
                      lineHeight: 13,
                      color: C.muted,
                    }}
                  >
                    min
                  </T>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={section}><DailyIntent /></View>
          <View style={[section, { paddingTop: 32 }]}>
            {!!message && (
              <T
                accessibilityRole="alert"
                style={{ color: C.danger, fontSize: 14 }}
              >
                {message}
              </T>
            )}
            {checkIn.pain ? (
              <T style={{ color: C.danger, fontSize: 14, lineHeight: 20 }}>
                You reported pain today, so there’s no workout. Get it checked
                before training through it. Changed your mind?{" "}
                <T
                  onPress={() => go("checkin")}
                  style={{ color: C.accent, fontSize: 14, fontFamily: fonts.semibold }}
                >
                  Update check-in
                </T>
              </T>
            ) : (
              <Button
                title={
                  membership.allowed
                    ? "Reveal first exercise"
                    : "Keep my routine going"
                }
                onPress={start}
              />
            )}
            <T style={{ textAlign: "center", color: C.muted, fontSize: 13 }}>
              {membership.allowed
                ? "You’ll find out each move as you go."
                : "Your free days have finished."}
            </T>
          </View>
        </>
      )}
      {!membership.paid && membership.allowed && (
        <View style={[s.row, { justifyContent: "center", gap: 6, marginTop: 18 }]}>
          <T style={{ color: C.faint, fontSize: 13 }}>
            {membership.trialLeft} free {membership.trialLeft === 1 ? "day" : "days"} left
          </T>
          <TextLink title="See plans" onPress={() => go("paywall")} />
        </View>
      )}
    </ScrollView>
  );
}
const section = { paddingHorizontal: 24, paddingTop: 28, gap: 12 } as const;
const card = {
  marginHorizontal: 20,
  marginTop: 20,
  padding: 20,
  borderRadius: R.card,
  backgroundColor: C.surface,
  borderWidth: 1,
  borderColor: C.line2,
} as const;
