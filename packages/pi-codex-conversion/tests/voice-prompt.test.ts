import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	prepareCodexVoiceSystemPrompt,
} from "../src/voice/system-prompt.ts";
import { readCodexAppendSystemPrompt } from "../src/prompt/append-system-prompt.ts";
import { prepareCodexSystemPrompt, type PiSystemPromptOptions } from "../src/prompt/build-system-prompt.ts";

test("user-owned prompt files remain unchanged and the Codex appendix stays last", async () => {
	const directory = await mkdtemp(join(tmpdir(), "pi-voice-prompt-"));
	const promptPath = join(directory, "REALTIME-SYSTEM-PROMPT.md");
	const appendixPath = join(directory, "CODEX_APPEND_SYSTEM.md");
	const customizedPrompt = `﻿<!-- codex-voice-prompt-version: 2 -->
## Identity and tone

Keep this customized personality.

## Interface and role

One assistant.

## Delegation

Delegate work.

## Session continuity

Preserve context.

## Backend results

Speak results.
`.replaceAll("\n", "\r\n");
	await writeFile(promptPath, customizedPrompt, { mode: 0o600 });
	await writeFile(appendixPath, "  Personal Codex tail.\n", { mode: 0o600 });
	try {
		// Voice schema checks preserve user customization byte-for-byte.
		assert.deepEqual(prepareCodexVoiceSystemPrompt(promptPath), {
			created: false,
			schemaVersion: 2,
			currentSchemaVersion: 5,
			current: false,
		});
		assert.equal(await readFile(promptPath, "utf8"), customizedPrompt);

		// Codex conversion trims file framing and renders the tail after every Codex section.
		const appendix = readCodexAppendSystemPrompt(directory);
		assert.equal(appendix, "Personal Codex tail.");
		const options: PiSystemPromptOptions = {
			selectedTools: ["exec_command"],
			toolSnippets: {},
			toolGuidelines: {},
			promptGuidelines: [],
			appendSystemPrompt: "",
			sections: { extension_context: "Keep extension section" },
			cwd: directory,
			contextFiles: [],
			skills: [],
		};
		prepareCodexSystemPrompt(options, { shell: "/bin/bash", codexAppendSystemPrompt: appendix });
		assert.equal(Object.keys(options.sections!).at(-1), "codex_append_system");
		assert.equal(options.sections!["codex_append_system"], "Personal Codex tail.");

		// Repeated preparation replaces or removes the tail instead of stacking it.
		prepareCodexSystemPrompt(options, { shell: "/bin/bash", codexAppendSystemPrompt: "Replacement Codex tail." });
		assert.equal(Object.keys(options.sections!).at(-1), "codex_append_system");
		assert.equal(options.sections!["codex_append_system"], "Replacement Codex tail.");
		prepareCodexSystemPrompt(options, { shell: "/bin/bash" });
		assert.equal("codex_append_system" in options.sections!, false);

		// A forced prompt carries the tail as its final opaque section.
		const forced: PiSystemPromptOptions = { ...options, sections: {}, forceSystemPrompt: "Forced by an earlier extension" };
		prepareCodexSystemPrompt(forced, { shell: "/bin/bash", codexAppendSystemPrompt: appendix });
		assert.ok(forced.forceSystemPrompt!.endsWith("<codex_append_system>\nPersonal Codex tail.\n</codex_append_system>"));
		assert.equal(readCodexAppendSystemPrompt(join(directory, "missing")), undefined);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
