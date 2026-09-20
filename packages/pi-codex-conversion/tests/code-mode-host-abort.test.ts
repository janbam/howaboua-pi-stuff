import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setImmediate as yieldImmediate } from "node:timers";
import test from "node:test";
import { prepareCodeModeHost } from "../src/extension/events.ts";
import type { CodeModeRegistration } from "../src/tools/code-mode/tools.ts";
import { installCodeModeHost } from "../src/tools/code-mode/install-host.ts";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

function flush(): Promise<void> {
	return new Promise((resolve) => yieldImmediate(resolve));
}

function notifyContext(seen: Array<{ message: string; kind: string }>): ExtensionContext {
	return {
		ui: {
			notify: (message: string, kind: string) => {
				seen.push({ message, kind });
			},
		},
	} as unknown as ExtensionContext;
}

function registrationFor(failure: unknown): CodeModeRegistration {
	return {
		prepare: () => Promise.reject(failure),
		refreshPromptTools: (prompt: string) => prompt,
		checkpointNotebook: () => Promise.resolve(),
		shutdownHost: () => Promise.resolve(),
		shutdown: () => Promise.resolve(),
	};
}

test("prepareCodeModeHost stays silent when a stale host download is aborted", async () => {
	// A mode switch aborts the previous host startup; the wrapped AbortError
	// must not surface as a "Code Mode host setup failed" notification.
	const abort = new DOMException("This operation was aborted", "AbortError");
	const wrapped = new Error(`failed to download https://example.invalid/host.tar.gz: ${abort.message}`, {
		cause: abort,
	});
	const seen: Array<{ message: string; kind: string }> = [];
	prepareCodeModeHost(registrationFor(wrapped), notifyContext(seen));
	await flush();
	await flush();
	assert.equal(seen.length, 0);
});

test("prepareCodeModeHost still reports genuine host setup failures", async () => {
	const seen: Array<{ message: string; kind: string }> = [];
	prepareCodeModeHost(registrationFor(new Error("boom")), notifyContext(seen));
	await flush();
	await flush();
	assert.equal(seen.length, 1);
	assert.match(seen[0]!.message, /Code Mode host setup failed: boom/);
});

test("installCodeModeHost rethrows download aborts without wrapping", async () => {
	// Aborts the download mid-flight so the installer must preserve the abort
	// identity instead of wrapping it as a download failure.
	const controller = new AbortController();
	const abort = new DOMException("This operation was aborted", "AbortError");
	const originalFetch = globalThis.fetch;
	(globalThis as { fetch: typeof fetch }).fetch = (async () => {
		controller.abort();
		throw abort;
	}) as typeof fetch;
	const scratch = mkdtempSync(join(tmpdir(), "pi-codex-host-abort-"));
	try {
		const destination = join(scratch, "codex-code-mode-host");
		await assert.rejects(
			installCodeModeHost({
				destination,
				platform: "linux",
				arch: "x64",
				signal: controller.signal,
			}),
			(error: unknown) => error === abort,
		);
	} finally {
		globalThis.fetch = originalFetch;
		rmSync(scratch, { recursive: true, force: true });
	}
});
