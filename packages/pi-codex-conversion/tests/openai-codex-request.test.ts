import test from "node:test";
import assert from "node:assert/strict";
import type { Provider } from "@earendil-works/pi-ai";
import { registerOpenAICodexCustomProvider } from "../src/providers/openai-codex-custom-provider.ts";

test("the session adapter switch exposes stock Codex and permits the native overlay to return", () => {
	const providers = new Map<string, Provider>();
	const registration = registerOpenAICodexCustomProvider({
		registerProvider(provider: Provider) { providers.set(provider.id, provider); },
		unregisterProvider(providerId: string) { providers.delete(providerId); },
	} as never, {});

	// Removal must follow an actual registration rather than succeed on an already empty registry.
	const original = providers.get("openai-codex");
	assert.ok(original);
	registration.applyEnabled(false);
	assert.equal(providers.has("openai-codex"), false);

	// The same controller must restore the same provider after a session-local toggle.
	registration.applyEnabled(true);
	assert.equal(providers.get("openai-codex"), original);
	registration.shutdown();
	assert.equal(providers.has("openai-codex"), false);
});
