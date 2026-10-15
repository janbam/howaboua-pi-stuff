import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCodexConversionConfig } from "../src/adapter/activation/config.ts";

test("normalization preserves the default-on prompt appendix and mixed provider scope", () => {
	assert.equal(normalizeCodexConversionConfig({}).prompt.appendSystemPromptFile, true);
	assert.equal(normalizeCodexConversionConfig({ prompt: { appendSystemPromptFile: false } }).prompt.appendSystemPromptFile, false);
	assert.equal(normalizeCodexConversionConfig({ scope: { allProviders: "codex-plus-extras" } }).scope.allProviders, "codex-plus-extras");
});
