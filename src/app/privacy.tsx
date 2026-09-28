import { Privacy } from "../screens/Privacy";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <Privacy go={go} />;
}
