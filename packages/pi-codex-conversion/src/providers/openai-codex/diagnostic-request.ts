import { isResponsesLiteRequest } from "./responses-lite.ts";
import type { CodexRequestDiagnostics, ResponsesBody } from "./types.ts";

/** Reduce request state before it crosses the diagnostics privacy boundary. */
export function codexRequestDiagnostics(body: ResponsesBody, headers: Headers, headersSent = true): CodexRequestDiagnostics {
	const metadata = body.client_metadata;
	const kind = metadata?.["x-openai-subagent"] ?? headers.get("x-openai-subagent");
	const guardianReviewer = headers.get("x-codex-guardian") === "reviewer";
	const effort = body.reasoning?.effort;
	const tier = body.service_tier;
	return {
		headersSent,
		reasoningEffort: effort && ["none", "minimal", "low", "medium", "high", "xhigh", "max"].includes(effort) ? effort : effort ? "other" : "unset",
		serviceTier: tier && ["auto", "default", "flex", "priority", "ultrafast"].includes(tier) ? tier : tier ? "other" : "unset",
		accessProgram: body.access_programs?.cyber === "standard" || body.access_programs?.cyber === "daybreak_blue" || body.access_programs?.cyber === "daybreak_red" ? body.access_programs.cyber : "unset",
		responsesLite: isResponsesLiteRequest(body),
		routingHint: headers.has("x-codex-routing-hint") ? "present" : guardianReviewer ? "guardian_suppressed" : "absent",
		guardianReviewer,
		parentThreadLinked: Boolean(metadata?.["x-codex-parent-thread-id"] || headers.get("x-codex-parent-thread-id")),
		subagentKind: kind && ["collab_spawn", "explorer", "reviewer", "general"].includes(kind) ? kind : kind ? "other" : "none",
	};
}
