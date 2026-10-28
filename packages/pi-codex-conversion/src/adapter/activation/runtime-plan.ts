import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { supportsCodexReasoningUpdates } from "../reasoning-updates.ts";
import { supportsViewImageInputs } from "../tool-support.ts";
import { isGpt6ModelId, supportsResponsesLiteModel } from "../../providers/openai-codex/responses-lite-model.ts";
import { isCodexLikeModel, isCodexTransportContext, isOpenAIResponsesContext, isResponsesContext } from "../prompt/codex-model.ts";
import type { CodexConversionConfig } from "./config.ts";
import { FAST_MODE_FAMILIES } from "./config-contract.ts";
import type { ExecutionMode } from "./execution-mode.ts";
import type { AdapterState } from "./state.ts";
import {
	APPLY_PATCH_TOOL_NAME,
	CODE_MODE_TOOL_NAMES,
	CORE_ADAPTER_TOOL_NAMES,
	NOTEBOOK_MODE_TOOL_NAMES,
	SHELL_ADAPTER_TOOL_NAMES,
	VIEW_IMAGE_TOOL_NAME,
} from "./tool-set.ts";

type RuntimeContext = Pick<ExtensionContext, "model">;

interface RuntimePlanBase {
	kind: "inactive" | "extras" | "normal" | "code" | "notebook" | "ts" | "js";
	toolNames: string[];
	ownedToolNames: string[];
	configuredProvider: boolean;
	codexTransport: boolean;
	effectiveOpenAICodex: boolean;
	nativeCompaction: boolean;
	nativeReplay: boolean;
	autoReasoning: boolean;
}

export interface InactiveRuntimePlan extends RuntimePlanBase {
	kind: "inactive";
	missingToolNames?: string[];
	toolNames: [];
	prompt: undefined;
	transport: undefined;
}

export interface ExtrasRuntimePlan extends RuntimePlanBase {
	kind: "extras";
	prompt: undefined;
	transport: "responses";
}

export interface NormalRuntimePlan extends RuntimePlanBase {
	kind: "normal";
	prompt: "normal";
	transport: "responses";
}

export interface CodeRuntimePlan extends RuntimePlanBase {
	kind: "code";
	prompt: "code";
	transport: "responses" | "responses-lite";
}

export interface NotebookRuntimePlan extends RuntimePlanBase {
	kind: "notebook";
	prompt: "notebook";
	transport: "responses" | "responses-lite";
}

export interface TsRuntimePlan extends RuntimePlanBase {
	kind: "ts";
	prompt: "ts";
	transport: "responses" | "responses-lite";
}

export interface JsRuntimePlan extends RuntimePlanBase {
	kind: "js";
	prompt: "js";
	transport: "responses" | "responses-lite";
}

export type CodexRuntimePlan = InactiveRuntimePlan | ExtrasRuntimePlan | NormalRuntimePlan | CodeRuntimePlan | NotebookRuntimePlan | TsRuntimePlan | JsRuntimePlan;

const ALL_ADAPTER_TOOL_NAMES = [
	"change_reasoning",
	...CORE_ADAPTER_TOOL_NAMES,
	...NOTEBOOK_MODE_TOOL_NAMES,
	VIEW_IMAGE_TOOL_NAME,
];

function listedAdditionalProvider(ctx: RuntimeContext, config: CodexConversionConfig): boolean {
	const provider = ctx.model?.provider?.trim().toLowerCase();
	return Boolean(provider && config.scope.additionalProviders.includes(provider));
}

function configuredProvider(ctx: RuntimeContext, config: CodexConversionConfig): boolean {
	return isResponsesContext(ctx) && listedAdditionalProvider(ctx, config);
}

function proxySupportsResponsesLite(ctx: RuntimeContext, config: CodexConversionConfig): boolean {
	if (!config.openai.proxyResponsesLite || !configuredProvider(ctx, config) || !isOpenAIResponsesContext(ctx)) return false;
	const modelId = ctx.model?.id;
	if (!modelId) return false;
	const id = modelId.includes("/") ? (modelId.split("/").pop() ?? modelId) : modelId;
	return isGpt6ModelId(id) || /^gpt-5\.6(?:-(?:luna|terra|sol))?$/.test(id.toLowerCase());
}

