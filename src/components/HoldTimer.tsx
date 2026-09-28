import React, { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { C, Icon, R, T, fonts } from "./ui";
import { LiveDot, Squish } from "./motion";

// Seconds of "get ready" after tapping start, so there's time to get into position.
const LEAD_IN = 3;
const MAX = 300;
const STEP = 5;

type Phase = "idle" | "ready" | "running" | "paused" | "done";

const clock = (sec: number) => {
  const whole = Math.max(0, Math.ceil(sec));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
const tap = () => void Haptics.selectionAsync().catch(() => {});

/**
 * Countdown for timed exercises (planks, holds). Tap the dial to start, pause and resume.
 * Unilateral holds run once per side. `onHeld` reports seconds actually held when the
 * set is paused before the end, and null otherwise, so the parent can log the real time.
 */
export function HoldTimer({
  seconds,
  unilateral = false,
  onChangeSeconds,
  onHeld,
}: {
  seconds: number;
  unilateral?: boolean;
  onChangeSeconds: (seconds: number) => void;
  onHeld: (seconds: number | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle"),
    [side, setSide] = useState<1 | 2>(1),
    [now, setNow] = useState(Date.now());
  // Wall-clock deadlines keep the countdown accurate if the app is backgrounded.
  const endsAt = useRef(0),
    readyUntil = useRef(0),
    left = useRef(seconds * 1000),
    lastBeat = useRef(0);
  const sides = unilateral ? 2 : 1;

  useEffect(() => {
    if (phase !== "ready" && phase !== "running") return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "ready") {
      const beat = Math.ceil((readyUntil.current - now) / 1000);
      if (beat <= 0) {
        endsAt.current = now + left.current;
        setPhase("running");
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      } else if (beat !== lastBeat.current) {
        lastBeat.current = beat;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } else if (phase === "running" && now >= endsAt.current) {
      left.current = 0;
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      if (side < sides) {
        setSide(2);
        left.current = seconds * 1000;
        setPhase("paused");
      } else setPhase("done");
    }
  }, [now, phase, side, sides, seconds]);

  const remainingMs =
    phase === "running"
      ? Math.max(0, endsAt.current - now)
      : phase === "done"
        ? 0
        : left.current;
  const readyLeft = Math.ceil((readyUntil.current - now) / 1000);
  const betweenSides = phase === "paused" && left.current === seconds * 1000;
  const progress = seconds > 0 ? 1 - remainingMs / (seconds * 1000) : 0;

  const press = () => {
    const t = Date.now();
    setNow(t);
    if (phase === "idle" || phase === "paused") {
      if (phase === "idle") left.current = seconds * 1000;
      readyUntil.current = t + LEAD_IN * 1000;
      lastBeat.current = 0;
      onHeld(null);
      setPhase("ready");
    } else if (phase === "ready") {
      setPhase(side === 1 && left.current === seconds * 1000 ? "idle" : "paused");
      tap();
    } else if (phase === "running") {
      left.current = Math.max(0, endsAt.current - t);
      onHeld(Math.max(1, Math.round(seconds - left.current / 1000)));
      setPhase("paused");
      tap();
    }
  };
  const reset = () => {
    left.current = seconds * 1000;
    setSide(1);
    setPhase("idle");
    onHeld(null);
    tap();
  };
  const adjust = (delta: number) => {
    const next = Math.min(MAX, Math.max(STEP, seconds + delta));
    left.current = next * 1000;
    onChangeSeconds(next);
    tap();
  };

  const status =
    phase === "idle"
      ? "Tap to start"
      : phase === "ready"
        ? "Get ready…"
        : phase === "running"
          ? "Tap to pause"
          : phase === "done"
            ? "Time!"
            : betweenSides
              ? "Switch sides · tap to start"
              : "Paused · tap to resume";
  const big =
    phase === "ready" ? String(Math.max(1, readyLeft)) : clock(remainingMs / 1000);
  const live = phase === "running" || phase === "ready";

  return (
    <View style={{ gap: 10 }}>
      <Squish
        accessibilityRole="button"
        accessibilityLabel={`${big}. ${status}`}
        onPress={press}
        disabled={phase === "done"}
        scaleTo={0.97}
        style={{
          borderRadius: R.card,
          borderWidth: 2,
          borderColor: live || phase === "done" ? C.accent : C.line,
          backgroundColor: C.surface,
          paddingVertical: 18,
          paddingHorizontal: 20,
          overflow: "hidden",
          ...(live ? { boxShadow: "0 0 32px rgba(192,244,71,0.25)" } : {}),
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: phase === "done" ? "100%" : `${Math.min(100, Math.max(0, progress * 100))}%`,
            opacity: phase === "done" ? 1 : 0.28,
          }}
        >
          <LinearGradient
            colors={["#D6FF63", C.accent, C.cyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <T
            style={{
              fontSize: 88,
              lineHeight: 96,
              fontFamily: fonts.black,
              letterSpacing: -4,
              color: phase === "done" ? C.onAccent : phase === "ready" ? C.accent : C.ink,
              fontVariant: ["tabular-nums"],
            }}
          >
            {big}
          </T>
          <View style={{ alignItems: "flex-end", gap: 10 }}>
            {unilateral && (
              <T style={{ fontSize: 14, color: phase === "done" ? C.onAccent : C.muted, fontFamily: fonts.semibold }}>
                Side {side} of 2
              </T>
            )}
            {phase === "running" ? (
              <LiveDot size={10} />
            ) : phase !== "done" && phase !== "ready" ? (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: C.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 20px rgba(192,244,71,0.4)",
                }}
              >
                <Icon name="arrow" size={24} color={C.onAccent} />
              </View>
            ) : null}
          </View>
        </View>
        <T
          style={{
            fontSize: 15,
            fontFamily: fonts.bold,
            color: phase === "done" ? C.onAccent : live ? C.accent : C.muted,
          }}
        >
          {status}
        </T>
      </Squish>
      {phase === "idle" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Stepper label={`−${STEP}s`} onPress={() => adjust(-STEP)} disabled={seconds <= STEP} />
          <Stepper label={`+${STEP}s`} onPress={() => adjust(STEP)} disabled={seconds >= MAX} />
          <T style={{ fontSize: 14, color: C.muted, marginLeft: 4 }}>
            {unilateral ? "each side" : "target"}
          </T>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={reset}
          hitSlop={8}
          style={{ alignSelf: "flex-start", paddingVertical: 4 }}
        >
          <T style={{ fontSize: 14, color: C.muted, textDecorationLine: "underline" }}>
            Reset timer
          </T>
        </Pressable>
      )}
    </View>
  );
}

function Stepper({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label.replace("−", "minus ").replace("+", "plus ")}
      onPress={onPress}
      disabled={disabled}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: R.chip,
        borderWidth: 1,
        borderColor: C.line,
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <T style={{ fontSize: 14, fontFamily: fonts.semibold }}>{label}</T>
    </Pressable>
  );
}
