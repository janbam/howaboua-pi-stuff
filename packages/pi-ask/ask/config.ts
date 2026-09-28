import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

/** User settings from `pi-ask.json` in Pi's agent directory. */
interface AskConfig {
	grill: boolean;
	fold: boolean;
	/** Executable run with the first prompt title whenever an ask panel appears; `~/` expands to home. */
	notifyScript?: string;
}

const DEFAULT_CONFIG: AskConfig = {
	grill: true,
	fold: true,
};

function askConfigPath(): string {
	return join(getAgentDir(), "pi-ask.json");
}

/** Reads pi-ask settings, creating the default file on first load; malformed files fall back to defaults. */
export function loadAskConfig(path = askConfigPath()): AskConfig {
	// Carry settings over from the pre-rename `ask.json` instead of silently resetting them.
	const legacyPath = join(dirname(path), "ask.json");
	if (!existsSync(path) && existsSync(legacyPath)) {
		try {
			renameSync(legacyPath, path);
		} catch {
			// Unmovable legacy file: fall through to defaults like any unreadable config.
		}
	}

	if (!existsSync(path)) {
		try {
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(
				path,
				`${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`,
				"utf8",
			);
		} catch {
			// A read-only agent directory must not disable default prompt resources.
		}
		return { ...DEFAULT_CONFIG };
	}

	try {
		const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<AskConfig>;
		return {
			grill: typeof raw.grill === "boolean" ? raw.grill : DEFAULT_CONFIG.grill,
			fold: typeof raw.fold === "boolean" ? raw.fold : DEFAULT_CONFIG.fold,
			...(typeof raw.notifyScript === "string" && raw.notifyScript
				? { notifyScript: raw.notifyScript }
				: {}),
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}