function usesResponsesLite(ctx: RuntimeContext, config: CodexConversionConfig): boolean {
	return isCodexTransportContext(ctx)
		? supportsResponsesLiteModel(ctx.model?.id)
		: proxySupportsResponsesLite(ctx, config);
}

function hasExtras(config: CodexConversionConfig): boolean {
	const tools = config.tools;
	return tools.applyPatchOnly || tools.viewImageOnly;
}

function extraToolNames(ctx: RuntimeContext, config: CodexConversionConfig): string[] {
	const names: string[] = [];
	if (config.tools.applyPatchOnly) names.push(APPLY_PATCH_TOOL_NAME);
	if (config.tools.viewImageOnly && (supportsViewImageInputs(ctx.model) || config.tools.viewImageFallback)) names.push(VIEW_IMAGE_TOOL_NAME);
	return names;
}

function normalToolNames(ctx: RuntimeContext, config: CodexConversionConfig): string[] {
	const names = [...CORE_ADAPTER_TOOL_NAMES];
	if (supportsViewImageInputs(ctx.model) || config.tools.viewImageFallback) names.push(VIEW_IMAGE_TOOL_NAME);
	return names;
}

/** Provider feature negotiation shares the configured method; route eligibility is resolved below. */
export function nativeCompactionConfigured(compaction: CodexConversionConfig["compaction"] | undefined): boolean {
	return compaction !== undefined && compaction.method !== "pi";
}

export function hasCodexTransportConfigChanged(previous: CodexConversionConfig, next: CodexConversionConfig): boolean {
	return next.voiceFeaturesOnly !== previous.voiceFeaturesOnly
		|| next.executionMode !== previous.executionMode
		|| next.prompt.heavySystemPromptOverwrite !== previous.prompt.heavySystemPromptOverwrite
		|| [...FAST_MODE_FAMILIES, "other" as const].some((family) => next.openai.fast[family] !== previous.openai.fast[family])
		|| next.openai.daybreak !== previous.openai.daybreak
		|| next.openai.harnessIdentifierHeader !== previous.openai.harnessIdentifierHeader
		|| nativeCompactionConfigured(next.compaction) !== nativeCompactionConfigured(previous.compaction);
}

