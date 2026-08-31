import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import {
	appendProjectVentEntry,
	getProjectVentPath,
	migrateRepoLocalVent,
} from "../extensions/storage.ts";

test("uses Pi's session-directory encoding for project vent paths", () => {
	const cwd = resolve("fixtures", "pi:vent");
	const agentDir = resolve("tmp", "pi-agent");
	const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;

	assert.equal(
		getProjectVentPath(cwd, agentDir),
		join(agentDir, "vent", safePath, "VENT.md"),
	);
});

test("moves a repo-local vent log when central history does not exist", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-vent-move-"));
	const cwd = join(root, "project");
	const localPath = join(cwd, "VENT.md");
	const ventPath = getProjectVentPath(cwd, join(root, "agent"));

	try {
		await mkdir(cwd);
		await writeFile(localPath, "legacy log\n", "utf8");

		// Prove migration preserves content while removing the obsolete source.
		await migrateRepoLocalVent(cwd, ventPath);
		assert.equal(await readFile(ventPath, "utf8"), "legacy log\n");
		assert.equal(existsSync(localPath), false);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("appends legacy history and separates the next entry", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-vent-append-"));
	const cwd = join(root, "project");
	const localPath = join(cwd, "VENT.md");
	const unrelatedPath = join(cwd, ".VENT.md.pi-vent-migration-not-ours");
	const ventPath = getProjectVentPath(cwd, join(root, "agent"));
	const legacyContent = "# VENT\n\nlegacy log";

	try {
		await mkdir(cwd);
		await mkdir(dirname(ventPath), { recursive: true });
		await writeFile(localPath, legacyContent, "utf8");
		await writeFile(unrelatedPath, "unrelated", "utf8");
		await writeFile(ventPath, "# VENT\n\ncentral log", "utf8");

		// Prove collision handling retains both histories and ignores prefix lookalikes.
		await migrateRepoLocalVent(cwd, ventPath);
		const migrated = `# VENT\n\ncentral log\n\n${legacyContent}`;
		assert.equal(await readFile(ventPath, "utf8"), migrated);
		assert.equal(existsSync(localPath), false);
		assert.equal(await readFile(unrelatedPath, "utf8"), "unrelated");

		// Prove a newline-less migration cannot swallow the next Markdown heading.
		await appendProjectVentEntry(
			cwd,
			"## new entry\n\nnew thought\n",
			ventPath,
		);
		assert.equal(
			await readFile(ventPath, "utf8"),
			`${migrated}\n\n## new entry\n\nnew thought\n`,
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
