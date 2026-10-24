import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { get } from "node:https";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const desktop = dirname(fileURLToPath(import.meta.url));
const source = join(desktop, "..", "src", "desktop");
const output = join(desktop, "dist", "app");
const esmFiles = ["attention", "bridge", "config", "cursor-provider", "main"];
const cjsFiles = ["bridge", "preload"];
const require = createRequire(join(desktop, "package.json"));
const compiler = join(dirname(require.resolve("typescript/package.json")), require("typescript/package.json").bin.tsc);
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;
const LEADING_V_PATTERN = /^v/;

function electronExecutable(platform = process.platform) {
  if (platform === "win32") return "electron.exe";
  if (platform === "darwin") return join("Electron.app", "Contents", "MacOS", "Electron");
  return "electron";
}

async function ensureElectronRuntime() {
  const electronRoot = dirname(require.resolve("electron/package.json"));
  const manifest = JSON.parse(await readFile(join(electronRoot, "package.json"), "utf8"));
  const dist = join(electronRoot, "dist");
  const executable = electronExecutable();
  try {
    const installedVersion = (await readFile(join(dist, "version"), "utf8")).trim().replace(LEADING_V_PATTERN, "");
    await access(join(dist, executable), process.platform === "win32" ? fsConstants.F_OK : fsConstants.X_OK);
    if (installedVersion === manifest.version) return;
  } catch {
    // Repair a missing or partial runtime below.
  }
  const artifactArch = process.arch === "arm" ? "armv7l" : process.arch;
  const artifact = `electron-v${manifest.version}-${process.platform}-${artifactArch}.zip`;
  const expectedChecksum = require(join(electronRoot, "checksums.json"))[artifact];
  if (typeof expectedChecksum !== "string")
    throw new Error(`Electron has no runtime for ${process.platform}-${process.arch}.`);
  const cache = process.env["electron_config_cache"] || electronCacheDirectory();
  await mkdir(cache, { recursive: true });
  const archive = join(cache, artifact);
  if ((await fileChecksum(archive)) !== expectedChecksum) {
    await rm(archive, { force: true });
    await downloadArchive(artifact, archive, expectedChecksum, manifest.version);
  }
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await extractArchive(archive, dist);
  await writeFile(join(electronRoot, "path.txt"), executable);
  await access(join(dist, executable), process.platform === "win32" ? fsConstants.F_OK : fsConstants.X_OK);
}

function extractArchive(archive, destination) {
  const command = process.platform === "win32" ? "powershell.exe" : "unzip";
  const args =
    process.platform === "win32"
      ? [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
          archive,
          destination,
        ]
      : ["-q", archive, "-d", destination];
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "ignore", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Electron archive extraction exited ${code ?? "without status"}.`));
    });
  });
}

function electronCacheDirectory() {
  if (process.platform === "win32") {
    return join(process.env["LOCALAPPDATA"] || join(homedir(), "AppData", "Local"), "electron", "Cache");
  }
  if (process.platform === "darwin") return join(homedir(), "Library", "Caches", "electron");
  return join(process.env["XDG_CACHE_HOME"] || join(homedir(), ".cache"), "electron");
}

async function fileChecksum(path) {
  try {
    const checksum = createHash("sha256");
    for await (const chunk of createReadStream(path)) checksum.update(chunk);
    return checksum.digest("hex");
  } catch {
    return undefined;
  }
}

function downloadResponse(url, path, expectedChecksum, redirects = 0) {
  return new Promise((resolvePromise, reject) => {
    const request = get(url, { headers: { "user-agent": "pi-pet-desktop-build" } }, (response) => {
      const location = response.headers.location;
      if (location && response.statusCode >= 300 && response.statusCode < 400) {
        response.resume();
        if (redirects >= 5) reject(new Error("Electron download redirected too many times."));
        else resolvePromise(downloadResponse(new URL(location, url), path, expectedChecksum, redirects + 1));
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Electron download failed: HTTP ${response.statusCode ?? "unknown"}.`));
        return;
      }
      const checksum = createHash("sha256");
      let received = 0;
      const meter = new Transform({
        transform(chunk, _encoding, callback) {
          received += chunk.length;
          if (received > MAX_ARCHIVE_BYTES) callback(new Error("Electron archive is unexpectedly large."));
          else {
            checksum.update(chunk);
            callback(null, chunk);
          }
        },
      });
      pipeline(response, meter, createWriteStream(path, { mode: 0o600 }))
        .then(() => {
          if (checksum.digest("hex") !== expectedChecksum) throw new Error("Electron archive checksum does not match.");
          resolvePromise();
        })
        .catch(reject);
    });
    request.once("error", reject);
  });
}

async function downloadArchive(artifact, path, expectedChecksum, version) {
  const temporary = `${path}.${process.pid}.tmp`;
  await rm(temporary, { force: true });
  try {
    await downloadResponse(
      new URL(`https://github.com/electron/electron/releases/download/v${version}/${artifact}`),
      temporary,
      expectedChecksum,
    );
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function compile(files, module, destination) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [
        compiler,
        "--ignoreConfig",
        "--noCheck",
        "--noResolve",
        "--target",
        "es2024",
        "--module",
        module,
        "--rewriteRelativeImportExtensions",
        "--outDir",
        destination,
        ...files.map((name) => join(source, `${name}.ts`)),
      ],
      { stdio: "inherit", windowsHide: true },
    );
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Desktop compilation exited ${code ?? "without status"}.`));
    });
  });
}

await ensureElectronRuntime();
await rm(join(desktop, "dist"), { recursive: true, force: true });
await mkdir(output, { recursive: true });

await compile(esmFiles, "esnext", output);
const cjsOutput = join(desktop, "dist", "preload");
await compile(cjsFiles, "commonjs", cjsOutput);
for (const name of cjsFiles) {
  const compiled = (await readFile(join(cjsOutput, `${name}.js`), "utf8")).replaceAll(
    /require\("(\.\/.+)\.js"\)/g,
    'require("$1.cjs")',
  );
  await writeFile(join(output, `${name}.cjs`), compiled);
}
await rm(cjsOutput, { recursive: true });
await writeFile(
  join(output, "package.json"),
  `${JSON.stringify({ name: "pi-pet-remote-desktop", private: true, type: "module", main: "main.js" }, null, 2)}\n`,
);
