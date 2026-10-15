import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export function renderTaskBoundaryReminder(remainingPercent: number): string {
	return `<context_window_reminder>\nThis window is approaching the recommended token budget. You still have ${remainingPercent}% of your context window remaining, so there is no need to start a new window immediately. If you are working through a sequence of tasks toward a larger goal, finish the current task, save a checkpoint, and start a new window before continuing with the next task. Otherwise, continue here.\n</context_window_reminder>`;
}

export const TASK_BOUNDARY_PRESETS = [
	0, 250_000, 300_000, 400_000, 450_000,
] as const;
export function taskBoundaryLabel(tokens: number): string {
	return tokens === 0
		? "off"
		: TASK_BOUNDARY_PRESETS.some((value) => value === tokens)
			? `${tokens / 1000}k`
			: "custom (edit JSON)";
}
export function taskBoundaryEligible(
	ctx: ExtensionContext,
	threshold: number,
	tokens = ctx.getContextUsage()?.tokens,
): boolean {
	const capacity =
		ctx.getContextUsage()?.contextWindow ?? ctx.model?.contextWindow ?? 0;
	return (
		threshold > 0 &&
		Number.isFinite(capacity) &&
		capacity > 272_000 &&
		typeof tokens === "number" &&
		Number.isFinite(tokens) &&
		tokens >= threshold
	);
}
