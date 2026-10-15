import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readEffectiveCodexConversionConfig } from "../src/adapter/activation/config-store.ts";
import { DEFAULT_CODEX_CONVERSION_CONFIG } from "../src/adapter/activation/config.ts";

test("empty shortcut binding disables the shortcut instead of falling back to the default", () => {
	const root = mkdtempSync(join(tmpdir(), "pi-codex-config-shortcuts-"));
	try {
		const globalPath = join(root, "agent", "pi-codex-conversion.json");
		mkdirSync(join(root, "agent"), { recursive: true });
		writeFileSync(globalPath, JSON.stringify({
			ui: { backgroundShellToggleShortcut: "" },
			voice: { realtimeShortcut: "", dictationShortcut: "  " },
		}), { encoding: "utf8" });

		// Explicit empty strings disable bindings, while untouched keys retain their defaults.
		const config = readEffectiveCodexConversionConfig({ cwd: root, projectTrusted: true, globalConfigPath: globalPath, env: {} });
		assert.equal(config.ui.backgroundShellToggleShortcut, "");
		assert.equal(config.voice.realtimeShortcut, "");
		assert.equal(config.voice.dictationShortcut, "");
		assert.equal(config.ui.backgroundShellPrevShortcut, DEFAULT_CODEX_CONVERSION_CONFIG.ui.backgroundShellPrevShortcut);
		assert.equal(config.voice.muteShortcut, DEFAULT_CODEX_CONVERSION_CONFIG.voice.muteShortcut);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
