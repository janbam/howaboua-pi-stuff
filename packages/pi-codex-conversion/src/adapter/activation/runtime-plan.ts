import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { supportsCodexReasoningUpdates } from "../reasoning-updates.ts";
import { supportsViewImageInputs } from "../tool-support.ts";
import { supportsResponsesLiteModel } from "../../providers/openai-codex/responses-lite-model.ts";
import { isCodexLikeModel, isCodexTransportContext, isOpenAIResponsesContext, isResponsesContext } from "../prompt/codex-model.ts";
import type { CodexConversionConfig, ContextManagementMode } from "./config.ts";
import type { ExecutionMode } from "./execution-mode.ts";
import type { AdapterState } from "./state.ts";
import {
	APPLY_PATCH_TOOL_NAME,
	CODE_MODE_TOOL_NAMES,
	CORE_ADAPTER_TOOL_NAMES,
	NOTEBOOK_MODE_TOOL_NAMES,
	SHELL_ADAPTER_TOOL_NAMES,
	VIEW_IMAGE_TOOL_NAME,
	CONTEXT_DIRECT_TOOL_NAMES,
	CONTEXT_MANAGEMENT_TOOL_NAMES,
} from "./tool-set.ts";

type RuntimeContext = Pick<ExtensionContext, "model">;

