import { Today } from "../screens/Today";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <Today go={go} />;
}
