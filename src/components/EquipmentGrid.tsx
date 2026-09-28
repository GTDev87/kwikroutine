import { equipmentPictures } from "../data/equipmentPictures";
import { exerciseImages } from "../data/exerciseImages";
import { equipmentImageIds } from "../data/equipmentImages";
import React, { useState } from "react";
import { Image, Platform, Pressable, TextInput, View } from "react-native";
import { Equipment, EQUIPMENT, equipmentLabels } from "../domain/types";
import { C, Check, TextLink, Icon, Label, R, T, fonts, s } from "./ui";

export const HOME_EQUIPMENT: Equipment[] = [
  "mat",
  "chair",
  "dumbbells",
  "bands",
  "bench",
  "pullup-bar",
  "kettlebells",
  "loop-bands",
];
export const EXTRA_HOME_EQUIPMENT = EQUIPMENT.filter(e => !HOME_EQUIPMENT.includes(e));
export const GYM_MACHINES: Equipment[] = [
  "leg-press",
  "cable",
  "row-machine",
  "chest-press",
  "leg-extension",
  "leg-curl",
];
export const GYM_FREE: Equipment[] = [
  "rack",
  "barbell",
  "dumbbells",
  "bench",
  "pullup-bar",
  "mat",
];
export const GYM_EQUIPMENT = [...new Set([...GYM_MACHINES, ...GYM_FREE])];
export const EXTRA_GYM_EQUIPMENT = EQUIPMENT.filter(e => !GYM_EQUIPMENT.includes(e));

function Tile({
  label,
  on,
  onPress,
  icon,
  equipment,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: "home" | "gym";
  equipment?: Equipment;
}) {
  const picture = equipment && equipmentPictures[equipment] ? equipmentPictures[equipment] : equipment === "rack" ? require("../../assets/commons/power-rack.jpg") : equipment === "chair" ? require("../../assets/commons/chair-squat.png") : equipment && exerciseImages[equipmentImageIds[equipment] ?? ""]?.[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      {...(Platform.OS === "web" ? { "aria-pressed": on } : {})}
      onPress={onPress}
      style={({ pressed }) => ({
        width: "31.5%",
        borderRadius: R.control,
        backgroundColor: C.surface,
        borderWidth: 2,
        borderColor: on ? C.accent : C.line,
        padding: 5,
        paddingBottom: 0,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {/* Every tile shows the same light plate, with or without a photo. */}
      <View style={{ height: 88, borderRadius: R.control - 5, overflow: "hidden", backgroundColor: C.plate, alignItems: "center", justifyContent: "center" }}>
        {picture ? (
          <Image source={picture} accessibilityLabel={`${label} equipment example`} resizeMode="contain" style={{ height: "100%", width: "100%" }} />
        ) : (
          <Icon name={icon ?? "gym"} color={C.plateIcon} size={28} />
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 6,
          paddingHorizontal: 5,
          paddingTop: 8,
          paddingBottom: 10,
          minHeight: 44,
        }}
      >
        <T
          style={{
            flex: 1,
            fontSize: 13,
            lineHeight: 16,
            fontFamily: fonts.semibold,
          }}
        >
          {label}
        </T>
        <Check on={on} size={18} />
      </View>
    </Pressable>
  );
}
export function EquipmentGrid({
  items,
  selected,
  onChange,
  title,
  bodyweightTile = false,
  initiallyCollapsed = false,
}: {
  items: Equipment[];
  selected: Equipment[];
  onChange: (next: Equipment[]) => void;
  title?: string;
  bodyweightTile?: boolean;
  initiallyCollapsed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const large = items.length > 12 || initiallyCollapsed;
  const visible = items.filter(e => `${e} ${equipmentLabels[e]}`.toLowerCase().replace(/-/g, " ").includes(query.toLowerCase().replace(/-/g, " ").trim()));
  const shown = large && !expanded ? visible.slice(0, initiallyCollapsed ? 0 : 9) : visible;
  const toggle = (e: Equipment) =>
    onChange(
      selected.includes(e) ? selected.filter((x) => x !== e) : [...selected, e],
    );
  return (
    <View style={{ gap: 10 }}>
      {!!title && <Label>{title}</Label>}
      {large && expanded && <TextInput accessibilityLabel="Find equipment" placeholder="Find a machine or equipment…" value={query} onChangeText={setQuery} style={s.input} placeholderTextColor={C.faint} />}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {bodyweightTile && (
          <Tile
            label="Just my body"
            icon="home"
            on={selected.length === 0}
            onPress={() => onChange([])}
          />
        )}
        {shown.map((e) => (
          <Tile
            key={e}
            equipment={e}
            label={equipmentLabels[e]}
            icon="gym"
            on={selected.includes(e)}
            onPress={() => toggle(e)}
          />
        ))}
      </View>
      {expanded && !shown.length && <T style={[s.small, s.muted]}>No equipment matches. Try another name.</T>}
      {large && <TextLink title={expanded ? "Show fewer" : `More equipment (${items.length - (initiallyCollapsed ? 0 : 9)})`} style={{ alignSelf: "flex-start", paddingVertical: 6 }} onPress={() => {setExpanded(!expanded);setQuery("");}} />}
    </View>
  );
}
