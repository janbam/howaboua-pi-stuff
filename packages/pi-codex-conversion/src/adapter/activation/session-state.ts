import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/** Session-entry type used only to restore adapter activation for one conversation. */
const CODEX_ADAPTER_SESSION_STATE = "codex-adapter-session-state";

/** Persisted session-local adapter preference. */
interface CodexAdapterSessionState {
	enabled: boolean;
}

/** Reads the latest adapter preference on the active session branch, defaulting new sessions to enabled. */
export function readSessionAdapterEnabled(
	ctx: Pick<ExtensionContext, "sessionManager">,
): boolean {
	const entry = ctx.sessionManager.getBranch().findLast(
		(item) =>
			item.type === "custom" &&
			item.customType === CODEX_ADAPTER_SESSION_STATE &&
			isCodexAdapterSessionState(item.data),
	);
	if (entry?.type !== "custom") return true;
	return (entry.data as CodexAdapterSessionState).enabled;
}

/** Persists the adapter preference in the current session without changing shared configuration. */
export function writeSessionAdapterEnabled(
	pi: Pick<ExtensionAPI, "appendEntry">,
	enabled: boolean,
): void {
	pi.appendEntry(CODEX_ADAPTER_SESSION_STATE, { enabled });
}

/** Validates the private session entry before it controls runtime activation. */
function isCodexAdapterSessionState(
	value: unknown,
): value is CodexAdapterSessionState {
	return Boolean(
		value &&
			typeof value === "object" &&
			"enabled" in value &&
			typeof value.enabled === "boolean",
	);
}
