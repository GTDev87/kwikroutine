import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
// Dark theme from the Kwikroutine design: near-black surfaces, one lime accent.
export const C = {
  bg: "#0C0C0D",
  surface: "#18181A",
  surface2: "#242427",
  line: "#2E2E32",
  line2: "#232326",
  ink: "#F5F5F2",
  muted: "#A0A0A6",
  faint: "#65656B",
  body: "#1E1E21",
  region: "#34343A",
  stripeA: "#1A1A1D",
  stripeB: "#212124",
  bar: "#111113",
  accent: "#C0F447",
  accentSoft: "rgba(192,244,71,0.14)",
  onAccent: "#0D0D0E",
  mild: "#F5B75B",
  moderate: "#FA7C20",
  severe: "#F13A32",
  danger: "#FF7A6E",
  // Light backdrop behind photos and illustrations, so every picture sits on the same plate.
  plate: "#ECECE8",
  plateIcon: "#8C8C92",
};
// One radius per kind of surface: tags, chips, controls (buttons/inputs/tiles), cards, sheets.
export const R = { tag: 8, chip: 12, control: 16, card: 20, sheet: 28 };
// Heading sizes: hero moments, screen titles, titles inside cards.
export const sizes = { display: 34, title: 30, card: 26 };
export const fonts = {
  body: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
  bold: "Outfit_700Bold",
  black: "Outfit_800ExtraBold",
  mono: "DMMono_500Medium",
};
export function T({ style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[
        { color: C.ink, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
        style,
      ]}
    />
  );
}
export function Heading({
  children,
  size = 30,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  style?: TextProps["style"];
}) {
  return (
    <T
      accessibilityRole="header"
      style={[
        {
          fontFamily: fonts.black,
          fontSize: size,
          lineHeight: Math.round(size * 1.1),
          letterSpacing: -size * 0.03,
        },
        style,
      ]}
    >
      {children}
    </T>
  );
}
// Small uppercase mono caption used for eyebrows and section labels.
export function Label({
  children,
  color = C.muted,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: TextProps["style"];
}) {
  return (
    <T
      style={[
        {
          color,
          fontFamily: fonts.mono,
          fontSize: 11,
          lineHeight: 15,
          letterSpacing: 0.66,
          textTransform: "uppercase",
        },
        style,
      ]}
    >
      {children}
    </T>
  );
}
export type IconName =
  | "arrow"
  | "back"
  | "close"
  | "check"
  | "spark"
  | "home"
  | "gym"
  | "bed"
  | "clock"
  | "leaf"
  | "book"
  | "chart"
  | "settings"
  | "plus"
  | "chevron"
  | "lock"
  | "refresh";
