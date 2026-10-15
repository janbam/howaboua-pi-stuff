import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { clearApplyPatchRenderState, createApplyPatchTool } from "../src/tools/apply-patch/tool.ts";

test("failed apply_patch renders the model error and full patch even after session resume", async () => {
	const cwd = await mkdtemp(join(tmpdir(), "pi-apply-patch-failure-"));
	const tool = createApplyPatchTool();
	try {
		// Apply the first file before rejecting the second, leaving a real partial failure to render.
		await writeFile(join(cwd, "partial.txt"), "replace me\n");
		await writeFile(join(cwd, "failing.txt"), "actual contents\n");
		const patch = `*** Begin Patch
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
		const result = await tool.execute("partial-render", { input: patch }, undefined, undefined, { cwd } as never);
		assert.equal(result.details.status, "partial_failure");
		assert.match(await readFile(join(cwd, "partial.txt"), "utf8"), /line-12-tail/);
		assert.equal(await readFile(join(cwd, "failing.txt"), "utf8"), "actual contents\n");
		const modelError = result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
		const theme = { fg: (_role: string, text: string) => text, bold: (text: string) => text };

		// The custom result slot must repeat the exact failure text sent to the model.
		assert.equal(tool.renderResult?.(
			result,
			{ expanded: false, isPartial: false },
			theme as never,
			{ isError: true, toolCallId: "partial-render" } as never,
		)?.render(1_000).map((line) => line.trimEnd()).join("\n"), modelError);

		for (const resumed of [false, true]) {
			// Resume loses the process-local cache, so Pi's persisted error bit must retain the full patch.
			if (resumed) clearApplyPatchRenderState();
			const rendered = tool.renderCall?.(
				{ input: patch },
				theme as never,
				{ argsComplete: true, cwd, executionStarted: true, expanded: false, isError: resumed, toolCallId: "partial-render" } as never,
			)?.render(1_000).join("\n") ?? "";
			for (const line of ["replace me", ...Array.from({ length: 11 }, (_, index) => `line-${String(index + 1).padStart(2, "0")}`), "line-12-tail", "missing contents", "replacement-tail"]) {
				assert.ok(rendered.includes(line), `missing ${line} in ${resumed ? "resumed" : "live"} failure`);
			}
			assert.doesNotMatch(rendered, /more lines/);
		}
	} finally {
		clearApplyPatchRenderState();
		await rm(cwd, { recursive: true, force: true });
	}
});
