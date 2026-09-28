// The Laya ONNX weights (≈850 MB) are too big for normal git files, so they are stored on
// GitHub as 4 MB pieces under hidden refs (refs/model/…). Ordinary clones and pulls never
// download them; this script does, one piece at a time with retries, over the same git
// remote and credentials you already use, then reassembles and verifies them against
// assets/models/manifest.json.
//   npm run model:fetch     download and verify missing weights
//   npm run model:publish   upload local, verified weights (only needed when the model changes)
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const dir = path.join(root, "assets", "models");
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const remote = process.env.KWIK_MODEL_REMOTE || "origin";
const tag = `laya-${manifest.files["encoder.onnx"].sha256.slice(0, 12)}`;
const base = `refs/model/${tag}`;
// Small pieces keep each transfer short enough to get through on connections that stall.
const PART = 4 * 1024 * 1024;
const TRIES = 12;
// The tokenizer and config are small and committed normally; only the weights are split.
const hosted = ["encoder.onnx", "head.onnx"];
// Fixed identity and dates make every piece’s commit reproducible, so re-publishing is a no-op.
const env = {
  ...process.env,
  GIT_AUTHOR_NAME: "kwikroutine-model",
  GIT_AUTHOR_EMAIL: "model@kwikroutine.invalid",
  GIT_COMMITTER_NAME: "kwikroutine-model",
  GIT_COMMITTER_EMAIL: "model@kwikroutine.invalid",
  GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z",
  GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z",
  GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || "ssh -o ServerAliveInterval=5 -o ServerAliveCountMax=3",
};
const git = (args, opts = {}) =>
  execFileSync("git", args, { cwd: root, env, maxBuffer: PART * 2, ...opts });
const gitText = (args, opts) => git(args, opts).toString().trim();
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const fileSha256 = (file) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(file)
      .on("data", (d) => hash.update(d))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
const verified = async (name) => {
  const file = path.join(dir, name);
  return fs.existsSync(file) && (await fileSha256(file)) === manifest.files[name].sha256;
};
// Slow or flaky connections stall now and then; a stalled transfer is killed and retried.
function withRetries(label, fn) {
  for (let t = 1; t <= TRIES; t++) {
    try {
      return fn();
    } catch (e) {
      if (t === TRIES) throw new Error(`${label} failed after ${TRIES} tries: ${e.message.split("\n")[0]}`);
      process.stdout.write(`  ${label}: retrying (${t}/${TRIES - 1})…\n`);
    }
  }
}
const remoteRefs = () =>
  Object.fromEntries(
    gitText(["ls-remote", remote, `${base}/*`], { timeout: 60000 })
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("\t").reverse()),
  );
const commitFor = (name, blob) => {
  const tree = gitText(["mktree"], { input: `100644 blob ${blob}\t${name}\n` });
  return gitText(["commit-tree", tree, "-m", `${tag} ${name}`]);
};

async function fetchModel() {
  const missing = [];
  for (const name of hosted) if (!(await verified(name))) missing.push(name);
  if (!missing.length) return console.log("Laya weights already present and verified.");
  const refs = withRetries("listing model pieces", remoteRefs);
  if (!refs[`${base}/index`])
    throw new Error(`No model pieces for ${tag} on ${remote}. Run \`npm run model:publish\` on a machine that has the weights.`);
  const getRef = (ref) => {
    let have = "";
    try {
      have = gitText(["rev-parse", "--verify", "-q", ref]);
    } catch {}
    if (have !== refs[ref])
      withRetries(`downloading ${ref.slice(base.length + 1)}`, () =>
        git(["fetch", "-q", "--no-tags", remote, `+${ref}:${ref}`], { timeout: 300000, stdio: "ignore" }),
      );
  };
  getRef(`${base}/index`);
  const parts = JSON.parse(gitText(["show", `${base}/index:parts.json`]));
  for (const name of missing) {
    const mine = parts.filter((p) => p.file === name);
    console.log(`Downloading ${name} in ${mine.length} pieces…`);
    const tmp = path.join(dir, `${name}.download`);
    const out = fs.openSync(tmp, "w");
    for (const p of mine) {
      const ref = `${base}/${p.name}`;
      getRef(ref);
      const data = git(["cat-file", "blob", `${ref}:${p.name}`]);
      if (data.length !== p.bytes || sha256(data) !== p.sha256) throw new Error(`Piece ${p.name} is corrupt.`);
      fs.writeSync(out, data);
    }
    fs.closeSync(out);
    fs.renameSync(tmp, path.join(dir, name));
    if (!(await verified(name))) throw new Error(`${name} does not match the manifest hash.`);
  }
  // The files are in place; drop the local piece refs so git can reclaim the space.
  for (const ref of gitText(["for-each-ref", "--format=%(refname)", "refs/model/"]).split("\n").filter(Boolean))
    git(["update-ref", "-d", ref]);
  console.log(`Fetched and verified ${missing.join(", ")} (${tag}).`);
}

async function publish() {
  for (const name of hosted)
    if (!(await verified(name))) throw new Error(`Local ${name} is missing or doesn’t match the manifest.`);
  const existing = withRetries("reading remote", remoteRefs);
  const parts = [];
  for (const name of hosted) {
    const buf = fs.readFileSync(path.join(dir, name));
    for (let i = 0, offset = 0; offset < buf.length; i++, offset += PART) {
      const data = buf.subarray(offset, offset + PART);
      const part = `${name}.${String(i).padStart(3, "0")}`;
      const blob = gitText(["hash-object", "-w", "--stdin"], { input: data });
      parts.push({ file: name, name: part, bytes: data.length, sha256: sha256(data), commit: commitFor(part, blob) });
    }
  }
  const index = JSON.stringify(parts.map(({ commit, ...p }) => p), null, 2) + "\n";
  const indexCommit = commitFor("parts.json", gitText(["hash-object", "-w", "--stdin"], { input: index }));
  const uploads = [...parts.map((p) => [`${base}/${p.name}`, p.commit]), [`${base}/index`, indexCommit]];
  let n = 0;
  for (const [ref, commit] of uploads) {
    n++;
    if (existing[ref] === commit) continue;
    withRetries(`uploading ${ref.slice(base.length + 1)}`, () =>
      git(["push", "-q", "--force", remote, `${commit}:${ref}`], { timeout: 90000, stdio: "ignore" }),
    );
    console.log(`  ${n}/${uploads.length} ${ref.slice(base.length + 1)}`);
  }
  // Remove pieces left over from an earlier piece size.
  const wanted = new Set(uploads.map(([ref]) => ref));
  for (const ref of Object.keys(existing).filter((r) => !wanted.has(r)))
    withRetries(`removing old ${ref.slice(base.length + 1)}`, () =>
      git(["push", "-q", remote, `:${ref}`], { timeout: 60000, stdio: "ignore" }),
    );
  console.log(`Published ${parts.length} pieces under ${base} on ${remote}.`);
}

(process.argv.includes("--publish") ? publish() : fetchModel()).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
