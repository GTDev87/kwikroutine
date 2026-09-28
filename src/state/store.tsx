import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { AppData, initialData } from "../domain/types";
import * as storage from "../services/storage";
import { dataSchema } from "./schema";

type Store = {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  loaded: boolean;
  error: string | null;
  retry: () => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(initialData);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(data),
    queue = useRef(Promise.resolve());
  const persist = useCallback((next: AppData) => {
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        await storage.writeClock(
          JSON.stringify({
            startedAt: next.trialStartedAt,
            lastSeenAt: next.lastSeenAt,
          }),
        );
        await storage.write(JSON.stringify(next));
        setError(null);
      })
      .catch(() =>
        setError(
          "Your latest changes could not be saved. Free up device storage and try again.",
        ),
      );
  }, []);
  const update = useCallback(
    (fn: (d: AppData) => AppData) => {
      const next = fn(ref.current);
      ref.current = next;
      setData(next);
      persist(next);
    },
    [persist],
  );
  const load = useCallback(async () => {
    try {
      const [raw, clockRaw] = await Promise.all([
        storage.read(),
        storage.readClock(),
      ]);
      const restored = raw
        ? dataSchema.parse(JSON.parse(raw))
        : (JSON.parse(JSON.stringify(initialData)) as AppData);
      if (clockRaw) {
        const clock = JSON.parse(clockRaw);
        if (typeof clock.startedAt === "number")
          restored.trialStartedAt = Math.min(
            restored.trialStartedAt ?? Infinity,
            clock.startedAt,
          );
        if (typeof clock.lastSeenAt === "number")
          restored.lastSeenAt = Math.max(restored.lastSeenAt, clock.lastSeenAt);
      }
      restored.lastSeenAt = Math.max(Date.now(), restored.lastSeenAt);
      ref.current = restored;
      setData(restored);
      setLoaded(true);
      setError(null);
      persist(restored);
    } catch {
      setError(
        "Your saved data could not be opened. Nothing has been erased. Try again.",
      );
    }
  }, [persist]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active" && loaded)
        update((d) => ({
          ...d,
          lastSeenAt: Math.max(Date.now(), d.lastSeenAt),
        }));
    });
    return () => subscription.remove();
  }, [loaded, update]);
  return (
    <Context.Provider
      value={{
        data,
        update,
        loaded,
        error,
        retry: () => (loaded ? persist(ref.current) : void load()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("Missing StoreProvider");
  return store;
}
