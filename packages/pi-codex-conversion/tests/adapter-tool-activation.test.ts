import test from "node:test";
import assert from "node:assert/strict";
import { createEventBus, SessionManager } from "@earendil-works/pi-coding-agent";
import { DEFAULT_CODEX_CONVERSION_CONFIG } from "../src/adapter/activation/config.ts";
import { syncAdapter } from "../src/adapter/activation/activation.ts";
import { ALL_CODEX_ADAPTER_TOOL_NAMES, resolveCodexRuntimePlan } from "../src/adapter/activation/runtime-plan.ts";
import type { AdapterState } from "../src/adapter/activation/state.ts";
import { readSessionAdapterEnabled, writeSessionAdapterEnabled } from "../src/adapter/activation/session-state.ts";
import { CodexDeveloperMessageBridge } from "../src/adapter/developer-messages.ts";
import { createCodexTurnState } from "../src/providers/openai-codex/turn-state.ts";

test("session adapter preferences restore the exact builtin tool surface across branch switches", () => {
	const original = ["read", "bash", "edit", "write"];
	let activeTools = [...original];
	const available = [...original, ...ALL_CODEX_ADAPTER_TOOL_NAMES];
	const sessionManager = SessionManager.inMemory(process.cwd());
	const pi = {
		events: createEventBus(),
		getActiveTools: () => activeTools,
		getAllTools: () => available.map((name) => ({ name })),
		setActiveTools: (names: string[]) => { activeTools = names; },
		appendEntry: (customType: string, data: unknown) => sessionManager.appendCustomEntry(customType, data),
	};
	const state: AdapterState = {
		adapterEnabled: true,
		enabled: false,
		cwd: process.cwd(),
		promptSkills: [],
		executionMode: "code",
		codexTurnState: createCodexTurnState(),
		developerMessages: new CodexDeveloperMessageBridge(),
		config: {
			...structuredClone(DEFAULT_CODEX_CONVERSION_CONFIG),
			executionMode: "code",
			scope: { allProviders: "extras", additionalProviders: [] },
			tools: { ...DEFAULT_CODEX_CONVERSION_CONFIG.tools, applyPatchOnly: true },
		},
	};
	const ctx = {
		hasUI: false,
		model: { provider: "unlisted", api: "anthropic-messages", id: "claude-sonnet" },
		sessionManager,
	};
	assert.equal(readSessionAdapterEnabled(ctx as never), true);
	const enabledBranch = sessionManager.appendMessage({ role: "user", content: "Start", timestamp: 1 });

	// Standalone patching hides only edit/write, then the session switch restores their original order.
	assert.equal(syncAdapter(pi as never, ctx as never, state).kind, "extras");
	assert.deepEqual(activeTools, ["read", "bash", "apply_patch"]);
	writeSessionAdapterEnabled(pi as never, false);
	const disabledBranch = sessionManager.getLeafId()!;
	state.adapterEnabled = readSessionAdapterEnabled(ctx as never);
	assert.equal(state.adapterEnabled, false);
	assert.equal(syncAdapter(pi as never, ctx as never, state).kind, "inactive");
	assert.deepEqual(activeTools, original);

	writeSessionAdapterEnabled(pi as never, true);
	state.adapterEnabled = readSessionAdapterEnabled(ctx as never);
	assert.equal(state.adapterEnabled, true);
	assert.equal(syncAdapter(pi as never, ctx as never, state).kind, "extras");

	// Navigation must read only the active branch, not the latest preference in all session entries.
	sessionManager.branch(disabledBranch);
	state.adapterEnabled = readSessionAdapterEnabled(ctx as never);
	assert.equal(state.adapterEnabled, false);
	assert.equal(syncAdapter(pi as never, ctx as never, state).kind, "inactive");
	assert.deepEqual(activeTools, original);
	sessionManager.branch(enabledBranch);
	state.adapterEnabled = readSessionAdapterEnabled(ctx as never);
	assert.equal(state.adapterEnabled, true);
	assert.equal(syncAdapter(pi as never, ctx as never, state).kind, "extras");
	assert.deepEqual(activeTools, ["read", "bash", "apply_patch"]);
});

test("mixed provider scope gives Responses providers the adapter and other listed providers enabled extras", () => {
	const config = {
		...structuredClone(DEFAULT_CODEX_CONVERSION_CONFIG),
		executionMode: "code" as const,
		scope: { allProviders: "codex-plus-extras" as const, additionalProviders: ["responses-proxy", "opencode-go"] },
		tools: { ...DEFAULT_CODEX_CONVERSION_CONFIG.tools, applyPatchOnly: true },
	};

	// Full adapter qualification wins over standalone toggles for Codex and listed Responses providers.
	for (const model of [
		{ provider: "openai-codex", api: "openai-codex-responses", id: "gpt-6-astra", baseUrl: "https://chatgpt.com/backend-api" },
		{ provider: "responses-proxy", api: "openai-responses", id: "claude-sonnet" },
	]) {
		const plan = resolveCodexRuntimePlan({ model } as never, config);
		assert.deepEqual({ kind: plan.kind, prompt: plan.prompt, tools: plan.toolNames }, { kind: "code", prompt: "code", tools: ["exec", "wait"] });
		assert.equal(resolveCodexRuntimePlan({ model } as never, { ...config, tools: { ...config.tools, applyPatchOnly: false } }).kind, "code");
	}

	// Other listed protocols get prompt-neutral extras, never an accidental full adapter.
	const ctx = { model: { provider: "opencode-go", api: "anthropic-messages", id: "claude-sonnet" } } as never;
	const extras = resolveCodexRuntimePlan(ctx, config);
	assert.deepEqual({ kind: extras.kind, prompt: extras.prompt, tools: extras.toolNames }, { kind: "extras", prompt: undefined, tools: ["apply_patch"] });
	assert.equal(resolveCodexRuntimePlan(ctx, { ...config, tools: { ...config.tools, applyPatchOnly: false } }).kind, "inactive");
	assert.equal(resolveCodexRuntimePlan({ model: { provider: "unlisted", api: "anthropic-messages", id: "claude-sonnet" } } as never, config).kind, "inactive");
});
