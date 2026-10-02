import {
	type ExtensionAPI,
	withFileMutationQueue,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import registerPackageChangelog from "../changelog.js";
import {
	appendProjectVentEntry,
	getProjectVentPath,
	migrateRepoLocalVent,
} from "./storage.js";

/** Model-facing input contract for one workflow-friction entry. */
const ventSchema = Type.Object(
	{
		thought: Type.String(),
		trigger: Type.Optional(Type.String({ description: "Short trigger label" })),
	},
	{ additionalProperties: false },
);

/** Normalize user-provided entry text for Markdown storage. */
function clean(input: string): string {
	return input.trim().replace(/\r\n/g, "\n");
}

/** Register centralized vent-log migration, persistence, and rendering. */
export default function ventExtension(pi: ExtensionAPI) {
	registerPackageChangelog(pi);

	pi.on("session_start", async (_event, ctx) => {
		const ventPath = getProjectVentPath(ctx.cwd);

		// Move legacy project history before the session begins producing new entries.
		await withFileMutationQueue(ventPath, () =>
			migrateRepoLocalVent(ctx.cwd, ventPath),
		);
	});

	pi.registerTool({
		name: "vent",
		label: "vent",
		description: "Append workflow-friction feedback to VENT.md",
		promptGuidelines: [
			"vent: Use for repeated or systemic workflow friction: recurring same-cause tool/hook failures, repeated workarounds/retries, or avoidable backtracking caused by instructions, docs, or tooling",
			"vent: Exclude one-off lint/type errors and ordinary coding mistakes",
			"vent: Finish the task first, then batch related feedback near turn end; include what failed, the repeated workaround, and prevention",
		],
		parameters: ventSchema,
		executionMode: "sequential",

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			// Normalize the entry before deriving any persisted or returned values.
			const thought = clean(params.thought);
			if (!thought) throw new Error("vent.thought must not be empty");

			const trigger = params.trigger ? clean(params.trigger) : undefined;
			const ventPath = getProjectVentPath(ctx.cwd);
			const now = new Date();
			const timestamp =
				[
					String(now.getFullYear()).slice(-2),
					String(now.getMonth() + 1).padStart(2, "0"),
					String(now.getDate()).padStart(2, "0"),
				].join("-") +
				" " +
				[
					String(now.getHours()).padStart(2, "0"),
					String(now.getMinutes()).padStart(2, "0"),
				].join(":");
			const entry = [
				`## ${timestamp}${trigger ? ` — ${trigger}` : ""}`,
				"",
				thought,
				"",
			].join("\n");

			return withFileMutationQueue(ventPath, async () => {
				// Retry migration here so a transient startup failure cannot split history.
				await appendProjectVentEntry(ctx.cwd, entry, ventPath);

				return {
					content: [
						{
							type: "text" as const,
							text: `Appended vent entry to VENT.md (${timestamp}).`,
						},
					],
					details: { path: ventPath, timestamp, trigger, thought },
				};
			});
		},

		renderCall(args, theme, _context) {
			const trigger =
				typeof args?.trigger === "string" && args.trigger.trim()
					? ` ${args.trigger.trim()}`
					: "";
			return new Text(
				`${theme.fg("toolTitle", theme.bold("vent"))}${theme.fg("muted", trigger)}`,
				0,
				0,
			);
		},

		renderResult(result, { expanded }, theme) {
			const details = result.details as
				| { timestamp?: unknown; thought?: unknown }
				| undefined;
			const timestamp =
				typeof details?.timestamp === "string" ? details.timestamp : "saved";
			let text = `${theme.fg("success", "✓")} wrote ${theme.fg("accent", "VENT.md")} ${theme.fg("dim", timestamp)}`;

			if (expanded && typeof details?.thought === "string") {
				text += `\n\n${details.thought}`;
			}

			return new Text(text, 0, 0);
		},
	});
}
