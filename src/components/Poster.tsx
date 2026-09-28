import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Theme } from "./theme";
import { Shine, Stripes } from "./motion";

// Full-bleed gradient card with racing stripes and a giant slanted-bar watermark:
// the loud surface for the one thing on screen that matters most.
export function Poster({
  theme,
  children,
  style,
  shine = true,
  watermark = true,
}: {
  theme: Theme;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  shine?: boolean;
  watermark?: boolean;
}) {
  const dark = theme.ink !== "#0D0D0E";
  const mark = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)";
  return (
    <View
      style={[
        {
          borderRadius: 30,
          overflow: "hidden",
          padding: 22,
          boxShadow: `0 18px 50px ${theme.tint}40`,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={theme.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Stripes color={dark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)"} gap={22} width={8} />
      {watermark && (
        <View
          style={{
            position: "absolute",
            right: -18,
            bottom: -26,
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 12,
            transform: [{ skewX: "-14deg" }],
            pointerEvents: "none",
          }}
        >
          {[70, 118, 166].map((h) => (
            <View key={h} style={{ width: 38, height: h, borderRadius: 6, backgroundColor: mark }} />
          ))}
        </View>
      )}
      {shine && <Shine color={dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.45)"} every={4200} />}
      {children}
    </View>
  );
}
