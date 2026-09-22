import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	createEventBus,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { registerApplyPatchDisplay } from "../src/apply-patch-display.ts";
import { registerApplyPatchDisplayBroker } from "../src/tools/apply-patch/display-broker.ts";
import {
	clearApplyPatchRenderState,
	createApplyPatchTool,
} from "../src/tools/apply-patch/tool.ts";

function displayExtensionApi(bus = createEventBus()) {
	const handlers = new Map<string, Array<(event: never) => unknown>>();
	const entries: Array<{ customType: string; data: unknown }> = [];
	const pi = {
		events: { emit: bus.emit, on: bus.on },
		registerEntryRenderer() {},
		on(event: string, handler: (event: never) => unknown) {
			const eventHandlers = handlers.get(event) ?? [];
			eventHandlers.push(handler);
			handlers.set(event, eventHandlers);
		},
		appendEntry(customType: string, data: unknown) {
			entries.push({ customType, data });
		},
	} as unknown as ExtensionAPI;
	return {
		pi,
		entries,
		emit(event: string, value: unknown = {}) {
			return (handlers.get(event) ?? []).map((handler) =>
				handler(value as never),
			);
		},
	};
}

test("apply_patch preserves display routing and rejects duplicate resolved sources before mutation", async () => {
	const bus = createEventBus();
	const consumer = displayExtensionApi(bus);
	const registration = registerApplyPatchDisplay(consumer.pi, {
		customType: "test-apply-patch-display",
		render: (() => undefined) as never,
	});
	const conversion = displayExtensionApi(bus);
	registerApplyPatchDisplayBroker(conversion.pi);
	assert.equal(registration.available, true);
	conversion.emit("tool_result", {
		toolName: "apply_patch",
		toolCallId: "direct-1",
		input: { input: "*** Begin Patch\n*** End Patch" },
		content: [{ type: "text", text: "Applied direct" }],
		isError: false,
	});
	assert.deepEqual(conversion.entries, []);
	conversion.emit("turn_end");
	assert.deepEqual(conversion.entries, [
		{
			customType: "test-apply-patch-display",
			data: {
				toolCallId: "direct-1",
				input: "*** Begin Patch\n*** End Patch",
				content: "Applied direct",
				isError: false,
				source: "direct",
			},
		},
	]);
	registration.dispose();

	const cwd = await mkdtemp(join(tmpdir(), "pi-apply-patch-duplicate-"));
	const path = join(cwd, "duplicate.txt");
	const original = "top\nmiddle\nbottom\n";
	await writeFile(path, original);
	const tool = createApplyPatchTool();
	const duplicateAlias =
		process.platform === "win32" ? "./DUPLICATE.txt" : "./duplicate.txt";

	try {
		const duplicatePatch = `*** Begin Patch
*** Update File: duplicate.txt
@@
-top
+first update
*** Update File: ${duplicateAlias}
@@
-top
+second update
  *** End Patch`;
		await assert.rejects(
			tool.execute(
				"duplicate",
				{ input: duplicatePatch },
				undefined,
				undefined,
				{ cwd } as never,
			),
			(error: unknown) => {
				assert.match(
					error instanceof Error ? error.message : String(error),
					/multiple file sections resolve to .*duplicate\.txt.*multiple @@ hunks/i,
				);
				return true;
			},
		);
		assert.equal(await readFile(path, "utf8"), original);

		const multipleHunksPatch = `*** Begin Patch
*** Update File: duplicate.txt
@@
-top
+updated top
@@
-bottom
+updated bottom
*** End Patch`;
		const result = await tool.execute(
			"multiple-hunks",
			{ input: multipleHunksPatch },
			undefined,
			undefined,
			{ cwd } as never,
		);
		assert.equal(result.details.status, "success");
		assert.equal(
			await readFile(path, "utf8"),
			"updated top\nmiddle\nupdated bottom\n",
		);

		const partialPath = join(cwd, "partial.txt");
		const failingPath = join(cwd, "failing.txt");
		await writeFile(partialPath, "replace me\n");
		await writeFile(failingPath, "actual contents\n");
		const partialPatch = `*** Begin Patch
*** Update File: partial.txt
@@
-replace me
+line-01
+line-02
+line-03
+line-04
+line-05
+line-06
+line-07
+line-08
+line-09
+line-10
+line-11
+line-12-tail
*** Update File: failing.txt
@@
-missing contents
+replacement-tail
*** End Patch`;
		const partialResult = await tool.execute(
			"partial-render",
			{ input: partialPatch },
			undefined,
			undefined,
			{ cwd } as never,
		);
		assert.equal(partialResult.details.status, "partial_failure");
		const modelError = partialResult.content
			.filter((item) => item.type === "text")
			.map((item) => item.text)
			.join("\n");
		const theme = {
			fg: (_role: string, text: string) => text,
			bold: (text: string) => text,
		};

		// The custom result renderer must repeat the same failure text the model receives.
		const renderedResult = tool.renderResult?.(
			partialResult,
			{ expanded: false, isPartial: false },
			theme as never,
			{ isError: true, toolCallId: "partial-render" } as never,
		);
		assert.equal(
			renderedResult?.render(1_000).map((line) => line.trimEnd()).join("\n"),
			modelError,
		);

		// A collapsed failed call must retain every patch line instead of its normal ten-line preview.
		const renderedCall = tool.renderCall?.(
			{ input: partialPatch },
			theme as never,
			{
				argsComplete: true,
				cwd,
				executionStarted: true,
				expanded: false,
				toolCallId: "partial-render",
			} as never,
		);
		const collapsedFailure = renderedCall?.render(1_000).join("\n") ?? "";
		assert.match(collapsedFailure, /line-12-tail/);
		assert.match(collapsedFailure, /replacement-tail/);
		assert.doesNotMatch(collapsedFailure, /more lines/);

		// Resumed and pre-execution failures have only Pi's persisted error bit, not the process-local cache.
		clearApplyPatchRenderState();
		const restoredFailure = tool.renderCall?.(
			{ input: partialPatch },
			theme as never,
			{
				argsComplete: true,
				cwd,
				executionStarted: true,
				expanded: false,
				isError: true,
				toolCallId: "partial-render",
			} as never,
		)?.render(1_000).join("\n") ?? "";
		assert.match(restoredFailure, /line-12-tail/);
		assert.match(restoredFailure, /replacement-tail/);
		assert.doesNotMatch(restoredFailure, /more lines/);
	} finally {
		await rm(cwd, { recursive: true, force: true });
		conversion.emit("session_shutdown");
	}
});
