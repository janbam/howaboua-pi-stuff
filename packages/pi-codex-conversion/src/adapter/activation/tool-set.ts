import type { ContextManagementMode } from "./config-contract.ts";
import type { CodexUsageStatus } from "../../codex-usage/payload.ts";

export const STATUS_KEY = "codex-adapter";
export const STATUS_TEXT = "Codex";

interface StatusTheme {
	fg(role: string, text: string): string;
}

function formatStatusText(suffix: string, theme?: StatusTheme | undefined): string {
	if (!theme) return `${STATUS_TEXT}${suffix}`;
	return `${theme.fg("accent", STATUS_TEXT)}${suffix ? theme.fg("dim", suffix) : ""}`;
}

export function buildExtraToolsOnlyStatusText(tools: string[], theme?: StatusTheme | undefined): string {
	return formatStatusText(` • extra tools${tools.length > 0 ? `: ${tools.join(", ")}` : ""}`, theme);
}

export function buildStatusText(options: { mode?: "normal" | "code" | "notebook" | undefined; verbosity?: string | undefined; fast: boolean; useOnAllModels: boolean; additionalProvider?: boolean | undefined; compaction?: boolean | undefined; contextManagement?: ContextManagementMode | undefined; usageStatus?: CodexUsageStatus | undefined }, theme?: StatusTheme | undefined): string {
	const extras = [
		options.mode === "notebook" ? "notebook mode" : options.mode === "code" ? "code mode" : undefined,
		options.useOnAllModels ? "all models" : undefined,
		options.additionalProvider ? "additional provider" : undefined,
		options.contextManagement && options.contextManagement !== "off"
			? `context ${options.contextManagement}`
			: undefined,
		// FORK_MOD: fork hides the compact v2 indicator; restore this entry to re-enable it.
		// options.compaction ? "compact v2" : undefined,
		options.fast ? "fast" : undefined,
		// FORK_MOD: usage segments drop the "left" suffix to keep the footer compact.
		options.usageStatus?.fiveHourUsageLeft === undefined ? undefined : `5h: ${Math.round(options.usageStatus.fiveHourUsageLeft)}%`,
		options.usageStatus?.weeklyUsageLeft === undefined ? undefined : `weekly: ${Math.round(options.usageStatus.weeklyUsageLeft)}%`,
	]
		.filter(Boolean)
		.join(" • ");
	// FORK_MOD: fork hides the verbosity level; restore this line to re-enable it.
	// const verbosity = options.verbosity === "medium" ? "mid" : options.verbosity === "high" ? "hi" : options.verbosity;
	return formatStatusText(`${extras ? ` • ${extras}` : ""}`, theme);
}

export const DEFAULT_TOOL_NAMES = ["read", "bash", "edit", "write"];

export const SHELL_ADAPTER_TOOL_NAMES = ["exec_command", "write_stdin"];
export const APPLY_PATCH_TOOL_NAME = "apply_patch";
export const CORE_ADAPTER_TOOL_NAMES = [...SHELL_ADAPTER_TOOL_NAMES, APPLY_PATCH_TOOL_NAME];
export const CODE_MODE_TOOL_NAMES = ["exec", "wait"];
export const NOTEBOOK_MODE_TOOL_NAMES = [...CODE_MODE_TOOL_NAMES, "notebook"];
export const VIEW_IMAGE_TOOL_NAME = "view_image";
export const CONTEXT_WINDOW_TOOL_NAMES = [
	"new_context",
	"get_context_remaining",
];
export const CONTEXT_DIRECT_TOOL_NAMES = [
	"new_context",
	"history",
	"notes",
];
export const CONTEXT_MANAGEMENT_TOOL_NAMES = [
	...CONTEXT_WINDOW_TOOL_NAMES,
	"history",
	"notes",
];
