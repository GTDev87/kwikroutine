import { escalate } from "../domain/soreness";
import { displayWeight, toKg, weightUnit } from "../domain/weightUnits";
import { ExercisePicture, picturesFor } from "../components/ExercisePicture";
import { HoldTimer } from "../components/HoldTimer";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Button,
  C,
  Chip,
  Heading,
  Icon,
  IconButton,
  Label,
  LevelBars,
  OptionCard,
  R,
  Segments,
  T,
  Tag,
  Tape,
  TextLink,
  focusTheme,
  fonts,
  s,
  sizes,
  Display,
} from "../components/ui";
import { Float, Glow, Pop, Rise, Squish, useLoop } from "../components/motion";
import { Poster } from "../components/Poster";
import { Ring } from "../components/Ring";
import { useStore } from "../state/store";
import { exerciseById } from "../data/exercises";
import {
  applyFeedback,
  acceptSelection,
  estimateSeconds,
  finishSession,
  logSet,
  remainingSeconds,
} from "../domain/engine";
import { chooseNext } from "../services/selection";
import {
  Equipment,
  Exercise,
  Rejection,
  SetLog,
  equipmentLabels,
  focusLabels,
  titleCase,
  styleLabels,
} from "../domain/types";
import {
  dayKey,
  isNewFor,
  muscleName,
  todayCheckIn,
  whyThis,
} from "../domain/today";

