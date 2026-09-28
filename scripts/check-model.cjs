const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dir = path.join(__dirname, "..", "assets", "models");
const manifest = JSON.parse(
  fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
);
for (const name of [
  "encoder.onnx",
  "head.onnx",
  "tokenizer.layajson",
  "config.layajson",
]) {
  const p = path.join(dir, name);
  const bytes = fs.readFileSync(p);
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  if (hash !== manifest.files[name]?.sha256)
    throw new Error(`Missing or altered Laya asset: ${name}`);
}
console.log("All four bundled Laya assets match the recorded SHA-256 hashes.");

if (!manifest.textParity || manifest.textParity.cases < 4 || manifest.textParity.maxProbabilityDrift > 0.01) {
 throw new Error('Model has not passed the real-text parity checks.');
}
