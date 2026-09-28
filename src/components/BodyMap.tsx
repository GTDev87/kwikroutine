import React, { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { MUSCLES, Muscle } from "../domain/types";
import { muscleName } from "../domain/today";
import { bodyBack, bodyFront } from "./bodyPaths";
import { C, Chip, T, fonts, s } from "./ui";
// Anatomy regions from the path set, mapped onto the muscles the exercise engine knows.
// Hip flexors remain selectable in the muscle list; no inaccurate surface region.
const SLUG: Record<string, Muscle> = {
  forearm: "forearms",
  adductors: "inner-thighs",
  chest: "chest",
  obliques: "core",
  abs: "core",
  biceps: "biceps",
  triceps: "triceps",
  trapezius: "back",
  "upper-back": "back",
  "lower-back": "back",
  deltoids: "shoulders",
  quadriceps: "quads",
  tibialis: "calves",
  calves: "calves",
  gluteal: "glutes",
  hamstring: "hamstrings",
};
// On web, react-native-svg turns onPress into responder props that React DOM rejects,
// and replaces onClick unless onPress is exactly null. Use a plain click there.
const tap = (fn: () => void): object =>
  Platform.OS === "web"
    ? { onClick: fn, onPress: null, style: { cursor: "pointer" } }
    : { onPress: fn };
export function BodyMap({
  selected,
  onChange,
  height = 380,
}: {
  selected: Muscle[];
  onChange: (m: Muscle[]) => void;
  height?: number;
}) {
  const [side, setSide] = useState<"front" | "back">("front"),
    [list, setList] = useState(false);
  const toggle = (m: Muscle) =>
    onChange(
      selected.includes(m) ? selected.filter((x) => x !== m) : [...selected, m],
    );
  const parts = side === "front" ? bodyFront : bodyBack;
  return (
    <View style={{ gap: 12, alignItems: "center" }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          padding: 4,
          borderRadius: 12,
          backgroundColor: C.surface2,
          width: 200,
        }}
      >
        {(["front", "back"] as const).map((v) => (
          <Pressable
            key={v}
            accessibilityRole="tab"
            accessibilityLabel={v === "front" ? "Front view" : "Back view"}
            accessibilityState={{ selected: side === v }}
            onPress={() => setSide(v)}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 9,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: side === v ? C.surface : "transparent",
            }}
          >
            <T
              style={{
                fontFamily: fonts.semibold,
                fontSize: 14,
                color: side === v ? C.ink : C.muted,
              }}
            >
              {v === "front" ? "Front" : "Back"}
            </T>
          </Pressable>
        ))}
      </View>
      <Svg
        width={height / 2}
        height={height}
        viewBox={side === "front" ? "40 60 644 1340" : "764 60 644 1340"}
      >
        {parts.map((p, i) => {
          const m = SLUG[p.s];
          const fill = m
            ? selected.includes(m)
              ? C.moderate
              : C.region
            : p.s === "hair"
              ? C.region
              : C.body;
          const paths = p.d.map((d, j) => <Path key={j} d={d} fill={fill} />);
          return m ? (
            <G
              key={`${side}-${i}`}
              {...tap(() => toggle(m))}
              accessibilityLabel={muscleName(m)}
            >
              {paths}
            </G>
          ) : (
            <G key={`${side}-${i}`}>{paths}</G>
          );
        })}
      </Svg>
      <View style={[s.wrap, { justifyContent: "center", minHeight: 36 }]}>
        {selected.map((m) => (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityLabel={`${muscleName(m)} is sore. Tap to clear.`}
            onPress={() => toggle(m)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.line,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: C.moderate,
              }}
            />
            <T style={{ fontFamily: fonts.semibold, fontSize: 14 }}>
              {muscleName(m)}
            </T>
            <T style={{ color: C.muted, fontSize: 14 }}>✕</T>
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => setList(!list)}>
        <T
          style={{ color: C.accent, fontSize: 14, fontFamily: fonts.semibold }}
        >
          {list ? "Hide the list" : "Pick from a list instead"}
        </T>
      </Pressable>
      {list && (
        <View style={[s.wrap, { justifyContent: "center" }]}>
          {MUSCLES.map((m) => (
            <Chip
              key={m}
              small
              label={muscleName(m)}
              selected={selected.includes(m)}
              onPress={() => toggle(m)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
