import { displayWeight, toKg, weightUnit } from "../domain/weightUnits";
import { ExercisePicture, picturesFor } from "../components/ExercisePicture";
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
  IconButton,
  Label,
  LevelBars,
  OptionCard,
  R,
  T,
  Tag,
  TextLink,
  fonts,
  s,
  sizes,
} from "../components/ui";
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

const mmss = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.ceil(Math.max(0, s)) % 60).padStart(2, "0")}`;
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
        <T style={{ fontSize: 15, fontFamily: fonts.semibold }}>{title}</T>
        {!!subtitle && (
          <T style={{ fontSize: 12, lineHeight: 16, color: C.muted }}>
            {subtitle}
          </T>
        )}
      </View>
      <T
        accessibilityLabel={`${Math.ceil(remaining / 60)} minutes left`}
        style={{
          width: 40,
          textAlign: "right",
          fontFamily: fonts.mono,
          fontSize: 13,
          color: C.muted,
        }}
      >
        {mmss(remaining)}
      </T>
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
    [holdUntil, setHoldUntil] = useState<number | null>(null);
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
      setHoldUntil(null);
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
        checkIn: {
          ...today,
          day: dayKey(),
          sore: [...new Set([...today.sore, ...ex.primary])],
        },
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
    const parsedReps = Number(reps),
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
    setHoldUntil(null);
    setEffort("right");
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
  };
  const close = () => setEnd(true);
  if (end)
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16 }}>
        <Label>{focusLabels[session.focus]}</Label>
        <Heading size={sizes.title}>Call it a day?</Heading>
        <T style={[s.muted, { fontSize: 16, lineHeight: 23 }]}>
          We’ll save every set you completed. A shorter session still counts.
        </T>
        <View style={{ height: 8 }} />
        <Button title="Finish & save workout" onPress={finish} />
        <Button title="Keep going" secondary onPress={() => setEnd(false)} />
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
          <Heading size={30}>Two minutes to warm up.</Heading>
          <T style={s.muted}>
            Easy pace. Skip anything that doesn’t feel right.
          </T>
          <Steps
            items={[
              "Walk or march gently in place.",
              "Roll your shoulders and circle your arms.",
              "A few easy hip hinges and knee bends.",
            ]}
          />
        </ScrollView>
        <View style={{ padding: 24, paddingTop: 12 }}>
          <Button
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
        <View
          style={{
            flexDirection: "row",
            gap: 5,
            paddingHorizontal: 24,
            paddingTop: 8,
          }}
        >
          {Array.from({ length: about }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i < moveNumber ? C.accent : C.line,
              }}
            />
          ))}
        </View>
        <View style={{ flex: 1, marginHorizontal: 20, marginTop: 18 }}>
          <View
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              top: 14,
              bottom: -10,
              borderRadius: R.sheet,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.line2,
              opacity: 0.7,
            }}
          />
          <Animated.View
            {...pan.panHandlers}
            accessibilityHint="Swipe left to skip, right to start"
            style={{
              flex: 1,
              borderRadius: R.sheet,
              backgroundColor: C.surface,
              overflow: "hidden",
              transform: [{ translateX: x }, { rotate }],
            }}
          >
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
              {!hasPicture && isNewFor(data, ex.id) && <View style={s.row}><Tag label="New for you" accent /></View>}
              <View style={[s.wrap, { gap: 6 }]}>
                {[...ex.primary, ...ex.secondary].slice(0, 4).map((m) => (
                  <Tag key={m} label={muscleName(m)} small />
                ))}
              </View>
              <Heading size={sizes.card}>{ex.name}</Heading>
              <View style={s.row}>
                <LevelBars level={levelBars[ex.level]} size={12} />
                <T style={{ fontSize: 13, color: C.muted, marginLeft: -4 }}>
                  {titleCase(ex.level)} ·{" "}
                  {ex.equipment.length
                    ? ex.equipment.map((e) => equipmentLabels[e]).join(", ")
                    : "No equipment"}
                </T>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Mini value={cur.plannedSets} label="sets" />
                <Mini
                  value={ex.seconds ?? ex.reps}
                  label={`${ex.seconds ? "sec" : "reps"}${ex.unilateral ? " each side" : ""}`}
                />
                <Mini
                  value={Math.max(
                    1,
                    Math.round(estimateSeconds(ex, cur.plannedSets) / 60),
                  )}
                  label="min"
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
        <View style={{ padding: 24, paddingTop: 26, gap: 14 }}>
          <T style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>
            Swipe left to skip · right to start
          </T>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              title="Skip"
              secondary
              onPress={actions.current.skip}
              style={{ flex: 1 }}
            />
            <Button
              title="Start"
              onPress={() => setStarted(true)}
              style={{ flex: 1.4 }}
            />
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
            <View
              style={{
                backgroundColor: C.surface,
                borderTopLeftRadius: R.sheet,
                borderTopRightRadius: R.sheet,
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
                <Heading size={24}>Why skip this one?</Heading>
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
            </View>
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
              <Heading size={sizes.card}>{ex.name}</Heading>
              <T style={{ marginTop: 4, fontSize: 14, color: C.muted }}>
                {ex.primary.map(muscleName).join(" · ")}
              </T>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <T style={{ fontSize: 13, color: C.muted }}>
                Set {Math.min(cur.sets.length + 1, cur.plannedSets)} of{" "}
                {cur.plannedSets}
              </T>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
                {Array.from({ length: cur.plannedSets }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 22,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor:
                        i < cur.sets.length
                          ? C.ink
                          : i === cur.sets.length
                            ? C.accent
                            : C.line,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
          {rest > 0 ? (
            <View style={{ paddingHorizontal: 24, paddingTop: 18, gap: 4 }}>
              <Label color={C.accent}>Rest</Label>
              <T
                style={{
                  fontSize: 88,
                  lineHeight: 92,
                  fontFamily: fonts.bold,
                  letterSpacing: -4,
                }}
              >
                {mmss(rest)}
              </T>
              <T style={{ fontSize: 17, color: C.muted }}>
                Next up: set {cur.sets.length + 1} of {cur.plannedSets}
              </T>
            </View>
          ) : (
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 12,
                flexDirection: "row",
                alignItems: "baseline",
                gap: 10,
              }}
            >
              <TextInput
                accessibilityLabel={
                  ex.seconds ? "Seconds completed" : "Repetitions completed"
                }
                keyboardType="number-pad"
                value={reps}
                onChangeText={setReps}
                maxLength={3}
                selectionColor={C.accent}
                style={{
                  fontSize: 88,
                  fontFamily: fonts.bold,
                  letterSpacing: -4,
                  color: C.ink,
                  padding: 0,
                  // Size to the digits so the unit sits right beside the number.
                  width: Math.max(1, reps.length) * 42 + 6,
                }}
              />
              <T style={{ fontSize: 17, color: C.muted }}>
                {ex.seconds ? "seconds" : "reps"}
                {ex.unilateral ? " each side" : ""}
              </T>
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
                    ? `Laya suggests ${displayWeight(cur.load.suggested, unit)} ${unit} · last time ${displayWeight(cur.load.previous, unit)} ${unit}. Two easy workouts support a small increase.`
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
              {!!ex.seconds && (
                <Button
                  secondary
                  title={
                    holdUntil && holdUntil > now
                      ? `Timer · ${mmss((holdUntil - now) / 1000)}`
                      : "Start set timer"
                  }
                  onPress={() =>
                    setHoldUntil(Date.now() + Number(reps || ex.seconds) * 1000)
                  }
                  disabled={!!holdUntil && holdUntil > now}
                />
              )}
              <T style={{ fontSize: 14, color: C.muted, textAlign: "center" }}>
                How did that set feel?
              </T>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["easy", "right", "hard"] as const).map((e) => (
                  <Pressable
                    key={e}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: effort === e }}
                    onPress={() => setEffort(e)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: R.chip,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: effort === e ? C.accentSoft : C.surface,
                      borderWidth: 1.5,
                      borderColor: effort === e ? C.accent : C.line,
                    }}
                  >
                    <T style={{ fontSize: 14, fontFamily: fonts.semibold }}>
                      {
                        {
                          easy: "Too easy",
                          right: "Just right",
                          hard: "Too hard",
                        }[e]
                      }
                    </T>
                  </Pressable>
                ))}
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
        <Label color={C.accent}>
          {stop ? "That’s a wrap" : done ? `Move ${done} done` : "Ready"}
        </Label>
        <Heading size={sizes.title}>
          {stop
            ? "Good place to stop."
            : done
              ? "Nice. Next one’s a surprise."
              : "Your first move is a surprise."}
        </Heading>
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
function Mini({ value, label }: { value: number; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: R.chip,
        backgroundColor: C.bg,
      }}
    >
      <T style={{ fontSize: 22, lineHeight: 27, fontFamily: fonts.bold }}>
        {value}
      </T>
      <T style={{ fontSize: 12, lineHeight: 16, color: C.muted }}>{label}</T>
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
        gap: 10,
      }}
    >
      {items.map((text, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10 }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: C.surface2,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            <T style={{ fontFamily: fonts.mono, fontSize: 11, lineHeight: 14 }}>
              {i + 1}
            </T>
          </View>
          <T style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>{text}</T>
        </View>
      ))}
      {!!tip && (
        <T
          style={{ fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 2 }}
        >
          {tip}
        </T>
      )}
    </View>
  );
}
