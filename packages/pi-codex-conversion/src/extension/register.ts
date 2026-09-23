import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerCodeModeProxyProvider } from "../providers/code-mode-proxy-provider.ts";
import { registerOpenAICodexCustomProvider } from "../providers/openai-codex-custom-provider.ts";
import { registerApplyPatchDisplayBroker } from "../tools/apply-patch/display-broker.ts";
import { registerCodexCommand } from "../ui/settings/command.ts";
import { registerCodexCodeMode } from "../adapter/code-mode.ts";
import { prepareCodeModeHost, registerCodexEvents } from "./events.ts";
import { createCodexExtensionRuntime } from "./runtime.ts";
import { registerCodexTools } from "./tools.ts";
import { registerCodexUi } from "./ui.ts";
import { registerCodexVoiceRenderer } from "../voice/ui.ts";
import { resolveCodexRuntimePlanForState } from "../adapter/activation/runtime-plan.ts";
import { hasCodexCacheKeepalivePlanChanged } from "../adapter/activation/cache-keepalive.ts";

export async function registerCodexConversion(pi: ExtensionAPI): Promise<void> {
	registerCodexVoiceRenderer(pi);
	registerApplyPatchDisplayBroker(pi);
	const runtime = createCodexExtensionRuntime(pi);
	runtime.state.contextTree.register(pi);
	const codeMode = await registerCodexCodeMode(pi, runtime);
	let cleanupCodexProvider: ReturnType<typeof registerOpenAICodexCustomProvider> | undefined;
	let cleanupProxyProvider: ReturnType<typeof registerCodeModeProxyProvider> | undefined;
	try {
		const codexProvider = registerOpenAICodexCustomProvider(pi, {
			getConfig: () => ({ executionMode: runtime.state.executionMode, openai: runtime.state.config.openai, compaction: runtime.state.config.compaction }),
			useResponsesLite: (model) => resolveCodexRuntimePlanForState({ model }, runtime.state).transport === "responses-lite",
			turnState: runtime.state.codexTurnState,
			getDiagnostics: () => runtime.diagnosticsSink(),
			beforeRequestSend: runtime.beforeRequestSend,
		});
		cleanupCodexProvider = codexProvider;
		const proxyProvider = registerCodeModeProxyProvider(
			pi,
			() => runtime.state.config,
			() => runtime.state.executionMode,
			() => runtime.state.availableToolNames,
			runtime.beforeRequestSend,
			() => runtime.state.adapterEnabled,
		);
		cleanupProxyProvider = proxyProvider;
		const tools = registerCodexTools(pi, runtime);
		const ui = registerCodexUi(pi, runtime);
		/** Starts or stops the mode host when session or persisted settings change adapter availability. */
		const reconcileCodeModeHost = (
			ctx: Parameters<typeof prepareCodeModeHost>[1],
			fullAdapterEnabled: boolean,
			fullAdapterWasEnabled: boolean,
			executionModeChanged: boolean,
		) => {
			if (!fullAdapterEnabled && fullAdapterWasEnabled) {
				void codeMode.shutdownHost().catch((error: unknown) => {
					ctx.ui.notify(`Could not stop Code Mode host: ${error instanceof Error ? error.message : String(error)}`, "warning");
				});
			} else if (fullAdapterEnabled && (!fullAdapterWasEnabled || executionModeChanged)) {
				void codeMode.shutdownHost()
					.then(() => prepareCodeModeHost(codeMode, ctx))
					.catch((error: unknown) => {
						ctx.ui.notify(`Could not switch execution mode: ${error instanceof Error ? error.message : String(error)}`, "warning");
					});
			}
		};
		registerCodexCommand(pi, runtime.state, runtime.voice, runtime.lanVoice, (config, ctx, previousConfig) => {
			const executionModeChanged = config.executionMode !== previousConfig.executionMode;
			const fullAdapterEnabled = runtime.state.adapterEnabled && !config.voiceFeaturesOnly;
			const fullAdapterWasEnabled = runtime.state.adapterEnabled && !previousConfig.voiceFeaturesOnly;
			const promptConfigChanged =
				config.prompt.heavySystemPromptOverwrite !== previousConfig.prompt.heavySystemPromptOverwrite
				|| config.prompt.appendSystemPromptFile !== previousConfig.prompt.appendSystemPromptFile;
			if (executionModeChanged || config.voiceFeaturesOnly !== previousConfig.voiceFeaturesOnly ||
				config.notebook.maxHeapMiB !== previousConfig.notebook.maxHeapMiB || config.notebook.profile !== previousConfig.notebook.profile)
				runtime.state.notebookStatusMessageId = undefined;
			const contextManagementChanged =
				config.compaction.contextManagement !==
				previousConfig.compaction.contextManagement;
			if (contextManagementChanged) runtime.state.contextWindows.clearTurnNotes();
			tools.applyConfig(config);
			runtime.state.availableToolNames = pi.getAllTools().map((tool) => tool.name);
			if (
				previousConfig.compaction.contextManagement === "off" &&
				config.compaction.contextManagement !== "off" &&
				resolveCodexRuntimePlanForState(ctx, runtime.state).contextManagement
			) {
				runtime.state.contextWindows.restore(
					ctx.sessionManager.getBranch(),
				);
				void runtime.state.contextWindows.startNewWindow(pi, ctx, {
					mode: config.compaction.contextManagement,
					trimPreviousWindow:
						!config.compaction.hybridCompaction && config.compaction.contextManagement !== "tree",
				}).catch((error: unknown) => {
					ctx.ui.notify(`Could not start context window: ${error instanceof Error ? error.message : String(error)}`, "warning");
				});
			}
			proxyProvider.applyConfig(config, ctx.modelRegistry);
			ui.applyConfig(config, ctx, previousConfig);
			if (config.openai.cacheDiagnostics !== previousConfig.openai.cacheDiagnostics) {
				void runtime.configureDiagnostics(
					ctx,
					previousConfig.openai.cacheDiagnostics !== "status-and-log"
						&& config.openai.cacheDiagnostics === "status-and-log",
				);
			}
			if (hasCodexCacheKeepalivePlanChanged(ctx.model?.id, previousConfig.openai, config.openai)) {
				runtime.cancelCacheKeepalive();
			}
			if (
				config.voiceFeaturesOnly !== previousConfig.voiceFeaturesOnly
				|| executionModeChanged
				|| promptConfigChanged
				|| config.openai.fast !== previousConfig.openai.fast
				|| config.openai.harnessIdentifierHeader !== previousConfig.openai.harnessIdentifierHeader
				|| contextManagementChanged
				|| config.compaction.hybridCompaction !== previousConfig.compaction.hybridCompaction
				|| config.compaction.responsesCompaction !== previousConfig.compaction.responsesCompaction
			) {
				runtime.resetTransport(ctx.sessionManager.getSessionId());
			}
			reconcileCodeModeHost(ctx, fullAdapterEnabled, fullAdapterWasEnabled, executionModeChanged);
		}, (enabled, ctx, previousEnabled) => {
			runtime.cancelCacheKeepalive();
			runtime.resetTransport(ctx.sessionManager.getSessionId());
			codexProvider.applyEnabled(enabled);
			proxyProvider.applyConfig(runtime.state.config, ctx.modelRegistry);
			void runtime.configureDiagnostics(ctx);
			ui.applyAdapterEnabled(ctx);
			reconcileCodeModeHost(
				ctx,
				enabled && !runtime.state.config.voiceFeaturesOnly,
				previousEnabled && !runtime.state.config.voiceFeaturesOnly,
				false,
			);
		});
		registerCodexEvents(pi, runtime, tools, ui, codeMode, codexProvider, proxyProvider);
	} catch (registrationError) {
		try {
			try {
				try {
					cleanupProxyProvider?.shutdown();
				} finally {
					cleanupCodexProvider?.shutdown();
				}
			} finally {
				await codeMode.shutdown();
			}
		} catch (shutdownError) {
			throw new AggregateError(
				[registrationError, shutdownError],
				"Codex conversion registration and Code Mode cleanup failed",
			);
		}
		throw registrationError;
	}
}
