import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { taskBoundaryEligible, renderTaskBoundaryReminder } from "./task-boundary.ts";
import {
	CONTEXT_WINDOW_REMINDER_PERCENT,
	CONTEXT_WINDOW_URGENT_PERCENT,
	renderContextWindowReminder,
	type ContextManagementMessageKind,
	type ContextWindowIdentity,
} from "./messages.ts";

export interface ContextRemaining {
	remainingTokens: number | undefined;
	remainingPercent: number | undefined;
	windowId: string | undefined;
	contextWindow: number;
}

export class ContextWindowBudget {
	private readonly remindedWindows = new Set<string>();
	private readonly urgentWindows = new Set<string>();
	private readonly taskBoundaryWindows = new Set<string>();

	reset(): void {
		this.resetThresholds();
		this.taskBoundaryWindows.clear();
	}

	resetThresholds(): void {
		// Compaction frees capacity, but does not create a new window identity.
		this.remindedWindows.clear();
		this.urgentWindows.clear();
	}

	restore(kind: ContextManagementMessageKind, windowId: string): void {
		if (kind === "task-boundary") this.taskBoundaryWindows.add(windowId);
		if (kind === "reminder" || kind === "urgent" || kind === "fallback") this.remindedWindows.add(windowId);
		if (kind === "urgent" || kind === "fallback") this.urgentWindows.add(windowId);
	}

	record(
		ctx: ExtensionContext,
		identity: ContextWindowIdentity,
		contextTokens?: number,
	): { content: string; kind: "reminder" | "urgent" } | undefined {
		const remaining = this.remaining(ctx, identity, contextTokens);
		if (remaining.remainingTokens === undefined || remaining.remainingPercent === undefined) return;
		const windowId = identity.currentWindowId;
		const usedPercent = 100 * (1 - remaining.remainingTokens / remaining.contextWindow);
		const urgent = usedPercent >= CONTEXT_WINDOW_URGENT_PERCENT;
		if (urgent ? !this.urgentWindows.has(windowId)
			: usedPercent >= CONTEXT_WINDOW_REMINDER_PERCENT && !this.remindedWindows.has(windowId)) {
			this.remindedWindows.add(windowId);
			if (urgent) this.urgentWindows.add(windowId);
			return { content: renderContextWindowReminder(remaining.remainingPercent, urgent), kind: urgent ? "urgent" : "reminder" };
		}
	}

	recordTaskBoundary(
		ctx: ExtensionContext,
		identity: ContextWindowIdentity,
		contextTokens?: number,
		threshold = 0,
	): { content: string; kind: "task-boundary" } | undefined {
		if (this.taskBoundaryWindows.has(identity.currentWindowId)) return;
		const tokens = contextTokens ?? ctx.getContextUsage()?.tokens;
		if (!taskBoundaryEligible(ctx, threshold, tokens)) return;
		const { remainingPercent } = this.remaining(ctx, identity, contextTokens);
		if (remainingPercent === undefined) return;
		this.taskBoundaryWindows.add(identity.currentWindowId);
		return { content: renderTaskBoundaryReminder(remainingPercent), kind: "task-boundary" };
	}

	remaining(
		ctx: ExtensionContext,
		identity: ContextWindowIdentity | undefined,
		contextTokens?: number,
	): ContextRemaining {
		const usage = ctx.getContextUsage();
		const contextWindow = usage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
		const tokens = contextTokens ?? usage?.tokens;
		const remainingTokens = tokens === null || tokens === undefined || !Number.isFinite(tokens)
			|| !Number.isFinite(contextWindow) || contextWindow <= 0
			? undefined : Math.max(0, contextWindow - Math.max(0, tokens));
		return {
			remainingTokens,
			remainingPercent: remainingTokens === undefined ? undefined : Math.round(remainingTokens / contextWindow * 1000) / 10,
			windowId: identity?.currentWindowId,
			contextWindow,
		};
	}
}
