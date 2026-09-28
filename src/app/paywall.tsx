import { Paywall } from "../screens/Paywall";
import { useGo } from "../navigation";
export default function Route() {
  const go = useGo();
  return <Paywall go={go} />;
}
