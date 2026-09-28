// Fetch (or, with --publish, upload) the Laya ONNX weights that are too large for git.
// They live as assets on a GitHub Release of this (private) repo, tagged from the
// encoder hash in assets/models/manifest.json, and are verified against that manifest.
//   npm run model:fetch     download missing/altered weights (needs `gh` or GITHUB_TOKEN)
//   npm run model:publish   create the release from local, verified weights (needs `gh`)
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");

const dir = path.join(__dirname, "..", "assets", "models");
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const repo = process.env.KWIK_MODEL_REPO || "GTDev87/kwikroutine";
const tag = `laya-${manifest.files["encoder.onnx"].sha256.slice(0, 12)}`;
// The tokenizer and config are small and committed; only the ONNX weights are hosted.
const hosted = ["encoder.onnx", "head.onnx"];

const sha256 = (file) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(file)
      .on("data", (d) => hash.update(d))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
const verified = async (name) => {
  const file = path.join(dir, name);
  return fs.existsSync(file) && (await sha256(file)) === manifest.files[name].sha256;
};
const hasGh = () => {
  try {
    execFileSync("gh", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
async function viaApi(names) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token)
    throw new Error(
      `Install the GitHub CLI and run \`gh auth login\`, or set GITHUB_TOKEN with read access to ${repo}.`,
    );
  const headers = { Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, { headers });
  if (!res.ok)
    throw new Error(
      res.status === 404
        ? `Release ${tag} doesn’t exist on ${repo} yet. Run \`npm run model:publish\` where the weights are.`
        : `Couldn’t read release ${tag} on ${repo} (HTTP ${res.status}); check the token’s access.`,
    );
  const { assets } = await res.json();
  for (const name of names) {
    const asset = assets.find((a) => a.name === name);
    if (!asset) throw new Error(`Release ${tag} has no ${name}.`);
    console.log(`Downloading ${name} (${(asset.size / 1048576).toFixed(0)} MB)…`);
    // The asset endpoint redirects to storage; fetch drops the token on that redirect.
    const file = await fetch(asset.url, { headers: { ...headers, Accept: "application/octet-stream" } });
    if (!file.ok) throw new Error(`Download of ${name} failed (HTTP ${file.status}).`);
    const tmp = path.join(dir, `${name}.download`);
    await pipeline(Readable.fromWeb(file.body), fs.createWriteStream(tmp));
    fs.renameSync(tmp, path.join(dir, name));
  }
}
async function fetchModel() {
  const missing = [];
  for (const name of hosted) if (!(await verified(name))) missing.push(name);
  if (!missing.length) return console.log("Laya weights already present and verified.");
  if (hasGh())
    for (const name of missing)
      execFileSync("gh", ["release", "download", tag, "-R", repo, "-p", name, "-D", dir, "--clobber"], {
        stdio: "inherit",
      });
  else await viaApi(missing);
  for (const name of missing)
    if (!(await verified(name))) throw new Error(`${name} does not match the manifest hash.`);
  console.log(`Fetched and verified ${missing.join(", ")} from ${repo}@${tag}.`);
}
async function publish() {
  for (const name of hosted)
    if (!(await verified(name))) throw new Error(`Local ${name} is missing or doesn’t match the manifest.`);
  if (!hasGh()) throw new Error("Publishing needs the GitHub CLI: brew install gh && gh auth login");
  execFileSync(
    "gh",
    [
      "release", "create", tag, ...hosted.map((n) => path.join(dir, n)),
      "-R", repo,
      "--title", `Laya model weights (${tag})`,
      "--notes", `FP16 ONNX weights for ${manifest.model}@${manifest.revision} (${manifest.license}). Fetch with \`npm run model:fetch\`; hashes are in assets/models/manifest.json.`,
    ],
    { stdio: "inherit" },
  );
}
(process.argv.includes("--publish") ? publish() : fetchModel()).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
