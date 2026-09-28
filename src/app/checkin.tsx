import { CheckIn } from "../screens/CheckIn";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <CheckIn go={go} />;
}
