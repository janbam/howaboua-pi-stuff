import { defineTool } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import type { Static } from "typebox";
import { Type } from "typebox";
import {
	defaultSessionSkillsDir,
	defaultSkillsDir,
	type LoadedSkill,
	runSkills,
} from "./catalog.js";

const SkillsParameters = Type.Object(
	{
		command: Type.String({
			description: "list [category...] | read <skill> [skill-or-reference...]",
		}),
	},
	{ additionalProperties: false },
);

type SkillsParameters = Static<typeof SkillsParameters>;

export interface SkillsToolOptions {
	globalRoot?: string;
	getLoadedSkills?(): readonly LoadedSkill[];
}

export function prepareSkillsCodeModeInput(input: unknown): SkillsParameters {
	if (typeof input !== "string")
		throw new Error("skills expects a string command");
	return { command: input };
}

export function createSkillsTool(options: SkillsToolOptions = {}) {
	return defineTool({
		name: "skills",
		label: "Skills",
		description: "Load skill instructions and references",
		promptGuidelines: [
			"skills: List once at session start; read always-applicable and task-relevant skills before work",
		],
		parameters: SkillsParameters,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const output = runSkills(
				params.command,
				options.globalRoot ?? defaultSkillsDir(),
				defaultSessionSkillsDir(ctx.cwd),
				options.getLoadedSkills?.() ?? [],
			);
			return {
				content: [{ type: "text", text: output }],
				details: {},
			};
		},
		// Show the full command untruncated; Pi's fallback renders only the tool name.
		// Args may still be streaming, so tolerate a missing command.
		renderCall(args, theme) {
			const command = typeof args?.command === "string" ? args.command : "";
			return new Text(
				`${theme.fg("toolTitle", theme.bold("skills"))} ${theme.fg("accent", command)}`,
				0,
				0,
			);
		},
	});
}
