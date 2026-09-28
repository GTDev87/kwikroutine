import { Profile } from "../screens/Profile";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <Profile go={go} />;
}
