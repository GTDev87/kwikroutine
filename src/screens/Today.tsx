import { levelsOf, soreLevel, soreLevelLabels } from "../domain/soreness";
import { DailyIntent } from "../components/DailyIntent";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  Button,
  C,
  Icon,
  IconName,
  LogoMark,
  R,
  SectionHeader,
  T,
  Tape,
  TextLink,
  focusTheme,
  fonts,
  s,
} from "../components/ui";
import { Aurora, Chroma, Float, LiveDot, ND, Rise, Squish } from "../components/motion";
import { Poster } from "../components/Poster";
import { useStore } from "../state/store";
import { access, eligible, newSession, weekCount } from "../domain/engine";
import { focusLabels, equipmentLabels } from "../domain/types";
import { dayKey, muscleName, restBasis, restPending, todayCheckIn, todayFocus } from "../domain/today";
import { chooseRest } from "../services/restSelection";

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
    <Squish
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      {...(Platform.OS === "web" ? { "aria-checked": on } : {})}
      onPress={onPress}
      style={[
        {
          borderRadius: R.card,
          backgroundColor: on ? "#1A1F12" : C.surface,
          borderWidth: 2,
          borderColor: on ? C.accent : C.line,
          ...(on ? { boxShadow: "0 8px 24px rgba(192,244,71,0.16)" } : {}),
        },
        style,
      ]}
    >
      {children}
    </Squish>
  );
}
// Mon–Sun as slanted bars: lit when you trained, outlined for today.
function WeekStrip({ history, goal, week }: { history: { startedAt: number; endedAt?: number | null }[]; goal: number; week: number }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const trained = new Set(history.map((h) => dayKey(h.endedAt ?? h.startedAt)));
  return (
    <View
      accessible
      accessibilityLabel={`${week} of ${goal} workouts this week`}
      style={[s.row, { gap: 14 }]}
    >
      <View style={{ flexDirection: "row", gap: 5, alignItems: "flex-end", transform: [{ skewX: "-16deg" }] }}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const done = trained.has(dayKey(d)),
            isToday = d.getTime() === today.getTime();
          return (
            <View
              key={i}
              style={{
                width: 11,
                height: done ? 24 : 16,
                borderRadius: 2,
                backgroundColor: done ? C.accent : d > today ? C.surface2 : C.line,
                borderWidth: isToday && !done ? 1.5 : 0,
                borderColor: C.accent,
                ...(done ? { boxShadow: "0 0 10px rgba(192,244,71,0.5)" } : {}),
              }}
            />
          );
        })}
      </View>
      <T style={{ fontSize: 13, color: C.muted, fontFamily: fonts.medium }}>
        <T style={{ fontSize: 13, color: C.ink, fontFamily: fonts.bold }}>{week}</T> of {goal} this week
      </T>
    </View>
  );
}
// Sliding time selector: a lime slab glides to the chosen length.
function TimePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [w, setW] = useState(0);
  const index = Math.max(0, TIMES.indexOf(value));
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: index, friction: 7, tension: 90, useNativeDriver: ND }).start();
  }, [index, x]);
  const slot = w / TIMES.length;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width - 10)}
      style={{
        flexDirection: "row",
        padding: 5,
        borderRadius: R.card,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      {w > 0 && (
        <Animated.View
          style={{
            position: "absolute",
            top: 5,
            bottom: 5,
            left: 5,
            width: slot,
            borderRadius: R.control,
            backgroundColor: C.accent,
            boxShadow: "0 6px 18px rgba(192,244,71,0.35)",
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, slot] }) }],
          }}
        />
      )}
      {TIMES.map((n) => {
        const on = value === n;
        return (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityLabel={`${n} minutes`}
            accessibilityState={{ checked: on }}
            onPress={() => onChange(n)}
            style={{ flex: 1, height: 60, alignItems: "center", justifyContent: "center" }}
          >
            <T
              style={{
                fontSize: on ? 24 : 19,
                lineHeight: 26,
                fontFamily: fonts.black,
                letterSpacing: -0.6,
                color: on ? C.onAccent : C.ink,
              }}
            >
              {n}
            </T>
            <T style={{ fontSize: 11, lineHeight: 13, color: on ? "rgba(13,13,14,0.65)" : C.muted, fontFamily: fonts.medium }}>
              min
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
// A little crescent moon and drifting z's for rest days.
function Sleepy() {
  return (
    <View style={{ position: "absolute", right: 18, top: 16, width: 110, height: 110, pointerEvents: "none" }}>
      <Float distance={6} duration={2600} rotate={4}>
        <Svg width={84} height={84} viewBox="0 0 24 24">
          <Path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="#C3AEFF" />
        </Svg>
      </Float>
      {["z", "z", "Z"].map((z, i) => (
        <Float key={i} distance={10 + i * 4} duration={1800 + i * 500} style={{ position: "absolute", left: 70 + i * 12, top: 8 - i * 14 }}>
          <T style={{ fontFamily: fonts.black, fontSize: 14 + i * 5, color: "rgba(255,255,255,0.6)" }}>{z}</T>
        </Float>
      ))}
    </View>
  );
}
const placeIcon = (kind: string): IconName => (kind === "gym" ? "gym" : "home");
export function Today({ go }: { go: (route: string) => void }) {
  const { data, update } = useStore();
  const [minutes, setMinutes] = useState(data.history.at(-1)?.minutes ?? 30),
    [message, setMessage] = useState("");
  const membership = access(data),
    checkIn = todayCheckIn(data),
    plan = todayFocus(data, checkIn.sore, Date.now(), checkIn.soreLevels);
  // Ask once per day and check-in whether a scheduled open day should be a rest day.
  const pending = !data.session && restPending(data);
  const basis = restBasis(data);
  useEffect(() => {
    if (!pending) return;
    let live = true;
    void chooseRest(data).then((rest) => {
      if (live) update((d) => ({ ...d, restDecision: { day: dayKey(), basis, rest } }));
    });
    return () => { live = false; };
  // Re-ask only when the day or check-in changes, not on every edit while inference runs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, basis]);
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
  const theme = focusTheme[data.session ? data.session.focus : plan.rest ? "rest" : plan.focus];
  const onPoster = theme.ink;
  const soft = onPoster === C.ink ? "rgba(255,255,255,0.7)" : "rgba(13,13,14,0.68)";
  const tags = plan.rest
    ? []
    : plan.focus === "open"
      ? ["Decided move by move"]
      : plan.focus === "full"
        ? [
            ...(plan.targets.some((m) => ["chest", "back", "shoulders", "biceps", "triceps", "forearms"].includes(m)) ? ["Upper body"] : []),
            ...(plan.targets.some((m) => ["glutes", "quads", "hamstrings", "calves", "inner-thighs", "hips"].includes(m)) ? ["Legs & hips"] : []),
            ...(plan.targets.includes("core") ? ["Core"] : []),
          ]
        : plan.targets.map(muscleName);
  const posterLink = (title: string, label: string, onPress: () => void) => (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      scaleTo={0.9}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: onPoster === C.ink ? "rgba(255,255,255,0.14)" : "rgba(13,13,14,0.12)",
      }}
    >
      <T style={{ color: onPoster, fontFamily: fonts.bold, fontSize: 13 }}>{title}</T>
    </Squish>
  );
  return (
    <View style={{ flex: 1 }}>
      <Aurora colors={[theme.tint, C.violet, C.cyan]} intensity={0.22} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <Rise
          style={[
            s.between,
            { paddingHorizontal: 24, paddingTop: 14, alignItems: "flex-start" },
          ]}
        >
          <View style={{ gap: 10, flex: 1 }}>
            <Tape color={C.surface2} ink={C.muted}>{date}</Tape>
            <Chroma size={46} echoes={[C.violet, theme.tint]}>
              {`${greeting(now.getHours())}.`}
            </Chroma>
            <WeekStrip history={data.history} goal={data.profile?.weeklyGoal ?? 3} week={weekCount(data)} />
          </View>
          <Squish
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => go("profile")}
            scaleTo={0.9}
          >
            <LogoMark size={44} />
          </Squish>
        </Rise>
        {data.session ? (
          <Rise delay={90}>
            <Poster theme={theme} style={card}>
              <View style={[s.row, { gap: 4, marginLeft: -6 }]}>
                <LiveDot color={C.onAccent} size={7} />
                <Tape color={C.onAccent} ink={theme.tint}>In progress</Tape>
              </View>
              <Chroma size={48} color={onPoster} echoes={["rgba(255,255,255,0.55)"]} style={{ textTransform: "uppercase", marginTop: 14 }}>
                {focusLabels[data.session.focus]}
              </Chroma>
              <T style={{ color: soft, fontSize: 15, lineHeight: 21, marginTop: 10, fontFamily: fonts.medium, maxWidth: "85%" }}>
                {data.session.completed.length} of your moves done at{" "}
                {data.session.locationName}. Pick up where you left off.
              </T>
              <Button
                title="Continue my workout"
                dark={theme.tint}
                icon="arrow"
                onPress={() => go("workout")}
                style={{ marginTop: 20 }}
              />
            </Poster>
          </Rise>
        ) : plan.rest ? (
          <Rise delay={90}>
            <Poster theme={theme} style={card} watermark={false}>
              <Sleepy />
              <View style={[s.between, { alignItems: "flex-start" }]}>
                <Tape color={C.violet} ink={C.onAccent}>Today’s plan</Tape>
              </View>
              <Chroma size={56} color={C.ink} echoes={[C.violet, C.coral]} style={{ textTransform: "uppercase", marginTop: 40 }}>
                Rest day
              </Chroma>
              <T style={{ color: soft, fontSize: 15, lineHeight: 21, marginTop: 10, maxWidth: "88%" }}>{plan.why}</T>
              <View style={{ gap: 10, marginTop: 20 }}>
                {"auto" in plan && plan.auto && (
                  <Button title="Train anyway" onPress={() => update((d) => ({ ...d, workoutOverride: { day: dayKey(), plan: { focus: "open" } } }))} />
                )}
                <Button title="Change today" secondary onPress={() => go("today-style")} style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)" }} />
                <TextLink title="Edit week" label="Edit weekly plan" onPress={() => go("routine")} style={{ alignSelf: "center", paddingTop: 4 }} />
              </View>
            </Poster>
          </Rise>
        ) : (
          <>
            <Rise delay={90}>
              <Poster theme={theme} style={card}>
                <View style={s.between}>
                  <Tape color={C.onAccent} ink={theme.tint}>Today’s focus</Tape>
                  {posterLink("Change", "Change today", () => go("today-style"))}
                </View>
                <Chroma size={50} color={onPoster} echoes={["rgba(255,255,255,0.6)"]} style={{ textTransform: "uppercase", marginTop: 18 }}>
                  {focusLabels[plan.focus]}
                </Chroma>
                <View style={[s.wrap, { marginTop: 14, gap: 6 }]}>
                  {tags.map((label) => (
                    <View
                      key={label}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: "rgba(13,13,14,0.22)",
                      }}
                    >
                      <T style={{ fontSize: 13, lineHeight: 17, fontFamily: fonts.semibold, color: onPoster }}>{label}</T>
                    </View>
                  ))}
                </View>
                <View
                  style={{
                    marginTop: 18,
                    padding: 12,
                    paddingLeft: 14,
                    borderRadius: R.control,
                    backgroundColor: "rgba(13,13,14,0.86)",
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
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
                        color: theme.tint,
                        fontFamily: fonts.bold,
                        fontSize: 14,
                      }}
                    >
                      Update
                    </T>
                  </Pressable>
                </View>
                {!!plan.why && (
                  <T style={{ fontSize: 13, lineHeight: 18, color: soft, marginTop: 12, fontFamily: fonts.medium }}>{plan.why}</T>
                )}
              </Poster>
            </Rise>
            <Rise delay={170} style={section}>
              <SectionHeader
                title="Where are you today?"
                action={{ title: "Add place", label: "Add a place", onPress: () => go("places?add=1") }}
              />
              <View style={s.wrap}>
                {data.locations.map((p) => {
                  const on = p.id === data.selectedLocationId;
                  return (
                    <Choice
                      key={p.id}
                      label={p.name}
                      on={on}
                      onPress={() =>
                        update((d) => ({ ...d, selectedLocationId: p.id }))
                      }
                      style={{ padding: 14, flexGrow: 1, flexBasis: "45%", gap: 12 }}
                    >
                      <View style={s.between}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: on ? C.accent : C.surface2,
                            transform: [{ rotate: on ? "-8deg" : "0deg" }],
                          }}
                        >
                          <Icon name={placeIcon(p.kind)} size={20} color={on ? C.onAccent : C.muted} />
                        </View>
                        {on && <Icon name="check" size={18} color={C.accent} />}
                      </View>
                      <View>
                        <T
                          style={{ fontSize: 17, fontFamily: fonts.bold }}
                          numberOfLines={1}
                        >
                          {p.name}
                        </T>
                        <T
                          style={[s.small, s.muted, { marginTop: 2 }]}
                          numberOfLines={1}
                        >
                          {p.equipment.length
                            ? p.kind === "gym" && p.equipment.length >= 8
                              ? "Full equipment"
                              : p.equipment.map((e) => equipmentLabels[e]).join(", ")
                            : "Just your body"}
                        </T>
                      </View>
                    </Choice>
                  );
                })}
              </View>
            </Rise>
            <Rise delay={240} style={section}>
              <SectionHeader title="How much time do you have?" />
              <TimePicker value={minutes} onChange={setMinutes} />
            </Rise>
            <Rise delay={300} style={section}><DailyIntent /></Rise>
            <Rise delay={360} style={[section, { paddingTop: 30 }]}>
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
                  icon={membership.allowed ? "spark" : undefined}
                  shine
                  onPress={start}
                  style={{ minHeight: 64 }}
                />
              )}
              <T style={{ textAlign: "center", color: C.muted, fontSize: 13 }}>
                {membership.allowed
                  ? "You’ll find out each move as you go."
                  : "Your free days have finished."}
              </T>
            </Rise>
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
    </View>
  );
}
const section = { paddingHorizontal: 24, paddingTop: 28, gap: 12 } as const;
const card = {
  marginHorizontal: 18,
  marginTop: 22,
} as const;
