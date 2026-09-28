import { displayWeight, weightUnit } from "../domain/weightUnits";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import {
  Button,
  C,
  Heading,
  Icon,
  Label,
  StepBar,
  Stat,
  T,
  Tag,
  fonts,
  s,
  sizes,
  R,
  focusTheme,
  Display,
} from "../components/ui";
import { Aurora, CountUp, Rise, Squish } from "../components/motion";
import { BodyFigure } from "../components/BodyMap";
import { useStore } from "../state/store";
import { Muscle, Session, focusLabels } from "../domain/types";
import { exerciseById } from "../data/exercises";
import { weekCount } from "../domain/engine";
import { dayKey, muscleName, recovery } from "../domain/today";

const effortLabel = { easy: "Too easy", right: "Just right", hard: "Too hard" };
const minutesOf = (s: Session) =>
  Math.max(1, Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000));
// Front and back figures with recovering muscles lit up; everything else reads as ready.
function RecoveryMap({ recovering }: { recovering: Muscle[] }) {
  const fillFor = (m: Muscle) => (recovering.includes(m) ? C.accent : undefined);
  return (
    <View style={{ gap: 10, alignItems: "center" }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          recovering.length
            ? `Body diagram. Recovering: ${recovering.map(muscleName).join(", ")}.`
            : "Body diagram. Every muscle is ready."
        }
        style={[s.row, { gap: 20, justifyContent: "center" }]}
      >
        {(["front", "back"] as const).map((side) => (
          <View key={side} style={{ alignItems: "center", gap: 4 }}>
            <BodyFigure side={side} height={230} fillFor={fillFor} />
            <T style={[s.small, s.muted]}>{side === "front" ? "Front" : "Back"}</T>
          </View>
        ))}
      </View>
      <View style={[s.row, { gap: 16 }]}>
        {[
          { color: C.accent, label: "Recovering" },
          { color: C.region, label: "Ready" },
        ].map((k) => (
          <View key={k.label} style={[s.row, { gap: 6 }]}>
            <View
              style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: k.color }}
            />
            <T style={[s.small, s.muted]}>{k.label}</T>
          </View>
        ))}
      </View>
    </View>
  );
}
function SessionDetail({
  session,
  onBack,
}: {
  session: Session;
  onBack: () => void;
}) {
  const {data} = useStore();
  const unit = weightUnit(data.profile);
  return (
    <View style={{ flex: 1 }}> 
      <StepBar onBack={onBack} backLabel="Back to history" />
      <ScrollView contentContainerStyle={[s.page, { paddingTop: 8 }]}>
        <View style={{ gap: 8 }}>
          <Label>
            {new Date(session.startedAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Label>
          <Heading size={sizes.title}>{focusLabels[session.focus]}</Heading>
          <T style={s.muted}>
            {minutesOf(session)} min · {session.completed.length}{" "}
            {session.completed.length === 1 ? "exercise" : "exercises"} ·{" "}
            {session.locationName}
          </T>
        </View>
        {session.completed.map((item, i) => {
          const ex = exerciseById[item.exerciseId];
          return (
            <View
              key={`${item.exerciseId}-${i}`}
              style={{
                padding: 16,
                borderRadius: R.card,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.line2,
                gap: 8,
              }}
            >
              <T style={{ fontSize: 16, fontFamily: fonts.semibold }}>
                {ex?.name ?? item.exerciseId}
              </T>
              {item.sets.map((set, j) => (
                <View key={j} style={s.between}>
                  <T style={[s.small, s.muted]}>Set {j + 1}</T>
                  <T style={s.small}>
                    {set.reps} {ex?.seconds ? "sec" : "reps"}
                    {ex?.unilateral ? " / side" : ""}
                    {set.weight > 0 ? ` · ${displayWeight(set.weight, unit)} ${unit}` : ""} ·{" "}
                    {effortLabel[set.effort]}
                  </T>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
function Week({ history }: { history: Session[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const trained = new Set(history.map((h) => dayKey(h.endedAt ?? h.startedAt)));
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingTop: 18,
      }}
    >
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const isToday = d.getTime() === today.getTime(),
          future = d > today,
          done = trained.has(dayKey(d));
        return (
          <View key={i} style={{ alignItems: "center", gap: 6 }}>
            <T style={{ fontSize: 12, color: C.muted }}>{"MTWTFSS"[i]}</T>
            <View
              accessibilityLabel={`${d.toLocaleDateString("en-US", { weekday: "long" })}${done ? ", trained" : ""}`}
              style={{
                width: 38,
                height: 44,
                borderRadius: 10,
                transform: [{ skewX: "-8deg" }],
                ...(done ? { boxShadow: `0 6px 18px ${isToday ? "rgba(192,244,71,0.45)" : "rgba(247,247,242,0.18)"}` } : {}),
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  isToday && done
                    ? C.accent
                    : done
                      ? C.ink
                      : future
                        ? "transparent"
                        : C.surface2,
                borderWidth: future || (isToday && !done) ? 1.5 : 0,
                borderStyle: future ? "dashed" : "solid",
                borderColor: isToday ? C.accent : C.faint,
              }}
            >
              <T
                style={{
                  fontSize: 15,
                  fontFamily: done ? fonts.black : fonts.semibold,
                  color: done
                    ? isToday
                      ? C.onAccent
                      : C.bg
                    : future
                      ? C.faint
                      : C.ink,
                }}
              >
                {d.getDate()}
              </T>
            </View>
          </View>
        );
      })}
    </View>
  );
}
export function History({ go }: { go: (route: string) => void }) {
  const { data } = useStore();
  const [selected, setSelected] = useState<Session | null>(null);
  if (selected)
    return (
      <SessionDetail session={selected} onBack={() => setSelected(null)} />
    );
  const now = new Date();
  const thisMonth = data.history.filter((h) => {
    const d = new Date(h.startedAt);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;
  const distinct = new Set(
    data.history.flatMap((h) => h.completed.map((e) => e.exerciseId)),
  ).size;
  const { recovering, ready } = recovery(data);
  const goal = data.profile?.weeklyGoal ?? 3,
    week = weekCount(data);
  return (
    <View style={{ flex: 1 }}>
    <Aurora colors={[C.violet, C.accent, C.coral]} intensity={0.2} height={360} />
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Rise style={[s.between, { paddingHorizontal: 24, paddingTop: 14, alignItems: "flex-end" }]}>
        <Display size={46}>History</Display>
        <View style={{ alignItems: "flex-end", paddingBottom: 6 }}>
          <T style={{ fontSize: 26, lineHeight: 28, fontFamily: fonts.black, color: week >= goal ? C.accent : C.ink }}>
            {week}<T style={{ fontSize: 16, color: C.muted, fontFamily: fonts.bold }}>/{goal}</T>
          </T>
          <T style={{ color: C.muted, fontSize: 12 }}>this week</T>
        </View>
      </Rise>
      <Rise delay={80}>
        <Week history={data.history} />
      </Rise>
      <Rise
        delay={160}
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 20,
          paddingTop: 22,
        }}
      >
        <Stat
          accent
          value={<CountUp value={thisMonth} style={{ fontSize: 34, lineHeight: 40, fontFamily: fonts.black, letterSpacing: -1.2, color: C.onAccent }} />}
          label={`workouts in ${now.toLocaleDateString("en-US", { month: "long" })}`}
        />
        <Stat
          value={<CountUp value={distinct} delay={100} style={{ fontSize: 34, lineHeight: 40, fontFamily: fonts.black, letterSpacing: -1.2, color: C.ink }} />}
          label="different exercises"
        />
      </Rise>
      <Rise delay={240}
        style={{
          marginHorizontal: 20,
          marginTop: 12,
          padding: 16,
          borderRadius: R.card,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.line2,
          gap: 12,
        }}
      >
        <T style={{ fontSize: 17, fontFamily: fonts.bold }}>Recovery</T>
        <RecoveryMap recovering={recovering} />
        {recovering.length ? (
          <View style={{ gap: 8 }}>
            <T style={[s.small, s.muted]}>Recovering</T>
            <View style={[s.wrap, { gap: 6 }]}>
              {recovering.map((m) => (
                <Tag key={m} label={muscleName(m)} accent />
              ))}
            </View>
          </View>
        ) : (
          <T style={[s.small, s.muted]}>Everything is rested and ready.</T>
        )}
        {!!recovering.length && !!ready.length && (
          <T style={[s.small, s.muted]}>
            <T style={[s.small, { fontFamily: fonts.semibold }]}>Ready: </T>
            {ready.map(muscleName).join(", ")}
          </T>
        )}
      </Rise>
      <T style={[s.sectionTitle, { paddingHorizontal: 24, paddingTop: 22 }]}>
        Recent
      </T>
      {!data.history.length ? (
        <View style={{ paddingHorizontal: 24, paddingTop: 10, gap: 14 }}>
          <T style={s.muted}>
            No workouts yet. Your first one is a tap away, and short sessions
            count.
          </T>
          <Button
            title="Plan today’s workout"
            secondary
            onPress={() => go("today")}
          />
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 8 }}>
          {data.history
            .slice()
            .reverse()
            .slice(0, 30)
            .map((session, i) => {
              const d = new Date(session.startedAt);
              const tint = focusTheme[session.focus].tint;
              return (
                <Rise key={session.id} delay={Math.min(i, 8) * 50 + 280}>
                <Squish
                  accessibilityRole="button"
                  accessibilityLabel={`View workout from ${d.toLocaleDateString()}`}
                  onPress={() => setSelected(session)}
                  scaleTo={0.97}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: R.control,
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.line2,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: tint }} />
                  <View style={{ width: 40, alignItems: "center" }}>
                    <T
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 10,
                        lineHeight: 13,
                        color: C.muted,
                      }}
                    >
                      {d
                        .toLocaleDateString("en-US", { weekday: "short" })
                        .toUpperCase()}
                    </T>
                    <T
                      style={{
                        fontSize: 22,
                        lineHeight: 26,
                        fontFamily: fonts.black,
                        color: tint,
                      }}
                    >
                      {d.getDate()}
                    </T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 16, fontFamily: fonts.bold }}>
                      {focusLabels[session.focus]}
                    </T>
                    <T style={[s.small, s.muted]}>
                      {minutesOf(session)} min · {session.completed.length}{" "}
                      {session.completed.length === 1 ? "exercise" : "exercises"} ·{" "}
                      {session.locationName}
                    </T>
                  </View>
                  <Icon name="chevron" size={16} color={C.faint} />
                </Squish>
                </Rise>
              );
            })}
        </View>
      )}
    </ScrollView>
    </View>
  );
}
