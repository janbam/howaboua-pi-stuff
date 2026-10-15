import test from "node:test";
import assert from "node:assert/strict";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_CODEX_CONVERSION_CONFIG } from "../src/adapter/activation/config.ts";
import { registerCodeModeProxyProvider } from "../src/providers/code-mode-proxy-provider.ts";

test("session adapter toggles remove and re-register the proxy overlay without changing config", () => {
	const providers = new Map<string, Parameters<ExtensionAPI["registerProvider"]>[1]>();
	let adapterEnabled = true;
	const config = {
		...structuredClone(DEFAULT_CODEX_CONVERSION_CONFIG),
		executionMode: "code" as const,
		openai: { ...DEFAULT_CODEX_CONVERSION_CONFIG.openai, proxyResponsesLite: true },
		scope: { allProviders: "off" as const, additionalProviders: ["proxy"] },
	};
	const registration = registerCodeModeProxyProvider({
		registerProvider(name: string, provider: Parameters<ExtensionAPI["registerProvider"]>[1]) {
			providers.set(name, provider);
		},
		unregisterProvider(name: string) { providers.delete(name); },
	} as never, () => config, () => undefined, () => undefined, undefined, () => adapterEnabled);
	const registry = {
		getAll: () => [{ provider: "proxy", api: "openai-responses", id: "gpt-5.6" }] as never,
		getProvider: () => ({ streamSimple() { throw new Error("Lifecycle test must not stream"); } }) as never,
		getRegisteredProviderConfig: (name: string) => providers.get(name) as never,
	};

	// Prove an active overlay exists before testing that the session switch removes it.
	registration.applyConfig(config, registry);
	assert.equal(providers.size, 1);
	assert.equal(typeof providers.get("proxy")?.streamSimple, "function");
	adapterEnabled = false;
	registration.applyConfig(config, registry);
	assert.equal(providers.size, 0);

	// Reuse the same configuration and registration after re-enabling the session adapter.
	adapterEnabled = true;
	registration.applyConfig(config, registry);
	assert.equal(providers.size, 1);
	assert.equal(typeof providers.get("proxy")?.streamSimple, "function");
	registration.shutdown();
	assert.equal(providers.size, 0);
});
