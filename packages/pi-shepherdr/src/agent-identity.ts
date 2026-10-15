import type { PaneInfo } from "./types.js";

export function sameAgentIdentity(
	expected: PaneInfo,
	current: PaneInfo,
): boolean {
	return (
		current.pane_id === expected.pane_id &&
		current.workspace_id === expected.workspace_id &&
		current.tab_id === expected.tab_id &&
		current.terminal_id === expected.terminal_id &&
		current.agent_session?.agent === expected.agent_session?.agent &&
		current.agent_session?.kind === expected.agent_session?.kind &&
		current.agent_session?.source === expected.agent_session?.source &&
		current.agent_session?.value === expected.agent_session?.value
	);
}
