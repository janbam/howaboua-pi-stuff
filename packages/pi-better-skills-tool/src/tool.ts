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
		command: Type.Optional(Type.String({ description: "help, list or read" })),
	},
	{ additionalProperties: false },
);

type SkillsParameters = Static<typeof SkillsParameters>;

export interface SkillsToolOptions {
	isGpt?(): boolean;
	globalRoot?: string;
	getLoadedSkills?(): readonly LoadedSkill[];
}

export function prepareSkillsCodeModeInput(input: unknown): SkillsParameters {
	if (input === undefined) return {};
	if (typeof input !== "string")
		throw new Error(
			'Expected a string command or no arguments: tools.skills() for discovery, tools.skills("read <skill>") to read',
		);
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
			const { output, skillReads } = runSkills(
				params.command ?? "",
				options.globalRoot ?? defaultSkillsDir(),
				defaultSessionSkillsDir(ctx.cwd),
				options.getLoadedSkills?.() ?? [],
				options.isGpt?.() ?? false,
			);
			return {
				content: [{ type: "text", text: output }],
				details: { skillReads },
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