interface RuntimePlanBase {
	kind: "inactive" | "extras" | "normal" | "code" | "notebook";
	toolNames: string[];
	ownedToolNames: string[];
	configuredProvider: boolean;
	codexTransport: boolean;
	effectiveOpenAICodex: boolean;
	nativeCompaction: boolean;
	contextManagement: boolean;
	contextManagementMode: ContextManagementMode;
	contextManagementRemote: boolean;
	contextManagementHybrid: boolean;
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

export type CodexRuntimePlan = InactiveRuntimePlan | ExtrasRuntimePlan | NormalRuntimePlan | CodeRuntimePlan | NotebookRuntimePlan;

const ALL_ADAPTER_TOOL_NAMES = [
	"change_reasoning",
	...CORE_ADAPTER_TOOL_NAMES,
	...NOTEBOOK_MODE_TOOL_NAMES,
	VIEW_IMAGE_TOOL_NAME,
	...CONTEXT_MANAGEMENT_TOOL_NAMES,
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
	return /^(?:gpt-6-astra|gpt-5\.6(?:-(?:luna|terra|sol))?)$/.test(id.toLowerCase());
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

function normalToolNames(ctx: RuntimeContext, config: CodexConversionConfig, contextManagement: boolean): string[] {
	const names = [...CORE_ADAPTER_TOOL_NAMES];
	if (supportsViewImageInputs(ctx.model) || config.tools.viewImageFallback) names.push(VIEW_IMAGE_TOOL_NAME);
	if (contextManagement) names.push(...CONTEXT_MANAGEMENT_TOOL_NAMES);
	return names;
}

export function resolveCodexRuntimePlan(
	ctx: RuntimeContext,
	config: CodexConversionConfig,
	executionMode?: ExecutionMode,
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
		...CONTEXT_MANAGEMENT_TOOL_NAMES,
	];
	const base = {
		ownedToolNames,
		configuredProvider: isConfigured,
		codexTransport,
		effectiveOpenAICodex,
		nativeCompaction: false,
		contextManagement: false,
		contextManagementMode: "off" as const,
		contextManagementRemote: false,
		contextManagementHybrid: false,
		autoReasoning: false,
	};
	// Keep the mixed policy disjoint: Codex-qualified models own the full adapter while list membership grants only standalone tools.
	const extras = hasExtras(config)
		&& (mixedScope
			? isListedAdditionalProvider && !codexLike
			: scope === "extras"
				|| (config.voiceFeaturesOnly && scope === "on")
				|| (scope === "off" && (isConfigured || codexLike)));
	if (extras) {
		return { ...base, kind: "extras", toolNames: extraToolNames(ctx, config), prompt: undefined, transport: "responses" };
	}
	if (config.voiceFeaturesOnly) return { ...base, kind: "inactive", toolNames: [], prompt: undefined, transport: undefined };

	// In mixed scope, configured Responses providers deliberately stop qualifying for prompt and transport adaptation.
	const active = mixedScope ? codexLike : scope === "on" || isConfigured || codexLike;
	if (!active) return { ...base, kind: "inactive", toolNames: [], prompt: undefined, transport: undefined };
	const configuredContextManagementMode = isResponsesContext(ctx)
		? config.compaction.contextManagement
		: "off";
	const contextManagement = configuredContextManagementMode !== "off" &&
		(configuredContextManagementMode !== "remote" || codexTransport);
	const contextManagementMode = contextManagement
		? configuredContextManagementMode
		: "off";
	const contextManagementRemote = contextManagementMode === "remote";
	base.contextManagementHybrid = contextManagement && config.compaction.hybridCompaction;
	const nativeCompaction = effectiveOpenAICodex &&
		(base.contextManagementHybrid || (config.compaction.responsesCompaction && configuredContextManagementMode === "off"));
	base.autoReasoning = config.tools.autoReasoning && supportsCodexReasoningUpdates(ctx.model);
	const configuredExecutionMode = executionMode ?? config.executionMode;
	const requestedCodeMode = configuredExecutionMode === "code" || configuredExecutionMode === "notebook"
		? configuredExecutionMode
		: configuredExecutionMode === "normal"
			? undefined
			: undefined;
	if (requestedCodeMode) {
		const transport = usesResponsesLite(ctx, config)
			? "responses-lite"
			: "responses";
		if (requestedCodeMode === "notebook") {
			return {
				...base,
				kind: "notebook",
				toolNames: [
					...NOTEBOOK_MODE_TOOL_NAMES,
					...(contextManagement ? CONTEXT_DIRECT_TOOL_NAMES : []),
				],
				prompt: "notebook",
				transport,
				nativeCompaction,
				contextManagement,
				contextManagementMode,
				contextManagementRemote,
			};
		}
		return {
			...base,
			kind: "code",
			toolNames: [
				...CODE_MODE_TOOL_NAMES,
				...(contextManagement ? CONTEXT_DIRECT_TOOL_NAMES : []),
			],
			prompt: "code",
			transport,
			nativeCompaction,
			contextManagement,
			contextManagementMode,
			contextManagementRemote,
		};
	}
	return {
		...base,
		kind: "normal",
		toolNames: [...normalToolNames(ctx, config, contextManagement), ...(base.autoReasoning ? ["change_reasoning"] : [])],
		prompt: "normal",
		transport: "responses",
		nativeCompaction,
		contextManagement,
		contextManagementMode,
		contextManagementRemote,
	};
}

export function resolveCodexRuntimePlanForState(
	ctx: RuntimeContext,
	state: Pick<AdapterState, "config" | "executionMode" | "availableToolNames">,
): CodexRuntimePlan {
	const plan = resolveCodexRuntimePlan(ctx, state.config, state.executionMode);
	const missingToolNames = state.availableToolNames === undefined
		? []
		: plan.toolNames.filter((name) => !state.availableToolNames?.includes(name));
	if (!missingToolNames.length) return plan;
	return {
		...plan,
		kind: "inactive",
		toolNames: [],
		missingToolNames,
		prompt: undefined,
		transport: undefined,
		nativeCompaction: false,
		contextManagement: false,
		contextManagementMode: "off",
		contextManagementRemote: false,
		contextManagementHybrid: false,
		autoReasoning: false,
	};
}

export function isAdapterRuntime(plan: CodexRuntimePlan): plan is NormalRuntimePlan | CodeRuntimePlan | NotebookRuntimePlan {
	return plan.kind === "normal" || plan.kind === "code" || plan.kind === "notebook";
}

export function isCodeModeRuntime(plan: CodexRuntimePlan): plan is CodeRuntimePlan | NotebookRuntimePlan {
	return plan.kind === "code" || plan.kind === "notebook";
}

export const ALL_CODEX_ADAPTER_TOOL_NAMES = ALL_ADAPTER_TOOL_NAMES;
