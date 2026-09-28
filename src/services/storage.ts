// Native default; Metro resolves storage.web.ts for the browser preview.
import Storage from "expo-sqlite/kv-store";
import * as SecureStore from "expo-secure-store";
export const read = () => Storage.getItem("kwikroutine.v1");
export const write = (value: string) =>
  Storage.setItem("kwikroutine.v1", value);
export const readClock = () => SecureStore.getItemAsync("kwikroutine.clock");
export const writeClock = (value: string) =>
  SecureStore.setItemAsync("kwikroutine.clock", value);
