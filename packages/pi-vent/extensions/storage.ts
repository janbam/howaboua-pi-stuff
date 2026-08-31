import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
	appendFile,
	copyFile,
	mkdir,
	readdir,
	readFile,
	rename,
	unlink,
	writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** Initial content for a newly created project vent log. */
export const VENT_HEADING =
	"# VENT\n\nFeedback log. Repeated/systemic workflow friction that should become future automation, docs, or workflow fixes.\n\n";

/** Prefix for hidden files that hold atomically claimed legacy logs. */
const MIGRATION_FILE_PREFIX = ".VENT.md.pi-vent-migration-";

/** Match only extension-owned migration claims with canonical UUID names. */
const MIGRATION_FILE_PATTERN =
	/^\.VENT\.md\.pi-vent-migration-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Return whether an unknown filesystem error has the requested Node error code. */
function hasErrorCode(error: unknown, code: string): boolean {
	return (error as NodeJS.ErrnoException).code === code;
}

/** Separate complete Markdown blocks without altering their existing content. */
function markdownSeparator(existing: string): string {
	if (!existing || existing.endsWith("\n\n")) return "";
	return existing.endsWith("\n") ? "\n" : "\n\n";
}

/** Resolve a project's central vent log using Pi's session-directory path encoding. */
export function getProjectVentPath(
	cwd: string,
	agentDir: string = join(homedir(), ".pi", "agent"),
): string {
	const resolvedCwd = resolve(cwd);
	const safePath = `--${resolvedCwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
	return join(resolve(agentDir), "vent", safePath, "VENT.md");
}

/** Claim the active legacy log and return it alongside interrupted migration files. */
async function claimRepoLocalVentFiles(cwd: string): Promise<string[]> {
	const resolvedCwd = resolve(cwd);
	const claimPath = join(
		resolvedCwd,
		`${MIGRATION_FILE_PREFIX}${randomUUID()}`,
	);

	// Rename before reading so later path-based writers cannot mutate our snapshot.
	try {
		await rename(join(resolvedCwd, "VENT.md"), claimPath);
	} catch (error: unknown) {
		if (!hasErrorCode(error, "ENOENT")) throw error;
	}

	// Recover only regular files created by this migration protocol.
	const entries = await readdir(resolvedCwd, { withFileTypes: true });
	return entries
		.filter(
			(entry) => entry.isFile() && MIGRATION_FILE_PATTERN.test(entry.name),
		)
		.map((entry) => join(resolvedCwd, entry.name))
		.sort();
}

/** Move or append one claimed legacy log, deleting it only after persistence. */
async function migrateClaimedVent(
	claimPath: string,
	ventPath: string,
): Promise<void> {
	let existing: string | undefined;
	try {
		existing = await readFile(ventPath, "utf8");
	} catch (error: unknown) {
		if (!hasErrorCode(error, "ENOENT")) throw error;
	}

	// Preserve a true move when both paths share a filesystem and no merge is needed.
	if (existing === undefined) {
		try {
			await rename(claimPath, ventPath);
			return;
		} catch (error: unknown) {
			if (!hasErrorCode(error, "EXDEV")) throw error;
		}

		// Cross-filesystem moves copy first and remove the claim only after success.
		await copyFile(claimPath, ventPath, constants.COPYFILE_EXCL);
		await unlink(claimPath);
		return;
	}

	const localContent = await readFile(claimPath, "utf8");

	// Append the complete legacy file before removing its claimed source.
	if (localContent) {
		await appendFile(
			ventPath,
			`${markdownSeparator(existing)}${localContent}`,
			"utf8",
		);
	}
	await unlink(claimPath);
}

/** Move repo-local VENT.md files into central storage for one active Pi process. */
export async function migrateRepoLocalVent(
	cwd: string,
	ventPath: string = getProjectVentPath(cwd),
): Promise<void> {
	const claimPaths = await claimRepoLocalVentFiles(cwd);
	if (claimPaths.length === 0) return;

	await mkdir(dirname(ventPath), { recursive: true });

	// Preserve every claimed generation in deterministic discovery order.
	for (const claimPath of claimPaths) {
		await migrateClaimedVent(claimPath, ventPath);
	}
}

/** Migrate legacy content and ensure the central project vent log exists. */
export async function prepareProjectVentLog(
	cwd: string,
	ventPath: string = getProjectVentPath(cwd),
): Promise<void> {
	await migrateRepoLocalVent(cwd, ventPath);
	await mkdir(dirname(ventPath), { recursive: true });

	// Create the heading only when migration did not already provide a log.
	try {
		await writeFile(ventPath, VENT_HEADING, { encoding: "utf8", flag: "wx" });
	} catch (error: unknown) {
		if (!hasErrorCode(error, "EEXIST")) throw error;
	}
}

/** Append one entry to the central log with a valid Markdown boundary. */
export async function appendProjectVentEntry(
	cwd: string,
	entry: string,
	ventPath: string = getProjectVentPath(cwd),
): Promise<void> {
	await prepareProjectVentLog(cwd, ventPath);
	const existing = await readFile(ventPath, "utf8");
	await appendFile(ventPath, `${markdownSeparator(existing)}${entry}`, "utf8");
}
