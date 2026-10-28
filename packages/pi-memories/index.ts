import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type {
	Api,
	Model,
	ModelThinkingLevel,
	UserMessage,
} from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
	SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import registerPackageChangelog from "./changelog.js";

const THINKING_LEVELS = new Set<ModelThinkingLevel>([
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
]);

const DEFAULT_OUTPUT_TOKENS = 4096;
const CONTEXT_MARGIN_TOKENS = 2048;

type Config = {
	enabled: boolean;
	/** Provider/model reference. Empty means the model active in the closing session. */
	model: string;
	thinking: ModelThinkingLevel;
	inboxPath: string;
	/** Failures go here instead of polluting the candidate inbox. */
	logPath: string;
	/** Replaces the built-in distillation prompt. */
	prompt?: string;
	timeoutMs: number;
	/** Sessions without a compaction summary are skipped below this user-message count. */
	minUserMessagesWithoutBlob: number;
};

type CompactionEntry = Extract<SessionEntry, { type: "compaction" }>;

const DEFAULT_PROMPT = `You distill a finished Pi session into durable memory candidates for manual review.

Find 3-5 candidates if they genuinely exist. Prefer fewer strong memories over filling the quota.

Good candidates:
- stable user preferences
- communication style
- durable workflow preferences
- recurring project conventions
- decisions likely to matter later
- things that belong in global or project AGENTS.md

Reject:
- temporary task progress
- implementation minutiae
- one-off facts
- obvious summaries
- secrets or credentials
- anything already clearly covered by the supplied context

Output Markdown only. Do not ask questions, explain your process, or describe the transcript. If nothing is worth remembering, output exactly: No durable memories.

Format:
### Global candidates
- ...

### Project candidates
- ...

### Why these matter
- ...`;

/** Resolves Pi's agent configuration directory, respecting `PI_CODING_AGENT_DIR`. */
function configPath(): string {
	return join(getAgentDir(), "pi-memories.json");
}

function defaultConfig(): Config {
	const agentDir = getAgentDir();
	return {
		enabled: true,
		model: "",
		thinking: "low",
		inboxPath: join(agentDir, "memory-inbox.md"),
		logPath: join(agentDir, "pi-memories.log"),
		timeoutMs: 120_000,
		minUserMessagesWithoutBlob: 3,
	};
}

/** Normalises a configured thinking level, falling back to `low` for unknown values. */
export function normalizeThinkingLevel(
	value: unknown,
	fallback: ModelThinkingLevel = "low",
): ModelThinkingLevel {
	return typeof value === "string" &&
		THINKING_LEVELS.has(value as ModelThinkingLevel)
		? (value as ModelThinkingLevel)
		: fallback;
}

/** Distillation runs only for a real quit, never for reloads or session replacement. */
export function shouldDistillOnShutdown(reason: string): boolean {
	return reason === "quit";
}

function nonEmptyString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? value
		: fallback;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: fallback;
}

function writeDefaultConfig(path: string, config: Config): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

/** Reads config once per operation; missing or malformed files fall back to defaults. */
function loadConfig(): Config {
	const base = defaultConfig();
	const path = configPath();
	if (!existsSync(path)) {
		writeDefaultConfig(path, base);
		return base;
	}
	try {
		const raw = JSON.parse(readFileSync(path, "utf8")) as Record<
			string,
			unknown
		>;
		const prompt =
			typeof raw["prompt"] === "string" && raw["prompt"].trim()
				? raw["prompt"]
				: undefined;
		return {
			enabled:
				typeof raw["enabled"] === "boolean" ? raw["enabled"] : base.enabled,
			model: nonEmptyString(raw["model"], base.model),
			thinking: normalizeThinkingLevel(raw["thinking"], base.thinking),
			inboxPath: nonEmptyString(raw["inboxPath"], base.inboxPath),
			logPath: nonEmptyString(raw["logPath"], base.logPath),
			timeoutMs: positiveNumber(raw["timeoutMs"], base.timeoutMs),
			minUserMessagesWithoutBlob: nonNegativeInteger(
				raw["minUserMessagesWithoutBlob"],
				base.minUserMessagesWithoutBlob,
			),
			...(prompt ? { prompt } : {}),
		};
	} catch {
		return base;
	}
}

