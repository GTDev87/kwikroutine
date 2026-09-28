import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { C } from "./theme";

// Countdown ring that drains smoothly toward `until`, with its own fast ticker so the arc
// doesn't step with the parent's half-second clock.
export function Ring({
  until,
  total,
  size = 240,
  stroke = 16,
  colors = [C.accent, C.cyan],
  children,
}: {
  until: number;
  total: number;
  size?: number;
  stroke?: number;
  colors?: [string, string];
  children?: React.ReactNode;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, Math.min(1, (until - now) / (total * 1000)));
  const r = (size - stroke) / 2,
    length = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.surface2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - left)}
        />
      </Svg>
      {children}
    </View>
  );
}
