import React from "react";
import { View } from "react-native";
import { C, R, T, Toggle, fonts, s } from "./ui";
// Pain is different from soreness: it blocks today’s workout rather than steering it.
export function PainCheck({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: R.card,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.line2,
        gap: 10,
      }}
    >
      <View style={s.between}>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: fonts.semibold }}>
            Pain or a possible injury?
          </T>
          <T style={[s.small, s.muted]}>
            Different from ordinary muscle soreness.
          </T>
        </View>
        <Toggle
          label="Pain or a possible injury"
          value={value}
          onChange={onChange}
        />
      </View>
      {value && (
        <T style={{ color: C.danger, fontSize: 14, lineHeight: 20 }}>
          Let’s skip today’s workout. This app can’t assess an injury. Get
          appropriate advice before exercising through pain.
        </T>
      )}
    </View>
  );
}
