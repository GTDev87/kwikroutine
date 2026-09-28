import { Summary } from "../screens/Summary";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <Summary go={go} />;
}
