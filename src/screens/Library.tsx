import React, { useState } from "react";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import {
  Button,
  C,
  Card,
  Chip,
  Icon,
  Label,
  PageTitle,
  R,
  StepBar,
  T,
  Tag,
  fonts,
  s,
} from "../components/ui";
import { ExercisePicture, picturesFor } from "../components/ExercisePicture";
import { exercises } from "../data/exercises";
import { Exercise, MUSCLES, equipmentLabels, titleCase } from "../domain/types";
export function Library({ go }: { go: (route: string) => void }) {
  const [query, setQuery] = useState(""),
    [muscle, setMuscle] = useState("all"),
    [visibleCount, setVisibleCount] = useState(30),
    [detail, setDetail] = useState<Exercise | null>(null);
  if (detail)
    return (
      <View style={{ flex: 1 }}>
      <StepBar onBack={() => setDetail(null)} backLabel="Back to the library" />
      <ScrollView contentContainerStyle={[s.page, { paddingTop: 8 }]}>
        {!!picturesFor(detail).length && <ExercisePicture key={detail.id} exercise={detail} height={280} poses />}
        <PageTitle eyebrow={`${titleCase(detail.level)} · ${titleCase(detail.pattern)}`} title={detail.name} />
        <View style={s.wrap}>
          {detail.primary.map((m) => (
            <Tag key={m} label={titleCase(m)} accent />
          ))}
        </View>
        <T style={s.muted}>
          {detail.equipment.length
            ? detail.equipment.map((e) => equipmentLabels[e]).join(" · ")
            : "No equipment needed"}
        </T>
        <Card>
          <Label>How to move</Label>
          {detail.steps.map((text, i) => (
            <View style={[s.row, { alignItems: "flex-start" }]} key={i}>
              <T style={{ color: C.muted, fontFamily: fonts.mono, width: 14 }}>{i + 1}</T>
              <T style={{ flex: 1 }}>{text}</T>
            </View>
          ))}
        </Card>
        <Card>
          <Label>Tip</Label>
          <T>{detail.tip}</T>
        </Card>
        {!!detail.secondary.length && (
          <T style={[s.small, s.muted]}>
            Also works: {detail.secondary.map(titleCase).join(", ")}
          </T>
        )}
        {!!picturesFor(detail).length && <T style={[s.small, s.muted]}>
          Illustrations are visual references. Follow the written steps and your machine’s instructions. Stop if a movement causes pain.
        </T>}
      </ScrollView>
      </View>
    );
  const filtered = exercises.filter(
    (e) =>
      (muscle === "all" || e.primary.includes(muscle as any)) &&
      `${e.name} ${e.primary.join(" ")} ${e.equipment.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <View style={{ flex: 1 }}>
    <StepBar onBack={() => go("profile")} />
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: 8 }]}
      keyboardShouldPersistTaps="handled"
    >
      <PageTitle
        title="Exercises"
        subtitle={`${exercises.length} moves. Search by name, muscle, or equipment.`}
      />
      <TextInput
        accessibilityLabel="Search exercises"
        style={s.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search moves, muscles, equipment…"
        placeholderTextColor={C.faint}
        selectionColor={C.accent}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <Chip
          label="All moves"
          selected={muscle === "all"}
          onPress={() => setMuscle("all")}
        />
        {MUSCLES.map((m) => (
          <Chip
            key={m}
            label={titleCase(m)}
            selected={muscle === m}
            onPress={() => setMuscle(m)}
          />
        ))}
      </ScrollView>
      <View>
        {filtered.slice(0, visibleCount).map((ex, i) => (
          <Pressable
            key={ex.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${ex.name}`}
            onPress={() => setDetail(ex)}
            style={({ pressed }) => [
              s.row,
              {
                paddingVertical: 10,
                gap: 14,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: C.line2,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View
              style={{
                height: 56,
                width: 56,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: C.plate,
                borderRadius: R.chip,
                overflow: "hidden",
              }}
            >
              {picturesFor(ex).length ? (
                <Image
                  source={picturesFor(ex)[0]}
                  accessibilityLabel={`${ex.name} illustration`}
                  resizeMode="cover"
                  style={{ width: 56, height: 56 }}
                />
              ) : (
                <Icon color={C.plateIcon} name={ex.equipment.length ? "gym" : "spark"} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={s.bold}>{ex.name}</T>
              <T style={[s.small, s.muted]}>
                {ex.primary.map(titleCase).join(" + ")} · {titleCase(ex.level)}
              </T>
            </View>
            <Icon name="chevron" size={16} color={C.faint} />
          </Pressable>
        ))}
      </View>
      {filtered.length > visibleCount && <Button title="Show more exercises" secondary onPress={() => setVisibleCount(n => n + 30)} />}
      {!filtered.length && (
        <Card>
          <T style={{ fontSize: 17, fontFamily: fonts.semibold }}>No moves found</T>
          <T style={s.muted}>Try another search or muscle group.</T>
          <Button
            title="Clear filters"
            secondary
            onPress={() => {
              setQuery("");
              setMuscle("all");
            }}
          />
        </Card>
      )}
    </ScrollView>
    </View>
  );
}
