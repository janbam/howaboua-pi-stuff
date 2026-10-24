import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { runSkills } from "../src/catalog.js";

/** Creates an isolated filesystem catalog and external loaded-skill directory. */
function fixture() {
	const root = mkdtempSync(join(tmpdir(), "skills-"));
	return {
		root,
		/** Writes one skill below the fixture root. */
		add(directory: string, content: string) {
			const path = join(root, directory);
			mkdirSync(path, { recursive: true });
			writeFileSync(join(path, "SKILL.md"), content);
		},
		/** Removes only this fixture's files. */
		cleanup() {
			rmSync(root, { recursive: true, force: true });
		},
	};
}

test("Pi-loaded skills win collisions without replacing unrelated filesystem skills", (t) => {
	const global = fixture();
	const packaged = fixture();
	t.after(() => global.cleanup());
	t.after(() => packaged.cleanup());
	global.add(
		"packaged",
		"---\nname: packaged\ndescription: Global collision.\n---\nGlobal body\n",
	);
	global.add(
		"guidance",
		"---\nname: guidance\ndescription: Global guidance.\n---\nGuidance body\n",
	);
	packaged.add(
		"packaged",
		"---\nname: packaged\ndescription: Package skill.\n---\nPackage body\n",
	);
	const loaded = [
		{
			name: "packaged",
			description: "Project winner.",
			filePath: resolve(packaged.root, "packaged/SKILL.md"),
			baseDir: resolve(packaged.root, "packaged"),
			sourceInfo: { scope: "project" },
		},
	];

	// The overlay must affect reads as well as discovery without hiding the disk catalog.
	assert.match(
		runSkills("read packaged", global.root, undefined, loaded).output,
		/^Package body/,
	);
	const { output } = runSkills("list", global.root, undefined, loaded);
	assert.match(output, /packaged: Project winner\./);
	assert.match(output, /guidance: Global guidance\./);
	assert.doesNotMatch(output, /Global collision/);
});

test("a loaded user-only skill hides its filesystem namesake without replacing the catalog", (t) => {
	const global = fixture();
	const packaged = fixture();
	t.after(() => global.cleanup());
	t.after(() => packaged.cleanup());
	global.add(
		"guidance",
		"---\nname: guidance\ndescription: Global guidance.\n---\nGuidance body\n",
	);
	global.add(
		"injected",
		"---\nname: injected\ndescription: Visible shadow.\n---\nShadow body\n",
	);
	packaged.add(
		"injected",
		"---\nname: injected\ndescription: Injected.\ndisable-model-invocation: true\n---\nBody\n",
	);

	// A partial loaded set under --no-skills must neither hide unrelated files nor leak a disabled shadow.
	const loaded = [
		{
			name: "injected",
			description: "Injected.",
			filePath: resolve(packaged.root, "injected/SKILL.md"),
			baseDir: resolve(packaged.root, "injected"),
			disableModelInvocation: true,
		},
	];
	const { output } = runSkills("list", global.root, undefined, loaded);
	assert.match(output, /guidance: Global guidance\./);
	assert.doesNotMatch(output, /injected/);
	assert.throws(
		() => runSkills("read injected", global.root, undefined, loaded),
		/Unknown skill/,
	);
});
