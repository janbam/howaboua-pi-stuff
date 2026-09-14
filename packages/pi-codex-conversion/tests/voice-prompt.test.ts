import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_CODEX_CONVERSION_CONFIG } from "../src/adapter/activation/config.ts";
import { createCodexExtensionRuntime } from "../src/extension/runtime.ts";
import {
	prepareCodexVoiceSystemPrompt,
} from "../src/voice/system-prompt.ts";
import { readCodexAppendSystemPrompt } from "../src/prompt/append-system-prompt.ts";
import { buildCodexSystemPrompt } from "../src/prompt/build-system-prompt.ts";

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
	const previousAgentDir = process.env["PI_CODING_AGENT_DIR"];
	process.env["PI_CODING_AGENT_DIR"] = directory;
	try {
		// Voice schema checks preserve user customization byte-for-byte.
		assert.deepEqual(prepareCodexVoiceSystemPrompt(promptPath), {
			created: false,
			schemaVersion: 2,
			currentSchemaVersion: 5,
			current: false,
		});
		assert.equal(await readFile(promptPath, "utf8"), customizedPrompt);

		// Codex conversion trims file framing, appends the content last, and remains idempotent.
		const appendix = readCodexAppendSystemPrompt(directory);
		assert.equal(appendix, "Personal Codex tail.");
		const converted = buildCodexSystemPrompt("Base prompt", {
			codexAppendSystemPrompt: appendix,
		});
		assert.ok(converted.endsWith("\n\nPersonal Codex tail."));
		const replaced = buildCodexSystemPrompt(converted, {
			codexAppendSystemPrompt: "Replacement Codex tail.",
			previousCodexAppendSystemPrompt: appendix,
		});
		assert.equal(replaced.includes("Personal Codex tail."), false);
		assert.ok(replaced.endsWith("\n\nReplacement Codex tail."));
		const revalidatedFromStalePrompt = buildCodexSystemPrompt(converted, {
			codexAppendSystemPrompt: "Replacement Codex tail.",
			previousCodexAppendSystemPrompt: appendix,
		});
		assert.equal(revalidatedFromStalePrompt, replaced);

		// Voice delegation removes a known tail before changing its coding-tool section.
		const runtime = createCodexExtensionRuntime({ sendUserMessage: () => undefined } as never);
		runtime.state.config = DEFAULT_CODEX_CONVERSION_CONFIG;
		const codexContext = {
			cwd: directory,
			isProjectTrusted: () => false,
			model: { provider: "openai-codex", api: "openai-codex-responses", id: "gpt-5.4" },
		} as never;
		const emitted = runtime.codexSystemPrompt("Base prompt", codexContext);
		const refreshed = `${runtime.stripEmittedCodexPromptAppendix(emitted)}\n\nChanged coding tools.`;
		await writeFile(appendixPath, "Replacement Codex tail.\n", { mode: 0o600 });
		const refreshedWithReplacement = runtime.codexSystemPrompt(refreshed, codexContext);
		assert.equal(refreshedWithReplacement.includes("Personal Codex tail."), false);
		assert.ok(refreshedWithReplacement.endsWith("\n\nReplacement Codex tail."));
		await rm(appendixPath);
		const refreshedWithoutAppendix = runtime.codexSystemPrompt(
			`${runtime.stripEmittedCodexPromptAppendix(refreshedWithReplacement)}\n\nChanged coding tools again.`,
			codexContext,
		);
		assert.equal(refreshedWithoutAppendix.includes("Replacement Codex tail."), false);
		const disabled = buildCodexSystemPrompt(replaced, {
			previousCodexAppendSystemPrompt: "Replacement Codex tail.",
		});
		assert.equal(disabled.includes("Replacement Codex tail."), false);
		assert.equal(readCodexAppendSystemPrompt(join(directory, "missing")), undefined);
	} finally {
		if (previousAgentDir === undefined) delete process.env["PI_CODING_AGENT_DIR"];
		else process.env["PI_CODING_AGENT_DIR"] = previousAgentDir;
		await rm(directory, { recursive: true, force: true });
	}
});
