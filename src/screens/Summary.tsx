import React from "react";
import { ScrollView, View } from "react-native";
import { Button, C, Heading, Label, R, Stat, T, fonts, s, sizes } from "../components/ui";
import { useStore } from "../state/store";
import { focusLabels } from "../domain/types";
import { isNewFor, muscleName, musclesWorked } from "../domain/today";

export function Summary({ go }: { go: (route: string) => void }) {
  const { data } = useStore();
  const latest = data.history.at(-1);
  if (!latest)
    return (
      <View style={[s.page, { flex: 1, justifyContent: "center" }]}>
        <Heading>Nothing saved yet.</Heading>
        <Button title="Back to today" onPress={() => go("today")} />
      </View>
    );
  const earlier = { ...data, history: data.history.slice(0, -1) };
  const fresh = latest.completed.filter((e) =>
    isNewFor(earlier, e.exerciseId),
  ).length;
  const sets = latest.completed.reduce((n, e) => n + e.sets.length, 0);
  const minutes = Math.max(
    1,
    Math.round(((latest.endedAt ?? Date.now()) - latest.startedAt) / 60000),
  );
  const day = new Date(latest.startedAt).toLocaleDateString("en-US", {
    weekday: "long",
  });
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 36, gap: 10 }}>
          <Label style={{ fontSize: 12 }}>
            {day} · {focusLabels[latest.focus]}
          </Label>
          <Heading size={sizes.display}>Nice work.</Heading>
          <T style={s.muted}>
            {sets} {sets === 1 ? "set" : "sets"} completed at{" "}
            {latest.locationName}.
          </T>
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 20,
            paddingTop: 24,
          }}
        >
          <Stat value={minutes} label={minutes === 1 ? "minute" : "minutes"} />
          <Stat
            value={latest.completed.length}
            label={latest.completed.length === 1 ? "exercise" : "exercises"}
          />
          <Stat value={fresh} label="new to you" accent />
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 28, gap: 14 }}>
          <T style={s.sectionTitle}>Muscles worked</T>
          {musclesWorked(latest).map(({ muscle, share }) => (
            <View
              key={muscle}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <T style={{ width: 92, fontSize: 14 }}>{muscleName(muscle)}</T>
              <View
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: C.surface2,
                }}
              >
                <View
                  style={{
                    width: `${Math.round(share * 100)}%`,
                    height: "100%",
                    borderRadius: 4,
                    backgroundColor: C.accent,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
        <View
          style={{
            margin: 20,
            marginTop: 28,
            padding: 20,
            borderRadius: R.card,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.line2,
            gap: 6,
          }}
        >
          <Label color={C.accent}>Next time</Label>
          <T style={{ fontSize: 20, lineHeight: 25, fontFamily: fonts.bold }}>
            It’s a surprise.
          </T>
          <T style={[s.muted, { fontSize: 14, lineHeight: 19 }]}>
            We’ll plan it when you open the app, around how you feel.
          </T>
        </View>
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 8 }}>
        <Button title="Done" onPress={() => go("today")} />
      </View>
    </View>
  );
}
