export const read = async () => localStorage.getItem("kwikroutine.v1");
export const write = async (value: string) =>
  localStorage.setItem("kwikroutine.v1", value);
export const readClock = async () => localStorage.getItem("kwikroutine.clock");
export const writeClock = async (value: string) =>
  localStorage.setItem("kwikroutine.clock", value);
