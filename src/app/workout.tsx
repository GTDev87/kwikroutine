import { Workout } from "../screens/Workout";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <Workout go={go} />;
}
