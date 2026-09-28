import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { C, fonts } from "./theme";

// The native driver isn't available on web; fall back quietly there.
export const ND = Platform.OS !== "web";
// Decorative layers stay out of the accessibility tree (web only understands aria-hidden).
const hidden =
  Platform.OS === "web"
    ? { "aria-hidden": true }
    : { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" as const };

export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => live && setReduce(r))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

// A 0→1 value that plays once on mount.
export function useEntrance(delay = 0, duration = 560) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: reduce ? 1 : duration,
      delay: reduce ? 0 : delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: ND,
    }).start();
  }, [reduce, delay, duration, v]);
  return v;
}

// A 0→1 value that loops forever (or sits at 0 when motion is reduced).
export function useLoop(duration: number, { pingPong = false, delay = 0 } = {}) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.inOut(Easing.sin);
    const run = pingPong
      ? Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: ease, useNativeDriver: ND }),
          Animated.timing(v, { toValue: 0, duration, easing: ease, useNativeDriver: ND }),
        ])
      : Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
          Animated.delay(delay),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: ND }),
        ]);
    const loop = Animated.loop(run);
    loop.start();
    return () => loop.stop();
  }, [reduce, duration, pingPong, delay, v]);
  return v;
}

// Fades and lifts its children in; stagger siblings with `delay`.
export function Rise({
  children,
  delay = 0,
  from = 22,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useEntrance(delay);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Pops in from slightly small, with a little overshoot.
export function Pop({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  useEffect(() => {
    Animated.sequence([
      Animated.delay(reduce ? 0 : delay),
      Animated.spring(v, { toValue: 1, friction: 5, tension: 90, useNativeDriver: ND }),
    ]).start();
  }, [reduce, delay, v]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Pressable that squashes on touch and springs back, with a light haptic tick.
export function Squish({
  style,
  children,
  scaleTo = 0.965,
  haptic = true,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  scaleTo?: number;
  haptic?: boolean;
}) {
  const v = useRef(new Animated.Value(1)).current;
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        Animated.spring(v, { toValue: scaleTo, speed: 40, bounciness: 0, useNativeDriver: ND }).start();
        if (haptic && Platform.OS !== "web")
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.spring(v, { toValue: 1, speed: 18, bounciness: 12, useNativeDriver: ND }).start();
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: v }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// A slanted glint that sweeps across its parent every few seconds. Parent needs overflow hidden.
export function Shine({
  color = "rgba(255,255,255,0.55)",
  every = 2800,
  duration = 1100,
}: {
  color?: string;
  every?: number;
  duration?: number;
}) {
  const [w, setW] = useState(0);
  const v = useLoop(duration, { delay: every });
  return (
    <View
      {...hidden}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFill, { pointerEvents: "none", overflow: "hidden" }]}
    >
      {w > 0 && (
        <Animated.View
          style={{
            position: "absolute",
            top: -30,
            bottom: -30,
            width: 70,
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-120, w + 60] }) },
              { skewX: "-22deg" },
            ],
          }}
        >
          <LinearGradient
            colors={["transparent", color, "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </View>
  );
}

// Soft glowing blob made from a radial gradient, so it works everywhere without blur.
export function Glow({ color, size, opacity = 0.5 }: { color: string; size: number; opacity?: number }) {
  const id = useMemo(() => `g${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <View {...hidden} style={{ width: size, height: size }}>
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
    </View>
  );
}

// Slow-drifting colored glows that sit behind a screen.
export function Aurora({
  colors = [C.accent, C.violet, C.cyan],
  height = 420,
  intensity = 0.28,
}: {
  colors?: string[];
  height?: number;
  intensity?: number;
}) {
  const a = useLoop(7000, { pingPong: true });
  const b = useLoop(9000, { pingPong: true });
  const spots = [
    { size: 360, left: -140, top: -120, v: a, dx: 50, dy: 30 },
    { size: 320, left: 160, top: -60, v: b, dx: -40, dy: 50 },
    { size: 280, left: 40, top: 140, v: a, dx: 30, dy: -40 },
  ];
  return (
    <View
      {...hidden}
      style={{ position: "absolute", left: 0, right: 0, top: 0, height, overflow: "hidden", pointerEvents: "none" }}
    >
      {spots.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            transform: [
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
            ],
          }}
        >
          <Glow color={colors[i % colors.length]} size={p.size} opacity={intensity} />
        </Animated.View>
      ))}
      <LinearGradient
        colors={["transparent", C.bg]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.45 }}
      />
    </View>
  );
}

// Diagonal racing stripes, echoing the slant of the logo bars.
export function Stripes({
  color = "rgba(0,0,0,0.12)",
  gap = 18,
  width = 7,
  style,
}: {
  color?: string;
  gap?: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const lines = [];
  for (let x = -400; x < 800; x += gap) lines.push(`M${x} 400 L${x + 400} 0`);
  return (
    <View {...hidden} style={[StyleSheet.absoluteFill, { pointerEvents: "none" }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        <Path d={lines.join(" ")} stroke={color} strokeWidth={width} />
      </Svg>
    </View>
  );
}

// Big type with offset color echoes behind it, like a misregistered poster print.
// The echoes slide out from behind the letters when it mounts.
export function Chroma({
  children,
  size,
  color = C.ink,
  echoes = [C.violet, C.accent],
  offset,
  style,
  delay = 0,
  numberOfLines,
}: {
  children: string;
  size: number;
  color?: string;
  echoes?: string[];
  offset?: number;
  style?: StyleProp<TextStyle>;
  delay?: number;
  numberOfLines?: number;
}) {
  const d = offset ?? Math.max(2, Math.round(size / 16));
  const v = useEntrance(delay + 140, 700);
  const text: TextStyle = {
    fontFamily: fonts.black,
    fontSize: size,
    lineHeight: Math.round(size * 1.02),
    letterSpacing: -size * 0.035,
    color,
    includeFontPadding: false,
  };
  if (Platform.OS === "web")
    return (
      <WebChroma
        v={v}
        d={d}
        echoes={echoes}
        numberOfLines={numberOfLines}
        style={[text, style, { color }]}
      >
        {children}
      </WebChroma>
    );
  return (
    <View>
      {echoes.map((e, i) => {
        const k = (i + 1) * d;
        return (
          <Animated.View
            key={e + i}
            {...hidden}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0.9] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, k] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, k] }) },
              ],
              zIndex: -1 - i,
            }}
          >
            <Text numberOfLines={numberOfLines} style={[text, style, { color: e }]}>
              {children}
            </Text>
          </Animated.View>
        );
      })}
      <Text accessibilityRole="header" numberOfLines={numberOfLines} style={[text, style, { color }]}>
        {children}
      </Text>
    </View>
  );
}

// On web the echoes are a stacked CSS text-shadow, so the words exist once in the page
// (duplicate text nodes confuse find-in-page and text queries).
function WebChroma({
  v,
  d,
  echoes,
  numberOfLines,
  style,
  children,
}: {
  v: Animated.Value;
  d: number;
  echoes: string[];
  numberOfLines?: number;
  style: StyleProp<TextStyle>;
  children: string;
}) {
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = v.addListener(({ value }) => setK(value));
    return () => v.removeListener(id);
  }, [v]);
  const textShadow = echoes
    .map((e, i) => `${(i + 1) * d * k}px ${(i + 1) * d * k}px 0 ${e}`)
    .join(", ");
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={numberOfLines}
      style={[style, { textShadow } as TextStyle]}
    >
      {children}
    </Text>
  );
}

// Counts up to `value` when it mounts.
export function CountUp({
  value,
  style,
  delay = 0,
  duration = 900,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  delay?: number;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || value <= 0) {
      setShown(value);
      return;
    }
    const v = new Animated.Value(0);
    const id = v.addListener(({ value: n }) => setShown(Math.round(n)));
    Animated.timing(v, {
      toValue: value,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => v.removeListener(id);
  }, [value, reduce, delay, duration]);
  return (
    <Text accessibilityLabel={String(value)} style={style}>
      {shown}
    </Text>
  );
}

// A soft ring that keeps breathing outward from a point: "this is live".
export function LiveDot({ color = C.accent, size = 8 }: { color?: string; size?: number }) {
  const v = useLoop(1400, { delay: 200 });
  return (
    <View {...hidden} style={{ width: size * 3, height: size * 3, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: size * 3,
          height: size * 3,
          borderRadius: size * 1.5,
          backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

// Gently bobs its children up and down.
export function Float({
  children,
  distance = 8,
  duration = 2200,
  rotate = 0,
  style,
}: {
  children: React.ReactNode;
  distance?: number;
  duration?: number;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useLoop(duration, { pingPong: true });
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${-rotate}deg`, `${rotate}deg`] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Slanted confetti bars that burst up from the top of the screen and tumble down.
export function Confetti({ count = 36, colors = [C.accent, C.violet, C.coral, C.cyan, C.amber] }: { count?: number; colors?: string[] }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const dir = Math.random() * 2 - 1;
        return {
          color: colors[i % colors.length],
          x: 50 + dir * 8,
          dx: dir * 190 + (Math.random() * 60 - 30),
          up: 90 + Math.random() * 150,
          fall: 520 + Math.random() * 320,
          spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
          w: 6 + Math.random() * 6,
          h: 14 + Math.random() * 14,
          delay: Math.random() * 0.12,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pieces are fixed for the life of the burst
    [count],
  );
  useEffect(() => {
    if (reduce) return;
    Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: ND }).start();
  }, [reduce, v]);
  if (reduce) return null;
  return (
    <View {...hidden} style={[StyleSheet.absoluteFill, { pointerEvents: "none", overflow: "hidden" }]}>
      {pieces.map((p, i) => {
        const t0 = p.delay;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              top: 120,
              left: `${p.x}%`,
              width: p.w,
              height: p.h,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity: v.interpolate({ inputRange: [0, t0, t0 + 0.02, 0.8, 1], outputRange: [0, 0, 1, 1, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, t0, 1], outputRange: [0, 0, p.dx] }) },
                {
                  translateY: v.interpolate({
                    inputRange: [0, t0, t0 + 0.18, 1],
                    outputRange: [0, 0, -p.up, p.fall],
                    easing: Easing.inOut(Easing.quad),
                  }),
                },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] }) },
                { skewX: "-14deg" },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