/** Extracts plain text from string or content-part message payloads. */
function extractText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const part of content) {
		if (
			part &&
			typeof part === "object" &&
			"type" in part &&
			part.type === "text" &&
			"text" in part &&
			typeof part.text === "string"
		) {
			parts.push(part.text);
		}
	}
	return parts.join("\n");
}

/** Serialises conversational entries only; tool traffic is noise for memory extraction. */
function serializeMessages(entries: readonly SessionEntry[]): string {
	const chunks: string[] = [];
	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const message = entry.message as { role?: unknown; content?: unknown };
		if (typeof message.role !== "string" || message.role === "toolResult")
			continue;
		const text = extractText(message.content).trim();
		if (text) chunks.push(`[${message.role}]\n${text}`);
	}
	return chunks.join("\n\n");
}

function countUserMessages(entries: readonly SessionEntry[]): number {
	let count = 0;
	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const message = entry.message as { role?: unknown };
		if (message.role === "user") count++;
	}
	return count;
}

function findLatestCompaction(
	branch: readonly SessionEntry[],
): { entry: CompactionEntry; index: number } | undefined {
	for (let index = branch.length - 1; index >= 0; index--) {
		const entry = branch[index];
		if (entry?.type === "compaction") return { entry, index };
	}
	return undefined;
}

/**
 * Builds the material handed to the distiller: the newest compaction summary plus
 * everything after it, or the recent branch when no compaction exists. Returns
 * `undefined` when the session is too thin to justify a model call.
 */
function buildSessionContext(
	branch: readonly SessionEntry[],
	config: Config,
): string | undefined {
	const latest = findLatestCompaction(branch);
	if (!latest && countUserMessages(branch) < config.minUserMessagesWithoutBlob)
		return undefined;

	const tailEntries = latest
		? branch.slice(latest.index + 1)
		: (branch as readonly SessionEntry[]);
	const summary = latest?.entry.summary.trim() ?? "";
	const tail = serializeMessages(tailEntries);
	if (!summary && !tail) return undefined;

	return [
		summary
			? `<previous-compaction-summary>\n${summary}\n</previous-compaction-summary>`
			: "",
		tail ? `<recent-conversation>\n${tail}\n</recent-conversation>` : "",
	]
		.filter(Boolean)
		.join("\n\n");
}

/** Keeps the request inside the model window, dropping the oldest context first. */
function fitContext(text: string, model: Model<Api>): string {
	const outputTokens = Math.min(
		DEFAULT_OUTPUT_TOKENS,
		model.maxTokens > 0 ? model.maxTokens : DEFAULT_OUTPUT_TOKENS,
	);
	const contextWindow = model.contextWindow > 0 ? model.contextWindow : 32_768;
	const budgetTokens = Math.max(
		4096,
		contextWindow - outputTokens - CONTEXT_MARGIN_TOKENS,
	);
	const maxChars = budgetTokens * 4;
	if (text.length <= maxChars) return text;
	return `[earlier context omitted]\n${text.slice(-maxChars)}`;
}

/** Resolves the configured model, or the closing session's model when unset. */
function resolveModel(ctx: ExtensionContext, config: Config): Model<Api> {
	const reference = config.model.trim();
	if (!reference) {
		if (!ctx.model)
			throw new Error(
				`No model is active. Set "model": "provider/modelId" in ${configPath()}.`,
			);
		return ctx.model;
	}

	const slash = reference.indexOf("/");
	if (slash > 0 && slash < reference.length - 1) {
		const provider = reference.slice(0, slash);
		const modelId = reference.slice(slash + 1);
		const found = ctx.modelRegistry.find(provider, modelId);
		if (found) return found;
		throw new Error(
			`Model "${reference}" is not configured in Pi. Choose an available provider/model in ${configPath()}.`,
		);
	}

	const matches = ctx.modelRegistry
		.getAvailable()
		.filter((model) => model.id === reference);
	if (matches.length === 1 && matches[0]) return matches[0];
	if (matches.length > 1)
		throw new Error(
			`Model "${reference}" is ambiguous. Use "provider/${reference}" in ${configPath()}.`,
		);
	throw new Error(
		`Model "${reference}" is not configured in Pi. Choose an available provider/model in ${configPath()}.`,
	);
}

/** Strips a Markdown fence that wraps the whole candidate block. */
function normalizeCandidates(text: string): string {
	const trimmed = text.trim();
	const fenced = /^```(?:markdown|md)?\n([\s\S]*?)\n```$/.exec(trimmed);
	return (fenced?.[1] ?? trimmed).trim();
}

