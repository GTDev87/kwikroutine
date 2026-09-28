import { buildPersonalizedInput } from './layaInput';
import { Platform } from "react-native";
import Storage from "expo-sqlite/kv-store";
import { copyAsync, readAsStringAsync } from "expo-file-system/legacy";
import manifest from "../../assets/models/manifest.json";
import { Directory, File, Paths } from "expo-file-system";
import { AppData, Exercise, Session } from "../domain/types";
import {
  clampTemperature,
  softmax,
  tempBucket,
} from "../vendor/laya/common";
import {
  encodeWithData,
  parseTokenizerJson,
  TokenizerLike,
} from "../vendor/laya/tokenizer";
import { LoadOptions } from "../domain/loadProgression";
import { buildLoadInput } from './loadInput';
import { RepOptions } from "../domain/repTarget";
import { buildRepInput } from './repInput';
import { RestOptions } from "../domain/restDay";
import { buildRestInput } from './restInput';
import { modelAssets } from "./modelAssets";
import { loadNativeOrt } from "./nativeOrt";
import type {
  InferenceSession,
  Tensor as TensorType,
} from "onnxruntime-react-native";

type Runtime = {
  encoder: InferenceSession;
  head: InferenceSession;
  tok: TokenizerLike;
  config: Record<string, any>;
  ort: typeof import("onnxruntime-react-native");
};
// Opt-in local diagnostics for native QA. No prompts or fitness data are recorded.
function diagnostic(stage: string, detail: unknown = null) {
  if (process.env.EXPO_PUBLIC_LAYA_DIAGNOSTICS === "1") {
    console.info("Kwikroutine Laya", stage, JSON.stringify(detail));
    void Storage.setItem("kwikroutine.laya.diagnostic", JSON.stringify({ stage, detail, at: Date.now() })).catch(() => {});
  }
}
let runtime: Promise<Runtime> | null = null;
let failedThisLaunch = false;
let status = modelAssets
  ? "On-device model bundled"
  : "Local exercise rules · on-device model not bundled";
