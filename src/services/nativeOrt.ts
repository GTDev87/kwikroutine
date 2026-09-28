import { NativeModules } from "react-native";

export async function loadNativeOrt() {
  const scope = globalThis as typeof globalThis & { OrtApi?: unknown };
  // Metro reports import-time module errors as fatal even when a caller catches
  // the rejected import. Initialize JSI first so a missing native runtime can
  // safely fall back to local exercise rules without evaluating ONNX's binding.
  if (typeof scope.OrtApi === "undefined") {
    const module = NativeModules.Onnxruntime;
    if (typeof module?.install !== "function") {
      throw new Error("ONNX native module is not registered");
    }
    module.install();
    if (typeof scope.OrtApi === "undefined") {
      throw new Error("ONNX native runtime could not initialize");
    }
  }
  return import("onnxruntime-react-native");
}
