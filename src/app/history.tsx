import { History } from "../screens/History";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <History go={go} />;
}
