import { displayWeight, weightUnit } from "../domain/weightUnits";
import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
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
} from "../components/ui";
import { useStore } from "../state/store";
import { Session, focusLabels } from "../domain/types";
import { exerciseById } from "../data/exercises";
import { weekCount } from "../domain/engine";
import { dayKey, muscleName, recovery } from "../domain/today";

const effortLabel = { easy: "Too easy", right: "Just right", hard: "Too hard" };
const minutesOf = (s: Session) =>
  Math.max(1, Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000));
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
                width: 36,
                height: 36,
                borderRadius: R.card,
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
                  fontSize: 13,
                  fontFamily: done ? fonts.semibold : fonts.body,
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
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[s.between, { paddingHorizontal: 24, paddingTop: 12 }]}>
        <Heading size={sizes.title}>History</Heading>
        <T style={{ color: C.muted, fontSize: 14 }}>
          {week} of {goal} this week
        </T>
      </View>
      <Week history={data.history} />
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 20,
          paddingTop: 20,
        }}
      >
        <Stat
          value={thisMonth}
          label={`workouts in ${now.toLocaleDateString("en-US", { month: "long" })}`}
        />
        <Stat value={distinct} label="different exercises" />
      </View>
      <View
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
        <T style={{ fontSize: 15, fontFamily: fonts.semibold }}>Recovery</T>
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
      </View>
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
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          {data.history
            .slice()
            .reverse()
            .slice(0, 30)
            .map((session, i, list) => {
              const d = new Date(session.startedAt);
              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View workout from ${d.toLocaleDateString()}`}
                  onPress={() => setSelected(session)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                    borderBottomWidth: i < list.length - 1 ? 1 : 0,
                    borderBottomColor: C.line,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
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
                        fontSize: 18,
                        lineHeight: 22,
                        fontFamily: fonts.bold,
                      }}
                    >
                      {d.getDate()}
                    </T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 15, fontFamily: fonts.semibold }}>
                      {focusLabels[session.focus]}
                    </T>
                    <T style={[s.small, s.muted]}>
                      {minutesOf(session)} min · {session.completed.length}{" "}
                      {session.completed.length === 1 ? "exercise" : "exercises"} ·{" "}
                      {session.locationName}
                    </T>
                  </View>
                  <Icon name="chevron" size={16} color={C.faint} />
                </Pressable>
              );
            })}
        </View>
      )}
    </ScrollView>
  );
}