export function Icon({
  name,
  size = 22,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <Path d="M4 12h15m-6-6 6 6-6 6" />,
    back: <Path d="m15 5-7 7 7 7" />,
    close: <Path d="m6 6 12 12M18 6 6 18" />,
    check: <Path d="m5 12 4 4L19 6" />,
    spark: (
      <Path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z" />
    ),
    home: (
      <>
        <Path d="m3 10 9-7 9 7v10H3V10Z" />
        <Path d="M9 20v-7h6v7" />
      </>
    ),
    gym: <Path d="M7 12h10M3 8v8m4-11v14M17 5v14m4-11v8" />,
    bed: <Path d="M3 20V7m18 13v-9H3m0 6h18M7 7h5v4H7V7Z" />,
    clock: (
      <>
        <Circle cx="12" cy="12" r="9" />
        <Path d="M12 7v5l3 2" />
      </>
    ),
    leaf: (
      <>
        <Path d="M20 3C7 1 1 10 6 17c7 5 16-1 14-14Z" />
        <Path d="m4 21 11-12" />
      </>
    ),
    book: (
      <>
        <Rect x="5" y="3" width="14" height="18" rx="2" />
        <Path d="M9 3v18m4-12h3m-3 4h3" />
      </>
    ),
    chart: <Path d="M5 20v-5m7 5V9m7 11V4" />,
    settings: (
      <>
        <Circle cx="12" cy="12" r="3" />
        <Path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z" />
      </>
    ),
    plus: <Path d="M12 5v14M5 12h14" />,
    chevron: <Path d="m9 5 7 7-7 7" />,
    lock: (
      <>
        <Rect x="5" y="10" width="14" height="11" rx="2" />
        <Path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    refresh: <Path d="M20 8a9 9 0 1 0 0 8M20 3v5h-5" />,
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </Svg>
  );
}
// Logo direction 2c: three rising, slanted bars, the level indicator used across the app.
export function LogoMark({ size = 36 }: { size?: number }) {
  const k = size / 36;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: 10 * k,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: "rgba(128,128,128,0.25)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 2 * k,
          transform: [{ skewX: "-14deg" }],
        }}
      >
        {[
          [9, 0.45],
          [15, 0.7],
          [21, 1],
        ].map(([h, o]) => (
          <View
            key={h}
            style={{
              width: 5 * k,
              height: h * k,
              borderRadius: 1 * k,
              backgroundColor: C.accent,
              opacity: o,
            }}
          />
        ))}
      </View>
    </View>
  );
}
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <View
      accessible
      accessibilityLabel="kwikroutine"
      style={{ flexDirection: "row", alignItems: "center", gap: size / 2 }}
    >
      <LogoMark size={size * 1.5} />
      <T
        style={{
          fontFamily: fonts.black,
          fontSize: size,
          lineHeight: size * 1.1,
          letterSpacing: -size * 0.045,
        }}
      >
        kwik<T style={{ fontFamily: fonts.body, fontSize: size }}>routine</T>
      </T>
    </View>
  );
}
// 1–3 rising bars that show difficulty (beginner, intermediate, advanced).
export function LevelBars({
  level,
  size = 18,
  color = C.ink,
}: {
  level: 1 | 2 | 3;
  size?: number;
  color?: string;
}) {
  const w = Math.round(size * 0.28);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: w * 0.6,
        height: size,
      }}
    >
      {[0.4, 0.67, 1].map((h, i) => (
        <View
          key={i}
          style={{
            width: w,
            height: size * h,
            borderRadius: 2,
            backgroundColor: i < level ? color : C.line,
          }}
        />
      ))}
    </View>
  );
}
export function Segments({
  total,
  done,
  current,
  height = 4,
  gap = 6,
}: {
  total: number;
  done: number;
  current?: number;
  height?: number;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap, flex: 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: height / 2,
            backgroundColor: i < done || i === current ? C.accent : C.line,
          }}
        />
      ))}
    </View>
  );
}
// Back chevron, optional step progress, optional trailing action.
export function StepBar({
  onBack,
  backLabel = "Back",
  step,
  steps = 4,
  action,
}: {
  onBack?: () => void;
  backLabel?: string;
  step?: number;
  steps?: number;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        height: 44,
        paddingHorizontal: 16,
      }}
    >
      {onBack ? (
        <IconButton name="back" label={backLabel} onPress={onBack} />
      ) : (
        <View style={{ width: 40 }} />
      )}
      {step !== undefined ? (
        <Segments total={steps} done={step} />
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          hitSlop={10}
        >
          <T style={{ color: C.muted, fontSize: 15 }}>{action.label}</T>
        </Pressable>
      ) : (
        step !== undefined && <View style={{ width: 8 }} />
      )}
    </View>
  );
}
// Stand-in for a picture that doesn’t exist yet: the same plate real pictures sit on.
export function Placeholder({
  label,
  style,
  radius = R.control,
  children,
}: {
  label?: string;
  style?: ViewStyle;
  radius?: number;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor: C.surface2,
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      {children}
      {!!label && <T style={[s.small, s.muted]}>{label}</T>}
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  ghost = false,
  disabled = false,
  busy = false,
  icon,
  detail,
  style,
  testID,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  ghost?: boolean;
  disabled?: boolean;
  busy?: boolean;
  icon?: IconName;
  detail?: string;
  style?: ViewStyle;
  testID?: string;
}) {
  const off = disabled && !busy;
  const fg = off ? C.faint : ghost ? C.muted : secondary ? C.ink : C.onAccent;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        ghost
          ? { backgroundColor: "transparent" }
          : off
            ? { backgroundColor: C.surface2 }
            : secondary
              ? {
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.line,
                }
              : { backgroundColor: C.accent },
        { opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <T
            style={{
              fontFamily: secondary || ghost ? fonts.semibold : fonts.bold,
              color: fg,
              fontSize: 17,
            }}
          >
            {title}
            {!!detail && (
              <T style={{ color: fg, opacity: 0.6, fontSize: 14 }}>
                {"  ·  "}
                {detail}
              </T>
            )}
          </T>
          {icon && <Icon name={icon} color={fg} size={20} />}
        </>
      )}
    </Pressable>
  );
}
export function Chip({
  label,
  selected = false,
  onPress,
  small = false,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      {...(Platform.OS === "web" ? { "aria-pressed": selected } : {})}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderWidth: 1.5,
          borderColor: selected ? C.accent : C.line,
          backgroundColor: selected ? C.accentSoft : C.surface,
          paddingHorizontal: small ? 11 : 14,
          paddingVertical: small ? 5.5 : 8.5,
          borderRadius: R.chip,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <T
        style={{
          color: C.ink,
          fontSize: small ? 13 : 14,
          fontFamily: fonts.semibold,
        }}
      >
        {label}
      </T>
    </Pressable>
  );
}
// Static muscle / tag pill.
export function Tag({
  label,
  accent = false,
  solid = false,
  small = false,
}: {
  label: string;
  accent?: boolean;
  // Solid lime for badges that sit on top of pictures, where the tint wouldn’t read.
  solid?: boolean;
  small?: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: small ? 9 : 10,
        paddingVertical: small ? 4 : 5,
        borderRadius: R.tag,
        backgroundColor: solid ? C.accent : accent ? C.accentSoft : C.surface2,
      }}
    >
      <T
        style={{
          fontSize: small ? 12 : 13,
          lineHeight: small ? 16 : 18,
          fontFamily: fonts.medium,
          color: solid ? C.onAccent : accent ? C.accent : C.ink,
        }}
      >
        {label}
      </T>
    </View>
  );
}
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={s.iconButton}
    >
      <Icon name={name} color={C.muted} size={26} />
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
// Inline action: always lime, always the same weight. Dismissive actions use ghost buttons.
export function TextLink({
  title,
  onPress,
  label,
  style,
}: {
  title: string;
  onPress: () => void;
  label?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, style]}
    >
      <T style={{ color: C.accent, fontFamily: fonts.semibold, fontSize: 14 }}>
        {title}
      </T>
    </Pressable>
  );
}
// Screen title block: one size, optional subtitle, used at the top of every screen.
export function PageTitle({
  title,
  subtitle,
  eyebrow,
  size = sizes.title,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  size?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      {!!eyebrow && <Label style={{ fontSize: 12 }}>{eyebrow}</Label>}
      <Heading size={size}>{title}</Heading>
      {!!subtitle && (
        <T style={{ color: C.muted, fontSize: 15, lineHeight: 22 }}>{subtitle}</T>
      )}
    </View>
  );
}
// Section heading with an optional inline action on the right.
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { title: string; onPress: () => void; label?: string };
}) {
  return (
    <View style={[s.between, { minHeight: 22 }]}>
      <T style={s.sectionTitle}>{title}</T>
      {action && <TextLink {...action} />}
    </View>
  );
}
// Selectable card: surface with a lime border when chosen, radio or check on the right.
export function OptionCard({
  selected,
  onPress,
  title,
  subtitle,
  children,
  role = "radio",
  trailing,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  role?: "radio" | "checkbox";
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={title}
      accessibilityState={{ checked: selected }}
      {...(Platform.OS === "web" ? { "aria-checked": selected } : {})}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: R.card,
        backgroundColor: C.surface,
        borderWidth: 2,
        borderColor: selected ? C.accent : C.line,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <View style={{ flex: 1, gap: 3 }}>
          <T style={{ fontSize: 16, lineHeight: 21, fontFamily: fonts.semibold }}>{title}</T>
          {!!subtitle && (
            <T style={{ fontSize: 14, lineHeight: 19, color: C.muted }}>{subtitle}</T>
          )}
        </View>
        {trailing}
        {role === "radio" ? <Radio on={selected} /> : <Check on={selected} />}
      </View>
      {children}
    </Pressable>
  );
}
export function Radio({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: on ? C.accent : C.faint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on && (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: C.accent,
          }}
        />
      )}
    </View>
  );
}
export function Check({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        borderWidth: 2,
        borderColor: on ? C.accent : C.line,
        backgroundColor: on ? C.accent : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on && <Icon name="check" size={size * 0.7} color={C.onAccent} />}
    </View>
  );
}
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      {...(Platform.OS === "web" ? { "aria-checked": value } : {})}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        padding: 3,
        backgroundColor: value ? C.accent : C.line,
        alignItems: value ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: C.surface,
        }}
      />
    </Pressable>
  );
}
// Grouped settings list, as in the profile screen.
export function ListGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: R.card,
        borderWidth: 1,
        borderColor: C.line2,
        overflow: "hidden",
      }}
    >
      {items.map((child, i) => (
        <View
          key={i}
          style={i ? { borderTopWidth: 1, borderTopColor: C.line2 } : undefined}
        >
          {child}
        </View>
      ))}
    </View>
  );
}
export function ListRow({
  title,
  subtitle,
  value,
  action,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  action?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={
        accessibilityLabel ?? (action ? `${action} ${title}` : title)
      }
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: subtitle ? 12 : 14,
        gap: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 96 }}>
        <T
          style={{
            fontSize: 15,
            fontFamily: subtitle ? fonts.semibold : fonts.body,
          }}
        >
          {title}
        </T>
        {!!subtitle && <T style={[s.small, s.muted]}>{subtitle}</T>}
      </View>
      {!!value && (
        <T
          style={{
            color: C.muted,
            fontSize: 14,
            flexShrink: 1,
            maxWidth: "62%",
            textAlign: "right",
          }}
          numberOfLines={1}
        >
          {value}
        </T>
      )}
      {action ? (
        <T
          style={{ color: C.accent, fontFamily: fonts.semibold, fontSize: 14 }}
        >
          {action}
        </T>
      ) : (
        onPress && <Icon name="chevron" size={16} color={C.faint} />
      )}
    </Pressable>
  );
}
export function Stat({
  value,
  label,
  accent = false,
  style,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flex: 1,
          padding: 14,
          borderRadius: R.card,
          backgroundColor: accent ? C.accentSoft : C.surface,
          borderWidth: accent ? 0 : 1,
          borderColor: C.line2,
        },
        style,
      ]}
    >
      <T
        style={{
          fontSize: 26,
          lineHeight: 32,
          fontFamily: fonts.bold,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </T>
      <T
        style={{
          fontSize: 13,
          lineHeight: 17,
          color: accent ? C.accent : C.muted,
        }}
      >
        {label}
      </T>
    </View>
  );
}
export const s = StyleSheet.create({
  page: { padding: 24, paddingBottom: 32, gap: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  muted: { color: C.muted },
  small: { fontSize: 13, lineHeight: 18 },
  bold: { fontFamily: fonts.semibold },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.line2,
    padding: 20,
    gap: 12,
  },
  button: {
    minHeight: 56,
    borderRadius: R.control,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.control,
    color: C.ink,
    fontFamily: fonts.body,
    fontSize: 16,
    padding: 16,
    minHeight: 52,
  },
  divider: { height: 1, backgroundColor: C.line2 },
  notice: {
    backgroundColor: C.surface,
    borderRadius: R.control,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: C.line2,
  },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold },
  sectionLabel: { marginTop: 4, marginBottom: -8 },
});
