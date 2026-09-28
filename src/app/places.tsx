import { Places } from "../screens/Places";
import { useLocalSearchParams } from "expo-router";
import { useGo } from "../navigation";
export default function Route() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const go = useGo();
  return (
    <Places
      startAdding={add === "1"}
      onDone={add === "1" ? () => go("today") : undefined}
      onBack={() => go("profile")}
    />
  );
}
