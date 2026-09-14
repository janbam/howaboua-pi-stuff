import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Global Codex-only prompt appendix read while the prompt adapter is active. */
export const CODEX_APPEND_SYSTEM_PROMPT_BASENAME = "CODEX_APPEND_SYSTEM.md";

/** Resolves the Codex prompt appendix inside Pi's active agent directory. */
export function getCodexAppendSystemPromptPath(
	agentDir: string = getAgentDir(),
): string {
	return join(agentDir, CODEX_APPEND_SYSTEM_PROMPT_BASENAME);
}

/** Reads the optional Codex prompt appendix from Pi's active agent directory. */
export function readCodexAppendSystemPrompt(
	agentDir: string = getAgentDir(),
): string | undefined {
	try {
		const content = readFileSync(
			getCodexAppendSystemPromptPath(agentDir),
			"utf8",
		).trim();
		return content || undefined;
	} catch (error) {
		// Absence disables the optional appendix; actual read failures must remain visible.
		if (isNotFoundError(error)) return undefined;
		throw error;
	}
}

/** Identifies a missing optional file without swallowing other filesystem failures. */
function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
