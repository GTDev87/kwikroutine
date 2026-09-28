import React, { useEffect, useRef } from "react";
import { Animated, Easing, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, C, Heading, Stat, T, Tape, focusTheme, fonts, s } from "../components/ui";
import { Aurora, Chroma, Confetti, CountUp, Rise, useReducedMotion } from "../components/motion";
import { Poster } from "../components/Poster";
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
  const theme = focusTheme[latest.focus];
  const big = { fontSize: 34, lineHeight: 40, fontFamily: fonts.black, letterSpacing: -1.2, color: C.ink } as const;
  return (
    <View style={{ flex: 1 }}>
      <Aurora colors={[theme.tint, C.violet, C.coral]} intensity={0.3} height={520} />
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 40, gap: 14 }}>
          <Rise>
            <Tape color={theme.tint}>
              {day} · {focusLabels[latest.focus]}
            </Tape>
          </Rise>
          <Rise delay={80}>
            <Chroma size={76} echoes={[C.violet, theme.tint]} style={{ textTransform: "uppercase" }}>
              {"Nice\nwork."}
            </Chroma>
          </Rise>
          <Rise delay={160}>
            <T style={[s.muted, { fontSize: 17, lineHeight: 24 }]}>
              {sets} {sets === 1 ? "set" : "sets"} completed at{" "}
              {latest.locationName}.
            </T>
          </Rise>
        </View>
        <Rise
          delay={240}
          style={{
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 20,
            paddingTop: 26,
          }}
        >
          <Stat value={<CountUp value={minutes} delay={400} style={big} />} label={minutes === 1 ? "minute" : "minutes"} />
          <Stat
            value={<CountUp value={latest.completed.length} delay={500} style={big} />}
            label={latest.completed.length === 1 ? "exercise" : "exercises"}
          />
          <Stat value={<CountUp value={fresh} delay={600} style={[big, { color: C.onAccent }]} />} label="new to you" accent />
        </Rise>
        <Rise delay={320} style={{ paddingHorizontal: 24, paddingTop: 30, gap: 14 }}>
          <T style={s.sectionTitle}>Muscles worked</T>
          {musclesWorked(latest).map(({ muscle, share }, i) => (
            <View
              key={muscle}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <T style={{ width: 92, fontSize: 14, fontFamily: fonts.medium }}>{muscleName(muscle)}</T>
              <Bar share={share} delay={500 + i * 90} colors={i % 2 ? [C.violet, C.cyan] : [theme.colors[0], theme.tint]} />
            </View>
          ))}
        </Rise>
        <Rise delay={400}>
          <Poster theme={focusTheme.open} style={{ margin: 20, marginTop: 30, gap: 6 }}>
            <Tape color={C.onAccent} ink={C.cyan}>Next time</Tape>
            <T style={{ fontSize: 28, lineHeight: 32, fontFamily: fonts.black, color: C.onAccent, letterSpacing: -1, marginTop: 8 }}>
              It’s a surprise.
            </T>
            <T style={{ color: "rgba(13,13,14,0.7)", fontSize: 14, lineHeight: 19, fontFamily: fonts.medium, maxWidth: "80%" }}>
              We’ll plan it when you open the app, around how you feel.
            </T>
            <T style={{ position: "absolute", right: 18, top: -6, fontSize: 130, lineHeight: 150, fontFamily: fonts.black, color: "rgba(13,13,14,0.12)" }}>?</T>
          </Poster>
        </Rise>
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 8 }}>
        <Button title="Done" shine onPress={() => go("today")} />
      </View>
      <Confetti />
    </View>
  );
}
// Muscle share bar that grows in from the left.
function Bar({ share, delay, colors }: { share: number; delay: number; colors: [string, string] }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: reduce ? 1 : 800,
      delay: reduce ? 0 : delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [reduce, delay, v]);
  return (
    <View style={{ flex: 1, height: 12, borderRadius: 3, backgroundColor: C.surface2, overflow: "hidden", transform: [{ skewX: "-18deg" }] }}>
      <Animated.View
        style={{
          width: v.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${Math.round(share * 100)}%`] }),
          height: "100%",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}
