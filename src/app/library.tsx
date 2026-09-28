import { Library } from "../screens/Library";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <Library go={go} />;
}
