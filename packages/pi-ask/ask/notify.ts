import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadAskConfig } from "./config.js";

/**
 * Runs the configured `notifyScript` with `question` as its only argument, fire-and-forget.
 * Config is re-read per call so edits apply without `/reload`; failures surface as UI warnings and never block the ask.
 */
export function runNotifyScript(ctx: ExtensionContext, question: string): void {
	const script = loadAskConfig().notifyScript;
	if (!script) return;
	const path = script.startsWith("~/")
		? join(homedir(), script.slice(2))
		: script;
	const warn = (error: unknown) =>
		ctx.ui.notify(
			`pi-ask notify script failed: ${error instanceof Error ? error.message : String(error)}`,
			"warning",
		);
	// Detach so a slow or lingering notifier neither holds Pi open nor dies with its signals.
	try {
		const child = spawn(path, [question], { detached: true, stdio: "ignore" });
		child.on("error", warn);
		child.unref();
	} catch (error) {
		warn(error);
	}
}