function appendInbox(config: Config, cwd: string, content: string): void {
	const trimmed = content.trim();
	if (!trimmed || trimmed === "No durable memories.") return;
	mkdirSync(dirname(config.inboxPath), { recursive: true });
	appendFileSync(
		config.inboxPath,
		`\n## ${new Date().toISOString()} — shutdown candidates\n\n` +
			`cwd: \`${cwd}\`\n\n${trimmed}\n`,
		"utf8",
	);
}

/** Writes a timestamped failure line; logging must never break shutdown. */
function appendLog(config: Config, message: string): void {
	try {
		mkdirSync(dirname(config.logPath), { recursive: true });
		appendFileSync(
			config.logPath,
			`[${new Date().toISOString()}] ${message.replaceAll("\n", " ")}\n`,
			"utf8",
		);
	} catch {
		// A failed log write must not mask the original distillation failure.
	}
}

/**
 * Runs one tool-free model request against the closing session context.
 * The system prompt carries the contract, so no provider-payload rewriting is
 * involved and the model cannot mistake the request for a conversational turn.
 */
async function distill(args: {
	ctx: ExtensionContext;
	config: Config;
	model: Model<Api>;
	contextText: string;
}): Promise<string> {
	const message: UserMessage = {
		role: "user",
		content: `<session-context>\n${args.contextText}\n</session-context>`,
		timestamp: Date.now(),
	};
	const response = await args.ctx.modelRegistry
		.streamSimple(
			args.model,
			{
				systemPrompt: args.config.prompt?.trim() || DEFAULT_PROMPT,
				messages: [message],
			},
			{
				maxTokens: Math.min(
					DEFAULT_OUTPUT_TOKENS,
					args.model.maxTokens > 0
						? args.model.maxTokens
						: DEFAULT_OUTPUT_TOKENS,
				),
				...(args.config.thinking === "off"
					? {}
					: { reasoning: args.config.thinking }),
				signal: AbortSignal.timeout(args.config.timeoutMs),
				cacheRetention: "none",
			},
		)
		.result();

	if (response.stopReason !== "stop")
		throw new Error(
			response.errorMessage ||
				`Memory model stopped without a result (${response.stopReason}).`,
		);
	if (response.content.some((part) => part.type === "toolCall"))
		throw new Error(
			"Memory model requested a tool instead of returning candidates.",
		);

	return normalizeCandidates(
		response.content
			.filter((part) => part.type === "text")
			.map((part) => part.text)
			.join("\n"),
	);
}

export default function piMemories(pi: ExtensionAPI): void {
	registerPackageChangelog(pi);
	loadConfig();

	pi.on("session_shutdown", async (event, ctx) => {
		if (!shouldDistillOnShutdown(event.reason)) return;
		const config = loadConfig();
		if (!config.enabled) return;

		const contextText = buildSessionContext(
			ctx.sessionManager.getBranch(),
			config,
		);
		if (!contextText) return;

		// Capture UI facts before awaiting so no extension context is touched after
		// the shutdown handler yields to the runtime.
		const cwd = ctx.cwd;
		const hasUI = ctx.hasUI;
		try {
			const model = resolveModel(ctx, config);
			const candidates = await distill({
				ctx,
				config,
				model,
				contextText: fitContext(contextText, model),
			});
			appendInbox(config, cwd, candidates);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			appendLog(config, message);
			if (hasUI)
				ctx.ui.notify(
					`Memory distillation failed: ${message} See ${config.logPath}.`,
					"warning",
				);
		}
	});

	pi.registerCommand("memory-review", {
		description: "Review memory-inbox.md and decide what belongs in AGENTS.md",
		handler: async (_args, ctx) => {
			const config = loadConfig();
			ctx.ui.setEditorText(
				`Review ${config.inboxPath} and decide whether any candidates should be promoted into global or project AGENTS.md.

Treat the inbox as candidates, not truth. Promote only durable memories useful over coming days, weeks, or months. Prefer user preferences, communication style, durable workflow habits, identity, and project conventions. Discard temporary task progress, implementation minutiae, duplicate notes, obvious summaries, secrets, credentials, tokens, and sensitive personal data. Merge new memories into existing bullets instead of accumulating near-duplicates. Keep promoted memories short, concrete, and easy to delete later. When done, leave the inbox file empty. Do not leave review logs, comments, markers, or commentary in memory-inbox.md.`,
			);
		},
	});
}
