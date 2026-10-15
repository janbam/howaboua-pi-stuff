#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const usage = `Usage: bun run sandbox:setup --name NAME [--config YAML]
Snapshot this checkout's tracked working files into an existing sandbox, or create
one from YAML. Replaces this script's previous disposable candidate.
Requires host Node 24+, installed repo dependencies, and guest bun, node, tar, python3, make, g++, node-gyp, herdr, fd.
Never copies host credentials or changes existing sandbox services.`;
const args = process.argv.slice(2);
if (!args.length || args.includes("--help")) {
	console.log(usage);
	process.exit(0);
}
let name;
let config;
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--name") name = args[++i];
	else if (args[i] === "--config") config = args[++i];
	else throw new Error(usage);
}
if (!name || !/^[a-z][a-z0-9-]{0,39}$/.test(name)) throw new Error(usage);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const quote = (s) => `'${s.replaceAll("'", "'\\''")}'`;
const host = (command, argv) => execFileSync(command, argv, { cwd: root });
// JJ workspaces have no .git. Both paths export tracked working files, not HEAD.
let files;
let source;
if (existsSync(join(root, ".jj"))) {
	files = host("jj", ["file", "list"]).toString().trimEnd().split("\n");
	source = host("jj", [
		"log",
		"-r",
		"@",
		"--no-graph",
		"-T",
		"commit_id",
	]).toString();
} else {
	files = host("git", ["ls-files", "-z"])
		.toString()
		.split("\0")
		.filter(Boolean);
	source = host("git", ["rev-parse", "HEAD"]).toString().trim();
}
files = (
	await Promise.all(
		files.map(async (path) => {
			try {
				await lstat(join(root, path));
				return path;
			} catch (error) {
				if (error.code === "ENOENT") return null;
				throw error;
			}
		}),
	)
).filter((path) => path !== null);
if (
	!files.length ||
	files.some(
		(p) => p.includes("\n") || p.startsWith("/") || p.split("/").includes(".."),
	)
)
	throw new Error("Snapshot requires ordinary tracked repository paths");
const temporary = await mkdtemp(join(tmpdir(), "pi-stuff-snapshot-"));
try {
	await writeFile(join(temporary, "files"), `${files.join("\0")}\0`);
	host("tar", [
		"-czf",
		join(temporary, "source.tgz"),
		"--null",
		"-T",
		join(temporary, "files"),
	]);
	const archive = await readFile(join(temporary, "source.tgz"));
	const digest = createHash("sha256").update(archive).digest("hex");
	host("bun", ["run", "--cwd", "packages/pi-sandbox", "build"]);
	const { run } = await import("../packages/pi-sandbox/src/client.ts");
	const call = (action) => run({ name, ...action }, root);
	const execute = async (cmd) => {
		let result = await call({ action: "exec", cmd, timeoutMs: 60000 });
		if (result.output) process.stdout.write(result.output);
		while (result.running) {
			result = await call({
				action: "exec-status",
				pid: result.pid,
				timeoutMs: 60000,
			});
			if (result.output) process.stdout.write(result.output);
		}
		if (result.exitCode !== 0)
			throw new Error(
				`Guest command failed (${result.exitCode}). Candidate was not activated`,
			);
	};
	if (config) await call({ action: "create", config: resolve(config) });
	else await call({ action: "start" });
	const inspection = await call({ action: "inspect" });
	const home = `${inspection.workspace}/pi-stuff-review`;
	const stage = `${home}/candidate-${randomUUID()}`;
	await execute(`set -eu
for tool in bun node tar python3 make g++ node-gyp herdr fd; do
  command -v "$tool" || { echo "Missing guest prerequisite: $tool"; exit 1; }
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)'
if [ -e ${quote(home)} ]; then
  test -f ${quote(`${home}/.owned-by-setup-repo-sandbox`)} || { echo 'Refusing unrelated review directory'; exit 1; }
fi
mkdir -p ${quote(stage)}; touch ${quote(`${home}/.owned-by-setup-repo-sandbox`)}
`);
	const encoded = archive.toString("base64");
	for (let offset = 0; offset < encoded.length; offset += 700000) {
		await call({
			action: "write",
			path: `${home}/chunk`,
			content: encoded.slice(offset, offset + 700000),
		});
		await execute(
			`cat ${quote(`${home}/chunk`)} >> ${quote(`${stage}/archive.b64`)}`,
		);
	}
	await execute(`set -eu
cd ${quote(stage)}
base64 -d archive.b64 > archive.tgz
printf '%s  archive.tgz\\n' ${quote(digest)} | sha256sum -c -
tar -xzf archive.tgz
rm archive.b64 archive.tgz ${quote(`${home}/chunk`)}
mkdir .install-tmp
TMPDIR="$PWD/.install-tmp" bun install --frozen-lockfile
bun run --cwd packages/pi-codex-conversion build
bun run --cwd packages/pi-sandbox build
rm -rf .install-tmp
`);
	await call({
		action: "write",
		path: `${stage}/sandbox-snapshot.json`,
		content: JSON.stringify(
			{
				source,
				archiveSha256: digest,
				capturedAt: new Date().toISOString(),
				kind: "tracked working files",
			},
			null,
			2,
		),
	});
	// Isolated agent settings contain only local package paths. Auth remains guest-owned.
	await execute(
		`mkdir -p ${quote(`${home}/agent`)} "$HOME/.pi/agent/extensions"; herdr integration install pi`,
	);
	const settings = `${home}/agent/settings.json`;
	const packages = ["pi-codex-conversion", "pi-shepherdr"].map(
		(p) => `${home}/current/packages/${p}`,
	);
	await execute(
		`python3 -c ${quote(`import json,pathlib
p=pathlib.Path(${JSON.stringify(settings)})
s=json.loads(p.read_text()) if p.exists() else {}
s["packages"]=s.get("packages",[])
for package in ${JSON.stringify(packages)}:
    if package not in s["packages"]: s["packages"].append(package)
integration=pathlib.Path.home()/".pi/agent/extensions/herdr-agent-state.ts"
if not integration.is_file(): raise SystemExit("Herdr Pi integration not found after installation")
s["extensions"]=s.get("extensions",[])
if str(integration) not in s["extensions"]: s["extensions"].append(str(integration))
p.write_text(json.dumps(s,indent=2)+"\\n")`)} `,
	);
	await execute(`set -eu
ln -s ${quote(stage)} ${quote(`${home}/next`)}
mv -Tf ${quote(`${home}/next`)} ${quote(`${home}/current`)}
find ${quote(home)} -maxdepth 1 -type d -name 'candidate-*' ! -path ${quote(stage)} -exec rm -rf {} +
`);
	console.log(
		`Snapshot ${source} (${digest}) selected. Not a live mirror.\nLaunch in a guest Herdr pane: cd ${quote(`${home}/current`)} && PI_CODING_AGENT_DIR=${quote(`${home}/agent`)} ./node_modules/.bin/pi\nRestart existing review Pi processes to load the new candidate. Existing sandbox services were not changed.`,
	);
} finally {
	await rm(temporary, { recursive: true, force: true });
}
