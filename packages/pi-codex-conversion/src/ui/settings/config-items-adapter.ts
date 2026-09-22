import type { Theme } from "@earendil-works/pi-coding-agent";
import {
	type CodexConversionConfig,
	normalizeProviderList,
} from "../../adapter/activation/config.ts";
import type { ExecutionMode } from "../../adapter/activation/execution-mode.ts";
import { getCodexAppendSystemPromptPath } from "../../prompt/append-system-prompt.ts";
import { editorCommand } from "./config-editor.ts";
import {
	type ConfigSetting,
	setting,
	TextSettingSubmenu,
	toggle,
} from "./config-items-shared.ts";

export function buildAdapterSettings(
	config: CodexConversionConfig,
	theme: Theme,
	adapterEnabled = true,
): ConfigSetting[] {
	return [
		{
			item: {
				id: "adapterEnabled",
				label: "Adapter enabled",
				currentValue: adapterEnabled ? "on" : "off",
				values: ["off", "on"],
				description: "Session-only. Off leaves voice and /codex available, but disables prompt and request conversion plus every adapter tool, including standalone extras.",
			},
			action: "adapter-enabled",
		},
		setting(
			{
				id: "executionMode",
				description: "Structured: standard JSON schemas. Code: JavaScript. Notebook: persistent Deno shell with checkpoints.",
				label: "Execution mode",
				currentValue: formatExecutionMode(config.executionMode),
				values: ["Structured", "Code", "Notebook (recommended)"],
			},
			(value, current) => ({
				...current,
				executionMode: parseExecutionMode(value),
			}),
		),
		setting(
			{
				id: "extensionMode",
				description: "Voice only disables the prompt and tool adapter. Standalone tools remain controlled by Provider scope.",
				label: "Extension mode",
				currentValue: config.voiceFeaturesOnly
					? "voice only"
					: "adapter and voice",
				values: ["adapter and voice", "voice only"],
			},
			(value, current) => ({
				...current,
				voiceFeaturesOnly: value === "voice only",
			}),
		),
		setting(
			{
				id: "allProviders",
				description: "Codex + Extra tools gives Codex and Responses-compatible Additional providers the full adapter, and other Additional providers only enabled standalone tools. Extra tools never replace the prompt.",
				label: "Provider scope",
				currentValue: formatAllProvidersMode(config.scope.allProviders),
				values: ["Codex and configured", "Codex + Extra tools", "all providers", "extra tools only"],
			},
			(value, current) => ({
				...current,
				scope: {
					...current.scope,
					allProviders: parseAllProvidersMode(value),
				},
			}),
		),
		setting(
			{
				id: "additionalProviders",
				description: "Provider IDs that receive the full adapter when Responses-compatible, or standalone extras under Codex + Extra tools when using another API.",
				label: "Additional providers",
				currentValue: config.scope.additionalProviders.join(", "),
				submenu: (currentValue, done) =>
					new TextSettingSubmenu(
						"Additional providers",
						"Comma-separated provider ids controlled by Provider scope.",
						currentValue,
						(value) => done(normalizeCodexProviderText(value)),
						() => done(),
						theme,
					),
			},
			(value, current) => ({
				...current,
				scope: {
					...current.scope,
					additionalProviders: normalizeProviderList(value.split(",")),
				},
			}),
		),
		setting(
			{
				id: "heavySystemPromptOverwrite",
				description: "Remove generic instructions from the system prompt.",
				label: "Heavy system prompt overwrite",
				currentValue: config.prompt.heavySystemPromptOverwrite
					? "on (40% smaller)"
					: "off",
				values: ["off", "on (40% smaller)"],
			},
			(value, current) => ({
				...current,
				prompt: {
					...current.prompt,
					heavySystemPromptOverwrite: value !== "off",
				},
			}),
		),
		toggle(
			"appendSystemPromptFile",
			"Append CODEX_APPEND_SYSTEM.md",
			config.prompt.appendSystemPromptFile,
			(enabled, current) => ({
				...current,
				prompt: {
					...current.prompt,
					appendSystemPromptFile: enabled,
				},
			}),
			`Append ${getCodexAppendSystemPromptPath()} after the converted system prompt when the file exists.`,
		),
		{
			item: {
				id: "editConfig",
				description: "Open the selected scope's config file in your editor for settings not exposed here.",
				label: "Edit config",
				currentValue: editorCommand()
					? "Opens in default editor (please /reload)"
					: "Set $EDITOR",
				values: editorCommand() ? ["Open"] : ["Unavailable"],
			},
			action: "edit-config",
		},
	];
}

/** Formats an execution mode for the General settings selector. */
function formatExecutionMode(mode: ExecutionMode): string {
	if (mode === "code") return "Code";
	if (mode === "notebook") return "Notebook (recommended)";
	return "Structured";
}

/** Parses the General settings selector value into the persisted execution mode. */
function parseExecutionMode(value: string): ExecutionMode {
	if (value === "Code") return "code";
	if (value === "Notebook (recommended)") return "notebook";
	return "normal";
}

function formatAllProvidersMode(
	value: CodexConversionConfig["scope"]["allProviders"],
): string {
	if (value === "on") return "all providers";
	if (value === "extras") return "extra tools only";
	if (value === "codex-plus-extras") return "Codex + Extra tools";
	return "Codex and configured";
}

function parseAllProvidersMode(
	value: string,
): CodexConversionConfig["scope"]["allProviders"] {
	if (value === "all providers") return "on";
	if (value === "extra tools only") return "extras";
	if (value === "Codex + Extra tools") return "codex-plus-extras";
	return "off";
}

function normalizeCodexProviderText(value: string): string {
	return normalizeProviderList(value.split(",")).join(", ");
}