const mmss = (s: number) => {
  const whole = Math.ceil(Math.max(0, s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
const levelBars = { beginner: 1, intermediate: 2, advanced: 3 } as const;
function reasonsFor(
  ex: Exercise,
  place: string,
): [Rejection, string, string][] {
  const gear = ex.equipment.length > 0;
  return [
    ...(gear
      ? ([
          [
            "unavailable",
            "I don’t have the equipment",
            `Won’t suggest it at ${place} again`,
          ],
          [
            "busy",
            "The equipment is taken",
            "Avoids it for the rest of this workout",
          ],
        ] as [Rejection, string, string][])
      : []),
    ["sore", "Too sore for this", "Rests these muscles for the rest of today"],
    ["advanced", "Too advanced for me", "Hides it until you reset it in Profile"],
    ["today", "Just not feeling it", "Fine to suggest another day"],
    ["dislike", "Not for me", "Won’t suggest it again"],
  ];
}
function Header({
  onClose,
  title,
  subtitle,
  remaining,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  remaining: number;
}) {
  return (
    <View style={[s.between, { paddingHorizontal: 16, height: 48 }]}>
      <IconButton name="close" label="Finish for today" onPress={onClose} />
      <View style={{ alignItems: "center", flex: 1 }}>
        <T style={{ fontSize: 15, fontFamily: fonts.bold }}>{title}</T>
        {!!subtitle && (
          <T style={{ fontSize: 12, lineHeight: 16, color: C.muted }}>
            {subtitle}
          </T>
        )}
      </View>
      <View
        style={{
          minWidth: 58,
          paddingHorizontal: 9,
          paddingVertical: 5,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: remaining < 120 ? C.coral : C.line,
          backgroundColor: C.surface,
          alignItems: "center",
        }}
      >
        <T
          accessibilityLabel={`${Math.ceil(remaining / 60)} minutes left`}
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            lineHeight: 16,
            color: remaining < 120 ? C.coral : C.ink,
            fontVariant: ["tabular-nums"],
          }}
        >
          {mmss(remaining)}
        </T>
      </View>
    </View>
  );
}
export function Workout({ go }: { go: (route: string) => void }) {
  const { data, update } = useStore(),
    session = data.session;
  const [now, setNow] = useState(Date.now()),
    [loading, setLoading] = useState(false),
    [empty, setEmpty] = useState(false),
    [skip, setSkip] = useState(false),
    [started, setStarted] = useState(false),
    [reason, setReason] = useState<Rejection | null>(null),
    [equipment, setEquipment] = useState<Equipment[]>([]),
    [end, setEnd] = useState(false),
    [moreReasons, setMoreReasons] = useState(false);
  const [reps, setReps] = useState("10"),
    [weight, setWeight] = useState("0"),
    [effort, setEffort] = useState<SetLog["effort"]>("right"),
    [held, setHeld] = useState<number | null>(null);
  const ex = session?.current ? exerciseById[session.current.exerciseId] : null;
  const unit = weightUnit(data.profile);
  const recordedLoad = session?.current?.sets.at(-1)?.weight ?? session?.current?.load?.suggested ?? 0;
  useEffect(() => {
    setWeight(displayWeight(recordedLoad, unit));
  }, [recordedLoad, unit, ex?.id, session?.id]);
  const hasPicture = !!ex && picturesFor(ex).length > 0;
  const x = useRef(new Animated.Value(0)).current;
  const actions = useRef({ skip: () => {}, start: () => {} });
  actions.current = {
    skip: () => {
      setSkip(true);
      void Haptics.selectionAsync().catch(() => {});
    },
    start: () => setStarted(true),
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (ex) {
      setReps(String(ex.seconds ?? ex.reps));
      setHeld(null);
      setEffort("right");
      setStarted(false);
      x.setValue(0);
    }
  }, [ex, x]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: Animated.event([null, { dx: x }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -100)
            Animated.timing(x, {
              toValue: -150,
              duration: 160,
              useNativeDriver: false,
            }).start(() => actions.current.skip());
          else if (g.dx > 100)
            Animated.timing(x, {
              toValue: 500,
              duration: 180,
              useNativeDriver: false,
            }).start(() => actions.current.start());
          else
            Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
        },
      }),
    [x],
  );
  if (!session)
    return (
      <View style={[s.page, { flex: 1, justifyContent: "center" }]}>
        <Heading>All done for now.</Heading>
        <Button title="Back to today" onPress={() => go("today")} />
      </View>
    );
  const rest = Math.max(0, ((session.restUntil ?? 0) - now) / 1000),
    remaining = remainingSeconds(session, now);
  const moveNumber = session.completed.length + 1;
  const about = Math.max(moveNumber, Math.round(session.minutes / 6));
  const next = async (from = data) => {
    if (loading) return;
    setLoading(true);
    setEmpty(false);
    try {
      const result = await chooseNext(from, from.session!);
      update((d) => acceptSelection(d, session.id, result));
      setEmpty(!result.current);
    } finally {
      setLoading(false);
    }
  };
  const finish = () => {
    const hasSets =
      session.completed.length > 0 || !!session.current?.sets.length;
    update((d) => finishSession(d));
    go(hasSets ? "summary" : "today");
  };
  const undoSkip = () => {
    setSkip(false);
    setReason(null);
    setMoreReasons(false);
    Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
  };
  const reject = async () => {
    if (!reason || !ex) return;
    const gear = reason === "busy" || reason === "unavailable" ? equipment : [];
    let nextData = applyFeedback(data, reason, [], gear);
    if (reason === "sore") {
      const today = todayCheckIn(nextData);
      nextData = {
        ...nextData,
        checkIn: { ...today, day: dayKey(), ...escalate(today, ex.primary) },
      };
    }
    update(() => nextData);
    setSkip(false);
    setReason(null);
    setMoreReasons(false);
    await next(nextData);
  };
  const valid =
    Number.isFinite(Number(reps)) &&
    Number(reps) > 0 &&
    Number(reps) <= 300 &&
    Number.isFinite(Number(weight)) &&
    Number(weight) >= 0 &&
    toKg(Number(weight), unit) <= 1000;
  const submitSet = () => {
    const parsedReps = held ?? Number(reps),
      parsedWeight = toKg(Number(weight), unit);
    if (!valid) return;
    update((d) =>
      logSet(d, {
        reps: parsedReps,
        weight: parsedWeight,
        effort,
        at: Date.now(),
      }),
    );
    setHeld(null);
    setEffort("right");
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
  };
  const close = () => setEnd(true);
  const theme = focusTheme[session.focus];
  if (end)
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16 }}>
        <Rise style={{ gap: 14 }}>
          <Tape color={theme.tint}>{focusLabels[session.focus]}</Tape>
          <Display size={44}>Call it a day?</Display>
          <T style={[s.muted, { fontSize: 16, lineHeight: 23 }]}>
            We’ll save every set you completed. A shorter session still counts.
          </T>
        </Rise>
        <View style={{ height: 8 }} />
        <Rise delay={120} style={{ gap: 12 }}>
          <Button title="Finish & save workout" onPress={finish} />
          <Button title="Keep going" secondary onPress={() => setEnd(false)} />
        </Rise>
      </View>
    );
  if (!session.warmupDone)
    return (
      <View style={{ flex: 1 }}>
        <Header
          onClose={close}
          title={focusLabels[session.focus]}
          subtitle={`${session.minutes} min · ${styleLabels[session.style ?? "balanced"]}`}
          remaining={remaining}
        />
        <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
          <Breathe color={theme.tint} />
          <Rise delay={80}>
            <Display size={40}>Two minutes to warm up.</Display>
          </Rise>
          <Rise delay={160}>
            <T style={[s.muted, { fontSize: 16 }]}>
              Easy pace. Skip anything that doesn’t feel right.
            </T>
          </Rise>
          <Rise delay={240}>
            <Steps
              items={[
                "Walk or march gently in place.",
                "Roll your shoulders and circle your arms.",
                "A few easy hip hinges and knee bends.",
              ]}
            />
          </Rise>
        </ScrollView>
        <View style={{ padding: 24, paddingTop: 12 }}>
          <Button
            shine
            title="I’m warmed up"
            busy={loading}
            onPress={() => {
              update((d) => ({
                ...d,
                session: d.session ? { ...d.session, warmupDone: true } : null,
              }));
              void next();
            }}
          />
        </View>
      </View>
    );
  if (
    ex &&
    session.current &&
    (skip || (!started && !session.current.sets.length))
  ) {
    const cur = session.current;
    const rotate = x.interpolate({
      inputRange: [-300, 0, 300],
      outputRange: ["-14deg", "0deg", "14deg"],
    });
    const place =
      data.locations.find((p) => p.id === session.locationId)?.name ??
      "this place";
    return (
      <View style={{ flex: 1 }}>
        <Header
          onClose={close}
          title={focusLabels[session.focus]}
          subtitle={`${session.minutes} min · move ${moveNumber} of about ${about}`}
          remaining={remaining}
        />
        <View style={{ flexDirection: "row", paddingHorizontal: 26, paddingTop: 8 }}>
          <Segments total={about} done={moveNumber} height={6} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 20, marginTop: 18 }}>
          {[
            { inset: 22, drop: -18, turn: "3deg", color: C.violet, o: 0.45 },
            { inset: 10, drop: -9, turn: "-2deg", color: theme.tint, o: 0.7 },
          ].map((b, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: b.inset,
                right: b.inset,
                top: 14,
                bottom: b.drop,
                borderRadius: R.sheet,
                backgroundColor: C.surface,
                borderWidth: 1.5,
                borderColor: b.color,
                opacity: b.o,
                transform: [{ rotate: b.turn }],
              }}
            />
          ))}
          <Animated.View
            {...pan.panHandlers}
            accessibilityHint="Swipe left to skip, right to start"
            style={{
              flex: 1,
              borderRadius: R.sheet,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.line,
              overflow: "hidden",
              boxShadow: "0 24px 48px rgba(0,0,0,0.55)",
              transform: [{ translateX: x }, { rotate }],
            }}
          >
            <Stamp
              label="GO"
              color={C.accent}
              side="left"
              opacity={x.interpolate({ inputRange: [0, 90], outputRange: [0, 1], extrapolate: "clamp" })}
            />
            <Stamp
              label="SKIP"
              color={C.coral}
              side="right"
              opacity={x.interpolate({ inputRange: [-90, 0], outputRange: [1, 0], extrapolate: "clamp" })}
            />
            {hasPicture && <View style={{ height: 200 }}>
              <ExercisePicture key={ex.id} exercise={ex} height={200} radius={0} />
              {isNewFor(data, ex.id) && (
                <View style={{ position: "absolute", top: 14, left: 14 }}>
                  <Tag label="New for you" solid />
                </View>
              )}
            </View>}
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingTop: 16, gap: 10 }}
            >
              {!hasPicture && (
                <View style={{ height: 8, marginHorizontal: -20, marginTop: -16, marginBottom: 8, backgroundColor: theme.tint }} />
              )}
              {!hasPicture && isNewFor(data, ex.id) && <View style={s.row}><Tag label="New for you" solid /></View>}
              <View style={[s.wrap, { gap: 6 }]}>
                {[...ex.primary, ...ex.secondary].slice(0, 4).map((m) => (
                  <Tag key={m} label={muscleName(m)} small />
                ))}
              </View>
              <Heading size={30} style={{ letterSpacing: -1.2 }}>{ex.name}</Heading>
              <View style={s.row}>
                <LevelBars level={levelBars[ex.level]} size={12} color={theme.tint} />
                <T style={{ fontSize: 13, color: C.muted, marginLeft: -4 }}>
                  {titleCase(ex.level)} ·{" "}
                  {ex.equipment.length
                    ? ex.equipment.map((e) => equipmentLabels[e]).join(", ")
                    : "No equipment"}
                </T>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Mini value={cur.plannedSets} label="sets" color={theme.tint} />
                <Mini
                  value={ex.seconds ?? ex.reps}
                  label={`${ex.seconds ? "sec" : "reps"}${ex.unilateral ? " each side" : ""}`}
                  color={C.violet}
                />
                <Mini
                  value={Math.max(
                    1,
                    Math.round(estimateSeconds(ex, cur.plannedSets) / 60),
                  )}
                  label="min"
                  color={C.cyan}
                />
              </View>
              {!hasPicture && <View style={{ gap: 12, marginTop: 8 }}>
                <Label>How to move</Label>
                <Steps items={ex.steps} />
                <T style={[s.small, s.muted]}>{ex.tip}</T>
              </View>}
              <View
                style={{
                  marginTop: 4,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: C.line2,
                }}
              >
                <T style={{ fontSize: 13, lineHeight: 18, color: C.muted }}>
                  <T style={{ fontSize: 13, fontFamily: fonts.semibold }}>
                    Why this:{" "}
                  </T>
                  {whyThis(data, session, ex)}.
                </T>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 30, paddingBottom: 20, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28 }}>
            <RoundAction label="Skip" icon="close" color={C.coral} onPress={actions.current.skip} />
            <T style={{ fontSize: 12, lineHeight: 16, color: C.faint, textAlign: "center", width: 96 }}>
              Swipe left to skip · right to start
            </T>
            <RoundAction label="Start" icon="arrow" color={C.accent} filled onPress={() => setStarted(true)} />
          </View>
        </View>
        {skip && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Pressable
              accessibilityLabel="Keep this exercise"
              onPress={undoSkip}
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
            />
            <Rise
              from={260}
              style={{
                backgroundColor: C.surface,
                borderTopLeftRadius: R.sheet,
                borderTopRightRadius: R.sheet,
                borderTopWidth: 3,
                borderColor: C.coral,
                padding: 20,
                paddingTop: 10,
                maxHeight: "85%",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: C.region,
                  alignSelf: "center",
                }}
              />
              <ScrollView
                contentContainerStyle={{ gap: 10, paddingTop: 18 }}
                style={{ flexShrink: 1 }}
              >
                <Display size={30}>Why skip this one?</Display>
                <T style={[s.muted, { fontSize: 14, marginBottom: 8 }]}>
                  Your answer shapes what comes next.
                </T>
                {[...reasonsFor(ex, place), ...(moreReasons ? ([
                  ["setup", "Too much setup", "Favor simpler moves here"],
                  ["floor", "No floor exercises", "Skip floor work today; favor upright moves here"],
                  ["crowded", "It’s too crowded", "Favor moves away from equipment here"],
                  ["repetitive", "I want something different", "Give this move a break"],
                ] as [Rejection, string, string][]) : [])].map(([value, title, subtitle]) => {
                  return (
                    <OptionCard
                      key={value}
                      title={title}
                      subtitle={subtitle}
                      selected={reason === value}
                      onPress={() => {
                        setReason(value);
                        setEquipment(ex.equipment);
                      }}
                    />
                  );
                })}
                {!moreReasons && <TextLink title="More reasons" style={{ alignSelf: "center", paddingVertical: 8 }} onPress={() => setMoreReasons(true)} />}
                {(reason === "busy" || reason === "unavailable") &&
                  ex.equipment.length > 1 && (
                    <View style={{ gap: 8, paddingTop: 4 }}>
                      <T style={[s.small, s.muted]}>Which equipment?</T>
                      <View style={s.wrap}>
                        {ex.equipment.map((e) => (
                          <Chip
                            key={e}
                            small
                            label={equipmentLabels[e]}
                            selected={equipment.includes(e)}
                            onPress={() =>
                              setEquipment(
                                equipment.includes(e)
                                  ? equipment.filter((y) => y !== e)
                                  : [...equipment, e],
                              )
                            }
                          />
                        ))}
                      </View>
                    </View>
                  )}
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Button
                  title="Undo"
                  ghost
                  onPress={undoSkip}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Next exercise"
                  busy={loading}
                  disabled={
                    !reason ||
                    ((reason === "busy" || reason === "unavailable") &&
                      !equipment.length)
                  }
                  onPress={() => void reject()}
                  style={{ flex: 1.4 }}
                />
              </View>
            </Rise>
          </View>
        )}
      </View>
    );
  }
  if (ex && session.current) {
    const cur = session.current;
    const weighted = !ex.conditioning && ex.equipment.some((e) => !["mat", "chair", "bench", "adjustable-bench", "decline-bench", "bands", "loop-bands", "pullup-bar", "suspension", "rings", "stability-ball", "ab-wheel", "dip-station", "captains-chair", "roman-chair", "plyo-box"].includes(e));
    const lastSet = cur.sets.length + 1 >= cur.plannedSets;
    return (
      <View style={{ flex: 1 }}>
        <Header
          onClose={close}
          title={`Move ${moveNumber}`}
          remaining={remaining}
        />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {hasPicture && <View
            style={{
              marginHorizontal: 20,
              marginTop: 8,
            }}
          >
            <ExercisePicture key={ex.id} exercise={ex} height={180} />
          </View>}
          <View
            style={[
              s.between,
              { paddingHorizontal: 24, paddingTop: 20, alignItems: "flex-end" },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Heading size={sizes.card} style={{ letterSpacing: -1.1 }}>{ex.name}</Heading>
              <T style={{ marginTop: 4, fontSize: 14, color: theme.tint, fontFamily: fonts.semibold }}>
                {ex.primary.map(muscleName).join(" · ")}
              </T>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <T style={{ fontSize: 13, color: C.muted }}>
                Set {Math.min(cur.sets.length + 1, cur.plannedSets)} of{" "}
                {cur.plannedSets}
              </T>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 6, transform: [{ skewX: "-20deg" }] }}>
                {Array.from({ length: cur.plannedSets }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 22,
                      height: 7,
                      borderRadius: 1.5,
                      backgroundColor:
                        i < cur.sets.length
                          ? C.ink
                          : i === cur.sets.length
                            ? theme.tint
                            : C.line,
                      ...(i === cur.sets.length ? { boxShadow: `0 0 10px ${theme.tint}` } : {}),
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
          {rest > 0 ? (
            <Pop style={{ alignItems: "center", paddingTop: 22, gap: 14 }}>
              <View style={{ position: "absolute", top: -30 }}>
                <Glow color={theme.tint} size={320} opacity={0.22} />
              </View>
              <Ring until={session.restUntil ?? 0} total={ex.rest} colors={[theme.tint, C.cyan]}>
                <Tape color={theme.tint} style={{ alignSelf: "center" }}>Rest</Tape>
                <T
                  style={{
                    fontSize: 68,
                    lineHeight: 76,
                    fontFamily: fonts.black,
                    letterSpacing: -3,
                    fontVariant: ["tabular-nums"],
                    marginTop: 4,
                  }}
                >
                  {mmss(rest)}
                </T>
              </Ring>
              <T style={{ fontSize: 17, color: C.muted, fontFamily: fonts.medium }}>
                Next up: set {cur.sets.length + 1} of {cur.plannedSets}
              </T>
            </Pop>
          ) : ex.seconds ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <HoldTimer
                key={`${ex.id}-${cur.sets.length}`}
                seconds={Number(reps) || ex.seconds}
                unilateral={ex.unilateral}
                onChangeSeconds={(n) => setReps(String(n))}
                onHeld={setHeld}
              />
            </View>
          ) : (
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 14,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: R.card,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.line2,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                overflow: "hidden",
              }}
            >
              <Nudge
                label="One fewer rep"
                sign="−"
                onPress={() => setReps(String(Math.max(1, (Number(reps) || 1) - 1)))}
              />
              <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
              <TextInput
                accessibilityLabel="Repetitions completed"
                keyboardType="number-pad"
                value={reps}
                onChangeText={setReps}
                maxLength={3}
                selectionColor={C.accent}
                style={{
                  fontSize: 88,
                  letterSpacing: -4,
                  color: C.ink,
                  padding: 0,
                  fontFamily: fonts.black,
                  textAlign: "center",
                  // Size to the digits so the unit sits right beside the number.
                  width: Math.max(1, reps.length) * 46 + 6,
                }}
              />
              <T style={{ fontSize: 16, color: C.muted, fontFamily: fonts.semibold }}>
                {ex.unilateral ? "reps\neach side" : "reps"}
              </T>
              </View>
              <Nudge
                label="One more rep"
                sign="+"
                onPress={() => setReps(String(Math.min(300, (Number(reps) || 0) + 1)))}
              />
            </View>
          )}
          {weighted && rest === 0 && (
            <View style={{ paddingHorizontal: 24, paddingTop: 6, gap: 8 }}>
            <View style={s.row}>
              <T style={{ color: C.muted, fontSize: 14 }}>Load</T>
              <TextInput
                accessibilityLabel={`Weight in ${unit === "lb" ? "pounds" : "kilograms"}`}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
                maxLength={7}
                selectionColor={C.accent}
                style={[
                  s.input,
                  {
                    minHeight: 40,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    width: 84,
                    fontSize: 16,
                  },
                ]}
              />
              <T style={{ color: C.muted, fontSize: 14 }}>{unit}</T>
            </View>
            {cur.load && cur.sets.length === 0 && (
              <View style={{gap: 4}}>
                <T style={{color: C.muted, fontSize: 13, lineHeight: 19}}>
                  {cur.load.source === 'laya'
                    ? `Suggested: ${displayWeight(cur.load.suggested, unit)} ${unit} · last time ${displayWeight(cur.load.previous, unit)} ${unit}. Two easy workouts support a small increase.`
                    : `Last time here: ${displayWeight(cur.load.previous, unit)} ${unit}. Adjust to what feels right today.`}
                </T>
                {cur.load.source === 'laya' && <>
                  <T style={{color: C.muted, fontSize: 13}}>If that weight isn’t available, keep your previous weight.</T>
                  <TextLink title="Use last weight" style={{ alignSelf: "flex-start", paddingVertical: 8 }}
                    onPress={() => setWeight(displayWeight(cur.load!.previous, unit))} />
                </>}
              </View>
            )}
            </View>
          )}
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            <Steps items={ex.steps} tip={ex.tip} />
          </View>
          <TextLink
            title="Swap this exercise"
            onPress={() => setSkip(true)}
            style={{ alignSelf: "center", paddingVertical: 16 }}
          />
        </ScrollView>
        <View style={{ padding: 24, paddingTop: 8, gap: 12 }}>
          {rest > 0 ? (
            <Button
              title="I’m ready for my next set"
              onPress={() =>
                update((d) => ({
                  ...d,
                  session: d.session ? { ...d.session, restUntil: null } : null,
                }))
              }
            />
          ) : (
            <>
              <T style={{ fontSize: 14, color: C.muted, textAlign: "center" }}>
                How did that set feel?
              </T>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["easy", "right", "hard"] as const).map((e) => {
                  const tone = { easy: C.cyan, right: C.accent, hard: C.coral }[e];
                  const on = effort === e;
                  return (
                  <Squish
                    key={e}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setEffort(e)}
                    scaleTo={0.92}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: R.chip,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 7,
                      backgroundColor: on ? tone : C.surface,
                      borderWidth: 1.5,
                      borderColor: on ? tone : C.line,
                      ...(on ? { boxShadow: `0 6px 18px ${tone}55` } : {}),
                    }}
                  >
                    {!on && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone }} />}
                    <T style={{ fontSize: 14, fontFamily: on ? fonts.black : fonts.semibold, color: on ? C.onAccent : C.ink }}>
                      {
                        {
                          easy: "Too easy",
                          right: "Just right",
                          hard: "Too hard",
                        }[e]
                      }
                    </T>
                  </Squish>
                  );
                })}
              </View>
              <Button
                title={lastSet ? "Finish exercise" : "Set done"}
                detail={lastSet ? undefined : `rest ${ex.rest}s`}
                onPress={submitSet}
                disabled={!valid}
              />
            </>
          )}
        </View>
      </View>
    );
  }
  const done = session.completed.length;
  const stop = empty || remaining < 60;
  return (
    <View style={{ flex: 1 }}>
      <Header
        onClose={close}
        title={focusLabels[session.focus]}
        subtitle={`${done} ${done === 1 ? "move" : "moves"} done`}
        remaining={remaining}
      />
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14 }}>
        <Mystery theme={theme} stop={stop} done={done} />
        <Rise delay={120}>
          <Tape color={stop ? C.coral : theme.tint}>
            {stop ? "That’s a wrap" : done ? `Move ${done} done` : "Ready"}
          </Tape>
        </Rise>
        <Rise delay={180}>
          <Display size={38}>
            {stop
              ? "Good place to stop."
              : done
                ? "Nice. Next one’s a surprise."
                : "Your first move is a surprise."}
          </Display>
        </Rise>
        <T style={[s.muted, { fontSize: 16, lineHeight: 23 }]}>
          {empty
            ? "Nothing else fits your remaining time and preferences. Your sets are ready to save."
            : stop
              ? "You’ve used your time. Save what you did."
              : "Take a breath, then see what’s next."}
        </T>
      </View>
      <View style={{ padding: 24, gap: 12 }}>
        {!stop && (
          <Button
            shine
            icon="spark"
            title="Reveal next exercise"
            busy={loading}
            onPress={() => void next()}
          />
        )}
        <Button
          title="Finish & save workout"
          secondary={!stop}
          onPress={finish}
        />
      </View>
    </View>
  );
}
function Mini({ value, label, color = C.accent }: { value: number; label: string; color?: string }) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: R.chip,
        backgroundColor: C.bg,
        borderBottomWidth: 3,
        borderBottomColor: color,
      }}
    >
      <T style={{ fontSize: 26, lineHeight: 30, fontFamily: fonts.black, letterSpacing: -0.8 }}>
        {value}
      </T>
      <T style={{ fontSize: 12, lineHeight: 16, color: C.muted, fontFamily: fonts.medium }}>{label}</T>
    </View>
  );
}
// Rubber-stamp verdict that fades in on the card as it's dragged.
function Stamp({
  label,
  color,
  side,
  opacity,
}: {
  label: string;
  color: string;
  side: "left" | "right";
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 28,
        [side]: 22,
        zIndex: 5,
        opacity,
        pointerEvents: "none",
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderWidth: 4,
        borderColor: color,
        borderRadius: 10,
        backgroundColor: "rgba(10,10,11,0.75)",
        transform: [{ rotate: side === "left" ? "-14deg" : "14deg" }],
      }}
    >
      <T style={{ color, fontFamily: fonts.black, fontSize: 34, lineHeight: 40, letterSpacing: 2 }}>{label}</T>
    </Animated.View>
  );
}
// Big round skip/start buttons under the card.
function RoundAction({
  label,
  icon,
  color,
  filled = false,
  onPress,
}: {
  label: string;
  icon: "close" | "arrow";
  color: string;
  filled?: boolean;
  onPress: () => void;
}) {
  const size = filled ? 76 : 64;
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Squish
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        scaleTo={0.88}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: filled ? color : C.surface,
          borderWidth: filled ? 0 : 2,
          borderColor: color,
          boxShadow: `0 10px 28px ${color}${filled ? "66" : "33"}`,
        }}
      >
        <Icon name={icon} size={filled ? 32 : 26} color={filled ? C.onAccent : color} />
      </Squish>
      <T style={{ fontSize: 13, fontFamily: fonts.bold, color: filled ? C.ink : C.muted }}>{label}</T>
    </View>
  );
}
// Round −/+ for adjusting reps without the keyboard.
function Nudge({ label, sign, onPress }: { label: string; sign: string; onPress: () => void }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.85}
      hitSlop={6}
      style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.surface2,
      }}
    >
      <T style={{ fontSize: 26, lineHeight: 30, fontFamily: fonts.bold }}>{sign}</T>
    </Squish>
  );
}
// Expanding rings that pace an easy breath during the warm-up.
function Breathe({ color }: { color: string }) {
  const v = useLoop(3200, { pingPong: true });
  return (
    <View style={{ height: 150, alignItems: "center", justifyContent: "center" }}>
      {[1, 0.72, 0.46].map((k, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: 150 * k,
            height: 150 * k,
            borderRadius: 75 * k,
            borderWidth: 2,
            borderColor: color,
            opacity: 0.25 + i * 0.25,
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8 + i * 0.05, 1.05] }) }],
          }}
        />
      ))}
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: color, alignItems: "center", justifyContent: "center", boxShadow: `0 0 30px ${color}` }}>
        <T style={{ color: C.onAccent, fontFamily: fonts.black, fontSize: 15 }}>2:00</T>
      </View>
    </View>
  );
}
// A face-down card with a big question mark, bobbing in place: the next move is a secret.
function Mystery({ theme, stop, done }: { theme: (typeof focusTheme)["full"]; stop: boolean; done: number }) {
  return (
    <View style={{ alignItems: "center", marginBottom: 18, height: 230, justifyContent: "center" }}>
      <View style={{ position: "absolute" }}>
        <Glow color={stop ? C.coral : theme.tint} size={340} opacity={0.3} />
      </View>
      <Pop>
        <Float distance={10} rotate={3} duration={2400}>
          <View style={{ transform: [{ rotate: "-6deg" }] }}>
            <View
              style={{
                position: "absolute",
                width: 150,
                height: 206,
                borderRadius: 22,
                backgroundColor: C.surface2,
                borderWidth: 1.5,
                borderColor: C.violet,
                transform: [{ rotate: "12deg" }, { translateX: 18 }],
              }}
            />
            <Poster theme={stop ? focusTheme.lower : theme} style={{ width: 150, height: 206, padding: 0, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
              {stop ? (
                <Icon name="check" size={80} color={C.onAccent} />
              ) : (
                <T style={{ fontFamily: fonts.black, fontSize: 120, lineHeight: 130, color: C.onAccent, letterSpacing: -4 }}>?</T>
              )}
              <View style={{ position: "absolute", top: 12, left: 14 }}>
                <T style={{ fontFamily: fonts.mono, fontSize: 12, color: "rgba(13,13,14,0.7)" }}>
                  {String(done + (stop ? 0 : 1)).padStart(2, "0")}
                </T>
              </View>
            </Poster>
          </View>
        </Float>
      </Pop>
    </View>
  );
}
function Steps({ items, tip }: { items: string[]; tip?: string }) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: R.card,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.line2,
        gap: 12,
      }}
    >
      {items.map((text, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: C.accent,
              alignItems: "center",
              justifyContent: "center",
              marginTop: -1,
              transform: [{ skewX: "-10deg" }],
            }}
          >
            <T style={{ fontFamily: fonts.black, fontSize: 13, lineHeight: 16, color: C.onAccent }}>
              {i + 1}
            </T>
          </View>
          <T style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>{text}</T>
        </View>
      ))}
      {!!tip && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 2, padding: 12, borderRadius: R.chip, backgroundColor: C.bg }}>
          <Icon name="spark" size={16} color={C.amber} />
          <T style={{ flex: 1, fontSize: 13, lineHeight: 18, color: C.muted }}>{tip}</T>
        </View>
      )}
    </View>
  );
}
