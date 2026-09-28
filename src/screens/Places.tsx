import React, { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { EquipmentGrid, HOME_EQUIPMENT, EXTRA_HOME_EQUIPMENT } from "../components/EquipmentGrid";
import {
  Button,
  C,
  Chip,
  Icon,
  Label,
  PageTitle,
  R,
  StepBar,
  T,
  Tag,
  TextLink,
  fonts,
  s,
} from "../components/ui";
import { Place, equipmentLabels } from "../domain/types";
import { useStore } from "../state/store";

const kinds = { bedroom: "Bedroom / living room", home: "Home", gym: "Gym", other: "Other" } as const;
const newPlace = (): Place => ({
  id: `place-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  name: "",
  kind: "other",
  equipment: [],
});
export function Places({ startAdding = false, onDone, onBack }: { startAdding?: boolean; onDone?: () => void; onBack: () => void }) {
  const { data, update } = useStore();
  const [edit, setEdit] = useState<Place | null>(() => startAdding ? newPlace() : null),
    [remove, setRemove] = useState(false);
  const save = () => {
    if (!edit?.name.trim()) return;
    update((d) => ({
      ...d,
      selectedLocationId: d.locations.some((p) => p.id === edit.id) ? d.selectedLocationId : edit.id,
      locations: d.locations.some((p) => p.id === edit.id)
        ? d.locations.map((p) =>
            p.id === edit.id ? { ...edit, name: edit.name.trim() } : p,
          )
        : [...d.locations, { ...edit, name: edit.name.trim() }],
    }));
    setEdit(null);
    setRemove(false);
    onDone?.();
  };
  const deletePlace = () => {
    if (
      !edit ||
      data.locations.length < 2 ||
      data.session?.locationId === edit.id
    )
      return;
    update((d) => {
      const locations = d.locations.filter((p) => p.id !== edit.id);
      return {
        ...d,
        locations,
        selectedLocationId:
          d.selectedLocationId === edit.id
            ? locations[0].id
            : d.selectedLocationId,
      };
    });
    setEdit(null);
    setRemove(false);
  };
  if (edit) {
    const exists = data.locations.some((p) => p.id === edit.id);
    const cancel = () => {
      setEdit(null);
      setRemove(false);
      onDone?.();
    };
    return (
      <View style={{ flex: 1 }}>
      <StepBar onBack={cancel} backLabel="Back to places" />
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: 8 }]}
        keyboardShouldPersistTaps="handled"
      >
        <PageTitle title={exists ? "Edit place" : "New place"} />
        <View style={{ gap: 8 }}>
          <Label>Name</Label>
          <TextInput
            accessibilityLabel="Location name"
            style={s.input}
            placeholder="e.g. Hotel gym, office, or park"
            placeholderTextColor={C.faint}
            selectionColor={C.accent}
            value={edit.name}
            maxLength={40}
            onChangeText={(name) => setEdit({ ...edit, name })}
          />
        </View>
        <View style={s.wrap}>
          {(Object.keys(kinds) as Place["kind"][]).map((kind) => (
            <Chip
              key={kind}
              label={kinds[kind]}
              selected={edit.kind === kind}
              onPress={() => setEdit({ ...edit, kind })}
            />
          ))}
        </View>
        <T style={s.muted}>
          Every place can have any equipment. Tap what you have, or leave it empty for bodyweight workouts.
        </T>
        <EquipmentGrid
          title="Common equipment"
          items={HOME_EQUIPMENT}
          selected={edit.equipment}
          onChange={(equipment) => setEdit({ ...edit, equipment })}
        />
        <EquipmentGrid
          title="Machines & more equipment"
          items={EXTRA_HOME_EQUIPMENT}
          selected={edit.equipment}
          onChange={(equipment) => setEdit({ ...edit, equipment })}
        />
        <Button
          title="Save place"
          disabled={!edit.name.trim()}
          onPress={save}
        />
        <Button title="Cancel" ghost onPress={cancel} />
        {exists &&
          data.locations.length > 1 &&
          data.session?.locationId !== edit.id && (
            <Button
              title={remove ? "Confirm remove place" : "Remove place"}
              ghost
              onPress={() => (remove ? deletePlace() : setRemove(true))}
            />
          )}
      </ScrollView>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
    <StepBar onBack={onBack} />
    <ScrollView contentContainerStyle={[s.page, { paddingTop: 8 }]}>
      <PageTitle
        title="Places"
        subtitle="Save as many as you need. Each remembers its own equipment."
      />
      <Button
        title="Add a place"
        secondary
        icon="plus"
        onPress={() => { setRemove(false); setEdit(newPlace()); }}
      />
      {data.locations.map((place) => {
        const selected = data.selectedLocationId === place.id;
        return (
          <View
            key={place.id}
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
              <View style={[s.row, { flex: 1 }]}>
                <Icon
                  name={place.kind === "gym" || place.kind === "other" ? "gym" : "home"}
                  color={C.muted}
                />
                <View style={{ flex: 1 }}>
                  <View style={[s.row, { gap: 8 }]}>
                    <T style={{ fontSize: 17, fontFamily: fonts.semibold }}>
                      {place.name}
                    </T>
                    {selected && <Tag label="Today" accent small />}
                  </View>
                  {kinds[place.kind] !== place.name && (
                    <T style={[s.small, s.muted]}>{kinds[place.kind]}</T>
                  )}
                </View>
              </View>
              <TextLink
                title="Edit"
                label={`Edit ${place.name}`}
                onPress={() => setEdit({ ...place, equipment: [...place.equipment] })}
              />
            </View>
            <T style={[s.small, s.muted]}>
              {place.equipment.map((e) => equipmentLabels[e]).join(" · ") ||
                "Just your body"}
            </T>
            {!selected && (
              <TextLink
                title="Train here today"
                onPress={() => update((d) => ({ ...d, selectedLocationId: place.id }))}
              />
            )}
          </View>
        );
      })}
      <View style={[s.notice, { flexDirection: "row", gap: 10 }]}>
        <Icon name="lock" size={18} color={C.muted} />
        <T style={[s.small, s.muted, { flex: 1 }]}>
          These are just names you choose. We don’t request or track your
          location.
        </T>
      </View>
    </ScrollView>
    </View>
  );
}
