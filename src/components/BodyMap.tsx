import React, { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { MUSCLES, Muscle, SoreLevel, SoreLevels } from "../domain/types";
import { soreLevelLabels } from "../domain/soreness";
import { muscleName } from "../domain/today";
import { bodyBack, bodyFront } from "./bodyPaths";
import { C, R, T, TextLink, fonts, s } from "./ui";
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
export const soreColors = ["transparent", C.mild, C.moderate, C.severe] as const;
// One side of the body. Muscles without a fill use the neutral region colour.
export function BodyFigure({
  side,
  height,
  fillFor,
  onPress,
  label,
}: {
  side: "front" | "back";
  height: number;
  fillFor: (m: Muscle) => string | undefined;
  onPress?: (m: Muscle) => void;
  label?: (m: Muscle) => string;
}) {
  const parts = side === "front" ? bodyFront : bodyBack;
  return (
    <Svg
      width={height / 2}
      height={height}
      viewBox={side === "front" ? "40 60 644 1340" : "764 60 644 1340"}
    >
      {parts.map((p, i) => {
        const m = SLUG[p.s];
        const fill = m
          ? (fillFor(m) ?? C.region)
          : p.s === "hair"
            ? C.region
            : C.body;
        const paths = p.d.map((d, j) => <Path key={j} d={d} fill={fill} />);
        return m && onPress ? (
          <G
            key={`${side}-${i}`}
            {...tap(() => onPress(m))}
            accessibilityLabel={label?.(m)}
          >
            {paths}
          </G>
        ) : (
          <G key={`${side}-${i}`}>{paths}</G>
        );
      })}
    </Svg>
  );
}
const next = (level: number) => ((level + 1) % 4) as 0 | SoreLevel;
function Dot({ level, size = 8 }: { level: number; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: level ? soreColors[level] : C.region,
      }}
    />
  );
}
// Tap a muscle to step it through light → medium → very sore → not sore.
export function BodyMap({
  levels,
  onChange,
  height = 380,
}: {
  levels: SoreLevels;
  onChange: (levels: SoreLevels) => void;
  height?: number;
}) {
  const [side, setSide] = useState<"front" | "back">("front"),
    [list, setList] = useState(false);
  const levelOf = (m: Muscle) => levels[m] ?? 0;
  const cycle = (m: Muscle) => {
    const updated = { ...levels };
    const n = next(levelOf(m));
    if (n) updated[m] = n;
    else delete updated[m];
    onChange(updated);
  };
  const describe = (m: Muscle) =>
    `${muscleName(m)}, ${levelOf(m) ? soreLevelLabels[levelOf(m)].toLowerCase() : "not sore"}`;
  const sore = MUSCLES.filter((m) => levelOf(m));
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
      <View style={[s.row, { gap: 14 }]} accessibilityLabel="Tap once for light, twice for medium, three times for very sore">
        {([1, 2, 3] as const).map((l) => (
          <View key={l} style={[s.row, { gap: 6 }]}>
            <Dot level={l} size={10} />
            <T style={[s.small, s.muted]}>{soreLevelLabels[l]}</T>
          </View>
        ))}
      </View>
      <BodyFigure
        side={side}
        height={height}
        fillFor={(m) => (levelOf(m) ? soreColors[levelOf(m)] : undefined)}
        onPress={cycle}
        label={describe}
      />
      <T style={[s.small, s.muted, { textAlign: "center" }]}>
        {sore.length
          ? "Tap again to change how sore it is."
          : "Tap a muscle once for light, again for medium, again for very sore."}
      </T>
      <View style={[s.wrap, { justifyContent: "center", minHeight: 36 }]}>
        {sore.map((m) => (
          <LevelChip key={m} muscle={m} level={levelOf(m)} onPress={() => cycle(m)} label={`${describe(m)}. Tap to change.`} />
        ))}
      </View>
      <TextLink
        title={list ? "Hide the list" : "Pick from a list instead"}
        onPress={() => setList(!list)}
      />
      {list && (
        <View style={[s.wrap, { justifyContent: "center" }]}>
          {MUSCLES.map((m) => (
            <LevelChip key={m} muscle={m} level={levelOf(m)} onPress={() => cycle(m)} label={muscleName(m)} />
          ))}
        </View>
      )}
    </View>
  );
}
function LevelChip({
  muscle,
  level,
  onPress,
  label,
}: {
  muscle: Muscle;
  level: number;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: soreLevelLabels[level] }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: R.chip,
        backgroundColor: C.surface,
        borderWidth: 1.5,
        borderColor: level ? soreColors[level] : C.line,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Dot level={level} />
      <T style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{muscleName(muscle)}</T>
      {!!level && (
        <T style={{ color: C.muted, fontSize: 14 }}>{soreLevelLabels[level]}</T>
      )}
    </Pressable>
  );
}