export function resolveCodexRuntimePlan(
	ctx: RuntimeContext,
	config: CodexConversionConfig,
	executionMode?: ExecutionMode,
	adapterEnabled = true,
): CodexRuntimePlan {
	const scope = config.scope.allProviders;
	const isConfigured = configuredProvider(ctx, config);
	const isListedAdditionalProvider = listedAdditionalProvider(ctx, config);
	const codexLike = isCodexLikeModel(ctx.model);
	const mixedScope = scope === "codex-plus-extras";
	const codexTransport = isCodexTransportContext(ctx);
	const effectiveOpenAICodex = codexTransport || isConfigured;
	const ownedToolNames = [
		"change_reasoning",
		...SHELL_ADAPTER_TOOL_NAMES,
		...NOTEBOOK_MODE_TOOL_NAMES,
		APPLY_PATCH_TOOL_NAME,
		VIEW_IMAGE_TOOL_NAME,
	];
	const base = {
		ownedToolNames,
		configuredProvider: isConfigured,
		codexTransport,
		effectiveOpenAICodex,
		nativeCompaction: false,
		nativeReplay: false,
		autoReasoning: false,
	};
	// The master switch suppresses every adapter surface, including standalone extras.
	if (!adapterEnabled)
		return { ...base, kind: "inactive", toolNames: [], prompt: undefined, transport: undefined };
	const mixedFullAdapter = codexLike || isConfigured;
	// Split listed providers by protocol: Responses providers keep the adapter, while other APIs receive only standalone tools.
	const extras = hasExtras(config)
		&& (mixedScope
			? isListedAdditionalProvider && !mixedFullAdapter
			: scope === "extras"
				|| (config.voiceFeaturesOnly && scope === "on")
				|| (scope === "off" && (isConfigured || codexLike)));
	if (extras) {
		return { ...base, kind: "extras", toolNames: extraToolNames(ctx, config), prompt: undefined, transport: "responses" };
	}
	if (config.voiceFeaturesOnly) return { ...base, kind: "inactive", toolNames: [], prompt: undefined, transport: undefined };

	// Preserve the existing configured-provider adapter path in mixed scope; only non-Responses providers fall back to extras.
	const active = mixedScope ? mixedFullAdapter : scope === "on" || isConfigured || codexLike;
	if (!active) return { ...base, kind: "inactive", toolNames: [], prompt: undefined, transport: undefined };
	base.nativeReplay = effectiveOpenAICodex;
	const nativeCompaction = effectiveOpenAICodex && nativeCompactionConfigured(config.compaction);
	base.autoReasoning = config.tools.autoReasoning && supportsCodexReasoningUpdates(ctx.model);
	const configuredExecutionMode = executionMode ?? config.executionMode;
	const requestedCodeMode = configuredExecutionMode === "code" || configuredExecutionMode === "notebook" || configuredExecutionMode === "ts" || configuredExecutionMode === "js"
		? configuredExecutionMode
		: configuredExecutionMode === "normal"
			? undefined
			: undefined;
	if (requestedCodeMode) {
		const transport: "responses-lite" | "responses" = usesResponsesLite(ctx, config)
			? "responses-lite"
			: "responses";
		if (requestedCodeMode === "notebook" || requestedCodeMode === "ts" || requestedCodeMode === "js") {
			const statefulPlan = {
				...base,
				toolNames: [
					...NOTEBOOK_MODE_TOOL_NAMES,
				],
				transport,
				nativeCompaction,
			};
			return requestedCodeMode === "js"
				? { ...statefulPlan, kind: "js", prompt: "js" }
				: requestedCodeMode === "ts"
				? { ...statefulPlan, kind: "ts", prompt: "ts" }
				: { ...statefulPlan, kind: "notebook", prompt: "notebook" };
		}
		return {
			...base,
			kind: "code",
			toolNames: [
				...CODE_MODE_TOOL_NAMES,
			],
			prompt: "code",
			transport,
			nativeCompaction,
		};
	}
	return {
		...base,
		kind: "normal",
		toolNames: [...normalToolNames(ctx, config), ...(base.autoReasoning ? ["change_reasoning"] : [])],
		prompt: "normal",
		transport: "responses",
		nativeCompaction,
	};
}

export function resolveCodexRuntimePlanForState(
	ctx: RuntimeContext,
	state: Pick<AdapterState, "adapterEnabled" | "config" | "executionMode" | "availableToolNames">,
): CodexRuntimePlan {
	const plan = resolveCodexRuntimePlan(ctx, state.config, state.executionMode, state.adapterEnabled);
	const missingToolNames = state.availableToolNames === undefined
		? []
		: plan.toolNames
			.filter((name) => !state.availableToolNames?.includes(name));
	if (!missingToolNames.length) return plan;
	return {
		...plan,
		kind: "inactive",
		toolNames: [],
		missingToolNames,
		prompt: undefined,
		transport: undefined,
		nativeCompaction: false,
		nativeReplay: false,
		autoReasoning: false,
	};
}

export function isAdapterRuntime(plan: CodexRuntimePlan): plan is NormalRuntimePlan | CodeRuntimePlan | NotebookRuntimePlan | TsRuntimePlan | JsRuntimePlan {
	return plan.kind === "normal" || plan.kind === "code" || plan.kind === "notebook" || plan.kind === "ts" || plan.kind === "js";
}

export function isCodeModeRuntime(plan: CodexRuntimePlan): plan is CodeRuntimePlan | NotebookRuntimePlan | TsRuntimePlan | JsRuntimePlan {
	return plan.kind === "code" || plan.kind === "notebook" || plan.kind === "ts" || plan.kind === "js";
}

export const ALL_CODEX_ADAPTER_TOOL_NAMES = ALL_ADAPTER_TOOL_NAMES;
