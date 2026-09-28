import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ modules: {} as Record<string, unknown>, imported: vi.fn() }));
vi.mock("react-native", () => ({ NativeModules: mocks.modules }));
vi.mock("onnxruntime-react-native", () => { mocks.imported(); return { InferenceSession: {} }; });
import { loadNativeOrt } from "../src/services/nativeOrt";

afterEach(() => { delete mocks.modules.Onnxruntime; vi.unstubAllGlobals(); vi.clearAllMocks(); vi.resetModules(); });
describe("native runtime initialization", () => {
  it("avoids the fatal module import when native registration is missing", async () => {
    vi.stubGlobal("OrtApi", undefined);
    await expect(loadNativeOrt()).rejects.toThrow("not registered");
    expect(mocks.imported).not.toHaveBeenCalled();
  });
  it("avoids the fatal module import when installation does not initialize JSI", async () => {
    vi.stubGlobal("OrtApi", undefined);
    mocks.modules.Onnxruntime = { install: () => false };
    await expect(loadNativeOrt()).rejects.toThrow("could not initialize");
    expect(mocks.imported).not.toHaveBeenCalled();
  });
  it("loads the library after native installation initializes JSI", async () => {
    vi.stubGlobal("OrtApi", undefined);
    const install = vi.fn(() => { vi.stubGlobal("OrtApi", {}); return true; });
    mocks.modules.Onnxruntime = { install };
    await expect(loadNativeOrt()).resolves.toHaveProperty("InferenceSession");
    expect(install).toHaveBeenCalledOnce();
  });
  it("keeps an existing JSI runtime instead of installing it again", async () => {
    vi.stubGlobal("OrtApi", {});
    const install = vi.fn();
    mocks.modules.Onnxruntime = { install };
    await expect(loadNativeOrt()).resolves.toHaveProperty("InferenceSession");
    expect(install).not.toHaveBeenCalled();
  });
});