export const layaStatus = () => status;
async function localAsset(name: string) {
  // Native build resources only. Never download weights or contact an inference service.
  const bundled = Platform.OS === 'android'
    ? new File(`asset:///laya/${name}`)
    : new File(Paths.bundle, name);
  if (!bundled.exists) throw new Error(`Missing bundled model resource: ${name}. Rebuild the native app.`);
  if (Platform.OS !== 'android') return bundled.uri;
  const directory = new Directory(Paths.cache, `laya-${manifest.files['encoder.onnx'].sha256.slice(0, 12)}`);
  directory.create({ intermediates: true, idempotent: true });
  const cached = new File(directory, name);
  const expected = (manifest.files as Record<string, { bytes: number }>)[name].bytes;
  if (!cached.exists || cached.size !== expected) {
    const temporary = new File(directory, `${name}.partial`);
    await copyAsync({ from: bundled.uri, to: temporary.uri });
    if (temporary.size !== expected) throw new Error(`Incomplete local model copy: ${name}`);
    if (cached.exists) cached.delete();
    temporary.move(cached);
  }
  return cached.uri;
}
async function load(): Promise<Runtime> {
  if (!modelAssets) throw new Error("Model not bundled");
  diagnostic("loading-runtime");
  const ort = await loadNativeOrt();
  const [encoderPath, headPath, tokenizerPath, configPath] = await Promise.all([
    localAsset(modelAssets.encoder),
    localAsset(modelAssets.head),
    localAsset(modelAssets.tokenizer),
    localAsset(modelAssets.config),
  ]);
  diagnostic("reading-tokenizer");
  const parsed = parseTokenizerJson(
    JSON.parse(await readAsStringAsync(tokenizerPath)),
  );
  if (!parsed) throw new Error("Unsupported Laya tokenizer");
  const tok: TokenizerLike = {
    clsId: parsed.ids.cls,
    sepId: parsed.ids.sep,
    maskId: parsed.ids.mask,
    padId: parsed.ids.pad,
    maskToken: parsed.maskToken,
    encode: (text) => encodeWithData(parsed, text),
  };
  const config = JSON.parse(await readAsStringAsync(configPath));
  diagnostic("loading-encoder");
  const encoder = await ort.InferenceSession.create(
    encoderPath.replace("file://", ""),
    { intraOpNumThreads: 2, graphOptimizationLevel: "all" },
  );
  diagnostic("loading-head");
  const head = await ort.InferenceSession.create(
    headPath.replace("file://", ""),
    { intraOpNumThreads: 2, graphOptimizationLevel: "all" },
  );
  return { encoder, head, tok, config, ort };
}
export async function scoreWithLaya(
  data: AppData,
  session: Session,
  candidates: Exercise[],
): Promise<Record<string, number> | null> {
  return scoreDecision(candidates.map(e => e.id), ({tok, config}) => {
    const input = buildPersonalizedInput(tok, data, session, candidates, Date.now(),
      Math.min(Number(config.max_len ?? 512), 512), Number(config.head_max_len ?? 192));
    diagnostic('context-packed', {tokens: input.ids.length, stateTokens: input.stateTokens,
      stateBudget: input.stateBudget, omittedFacts: input.omittedFacts});
    return input;
  });
}
export async function scoreLoadWithLaya(options: LoadOptions) {
  if (options.increase === null) return null;
  return scoreDecision(['hold', 'increase'], ({tok, config}) => buildLoadInput(tok, options,
    Math.min(Number(config.max_len ?? 512), 512), Number(config.head_max_len ?? 192)));
}
export async function scoreRepsWithLaya(options: RepOptions) {
  if (options.fewer === null) return null;
  return scoreDecision(['same', 'fewer'], ({tok, config}) => buildRepInput(tok, options,
    Math.min(Number(config.max_len ?? 512), 512), Number(config.head_max_len ?? 192)));
}
export async function scoreRestWithLaya(options: RestOptions) {
  return scoreDecision(['train', 'rest'], ({tok, config}) => buildRestInput(tok, options,
    Math.min(Number(config.max_len ?? 512), 512), Number(config.head_max_len ?? 192)));
}
// Serialize questions sharing the native sessions. A failed request cannot poison the queue.
let inferenceQueue: Promise<unknown> = Promise.resolve();
function scoreDecision(keys: string[], build: (rt: Runtime) => {ids: number[]; markers: number[]}) {
  const request = inferenceQueue.then(() => runDecision(keys, build));
  inferenceQueue = request.catch(() => null);
  return request;
}
async function runDecision(keys: string[], build: (rt: Runtime) => {ids: number[]; markers: number[]}): Promise<Record<string, number> | null> {
  if (!modelAssets || keys.length < 2 || failedThisLaunch) return null;
  runtime ??= load().catch((error) => {
    runtime = null;
    failedThisLaunch = true;
    status = "Local exercise rules · on-device model could not load";
    diagnostic("load-error", String(error));
    throw error;
  });
  const rt = await runtime;
  const {encoder, head, config, ort} = rt;
  const {ids, markers} = build(rt);
  if (markers.length !== keys.length) { diagnostic("marker-mismatch", {markers: markers.length, candidates: keys.length}); return null; }
  const i64 = (values: number[], shape: number[]) =>
    new ort.Tensor("int64", BigInt64Array.from(values, BigInt), shape);
  const attention = i64(
    ids.map(() => 1),
    [1, ids.length],
  );
  let hidden: Record<string, TensorType> | undefined,
    result: Record<string, TensorType> | undefined;
  const inputs = {
    input_ids: i64(ids, [1, ids.length]),
    attention_mask: attention,
  };
  let headInputs: Record<string, TensorType> = {};
  try {
    diagnostic("running-encoder", { tokens: ids.length });
    hidden = await encoder.run(inputs);
    headInputs = {
      hidden_states: hidden.last_hidden_state,
      marker_pos: i64(markers, [1, markers.length]),
      marker_mask: new ort.Tensor(
        "bool",
        new Uint8Array(markers.length).fill(1),
        [1, markers.length],
      ),
      qtype: i64([0], [1, 1]),
      attention_mask: attention,
    };
    result = await head.run(headInputs);
    const scale = clampTemperature(
      config.temperature_by_options?.[tempBucket(0, keys.length)] ??
        config.temperature?.[0] ??
        1,
    );
    const logits = Array.from(result.logits.data as Float32Array).slice(
      0,
      keys.length,
    );
    if (
      logits.length !== keys.length ||
      logits.some((n) => !Number.isFinite(n))
    )
      return null;
    const probabilities = softmax(logits.map((n) => n / scale));
    status = "On-device model · active";
    diagnostic("success", { candidates: keys.length });
    return Object.fromEntries(
      keys.map((key, i) => [key, probabilities[i]]),
    );
  } catch (error) {
    failedThisLaunch = true;
    status = "Local exercise rules · on-device model unavailable";
    diagnostic("inference-error", String(error));
    throw error;
  } finally {
    const tensors = new Set([
      ...Object.values(inputs),
      ...Object.values(headInputs),
      ...Object.values(hidden ?? {}),
      ...Object.values(result ?? {}),
    ]);
    tensors.forEach((t) => t.dispose());
  }
}
