import { router, type Href } from "expo-router";
import { access } from "./domain/engine";
import { useStore } from "./state/store";
export function useGo() {
  const { data } = useStore();
  return (next: string) => {
    if (next === "setup" && !access(data).allowed) next = "paywall";
    else if (next === "setup" && data.session) next = "workout";
    router.replace((next === "today" ? "/" : `/${next}`) as Href);
  };
}
// Where the back chevron (and Android back) leads from each pushed screen.
export const backTarget: Record<string, string> = {
  paywall: "today",
  library: "profile",
  places: "profile",
  routine: "profile",
  "today-style": "today",
  privacy: "profile",
  checkin: "today",
};
