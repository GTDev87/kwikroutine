import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { C, T, fonts } from "./ui";

export type TabId = "today" | "history" | "profile";
// Line icons in the same stroke style as Icon; the active tab turns lime with a soft fill.
export function TabIcon({ id, on, size = 26, color }: { id: TabId; on: boolean; size?: number; color?: string }) {
  const stroke = color ?? (on ? C.accent : C.muted);
  const fill = on ? (color ? "rgba(0,0,0,0.1)" : C.accentSoft) : "none";
  const common = {
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (id === "today")
    // A calendar page showing today's date.
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3.5} y={4.5} width={17} height={16} rx={4} fill={fill} {...common} />
          <Path d="M8 2.8v3.4M16 2.8v3.4M3.5 9h17" fill="none" {...common} />
        </Svg>
        <View
          style={{
            position: "absolute",
            top: size * 0.4,
            left: 0,
            right: 0,
            bottom: size * 0.12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T
            style={{
              fontFamily: fonts.bold,
              fontSize: size * 0.36,
              lineHeight: size * 0.42,
              color: stroke,
            }}
          >
            {new Date().getDate()}
          </T>
        </View>
      </View>
    );
  if (id === "history")
    // A clock with a rewind arrow.
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {on && <Circle cx={12} cy={12} r={9} fill={fill} />}
        <Path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.4" fill="none" {...common} />
        <Path d="M3.5 3.8v4.6h4.6M12 7.5V12l3 2" fill="none" {...common} />
      </Svg>
    );
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} fill={fill} {...common} />
      <Path d="M4.5 20.5v-.8A5.7 5.7 0 0 1 10.2 14h3.6a5.7 5.7 0 0 1 5.7 5.7v.8" fill={fill} {...common} />
    </Svg>
  );
}
