import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { BodyMap } from "../components/BodyMap";
import { PainCheck } from "../components/PainCheck";
import { Button, PageTitle, StepBar } from "../components/ui";
import { Muscle } from "../domain/types";
import { dayKey, todayCheckIn } from "../domain/today";
import { useStore } from "../state/store";
// The daily check-in: the same soreness map as onboarding, saved for today only.
export function CheckIn({ go }: { go: (route: string) => void }) {
  const { data, update } = useStore();
  const current = todayCheckIn(data);
  const [sore, setSore] = useState<Muscle[]>(current.sore),
    [pain, setPain] = useState(current.pain);
  const save = () => {
    update((d) => ({ ...d, checkIn: { ...todayCheckIn(d), day: dayKey(), sore, pain } }));
    go("today");
  };
  return (
    <View style={{ flex: 1 }}>
      <StepBar onBack={() => go("today")} backLabel="Back to today" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 8, gap: 20 }}
      >
        <PageTitle
          title="Anything sore right now?"
          subtitle="Tap where you feel it. We’ll give those muscles a rest."
        />
        <BodyMap selected={sore} onChange={setSore} />
        <PainCheck value={pain} onChange={setPain} />
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 12 }}>
        <Button
          title={sore.length ? "Save check-in" : "Feeling fresh"}
          onPress={save}
        />
      </View>
    </View>
  );
}
