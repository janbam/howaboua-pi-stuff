# @howaboua/pi-vent

Adds an agent-callable `vent` tool for recording repeated or systemic workflow friction in a project-specific log under `~/.pi/agent/vent/`.

Use it for recurring tool failures, repeated manual workarounds, noisy output that forces the same retries, or instructions that repeatedly cause backtracking. Ordinary lint errors, one-off mistakes, and routine debugging do not belong there.

Entries are batched near the end of an agent turn to avoid constant tool chatter.

Each project writes to `~/.pi/agent/vent/<SANITIZED_PROJECT_PATH>/VENT.md`. The project path uses the same encoding as Pi's session directory: path separators and colons become hyphens, and the result is wrapped in `--`.

When the extension first opens a project that still has a repo-local `VENT.md`, it moves that file to the central location. If a central log already exists, the legacy file is appended so neither history is lost. Run only one Pi process in a project during this one-time migration.

## Install

```bash
pi install npm:@howaboua/pi-vent
```

Project-only install:

```bash
pi install -l npm:@howaboua/pi-vent
```

## Tool

```ts
vent({
  thought: string,
  trigger?: string
})
```

- `thought` describes the failure, repeated workaround, and useful preventative fix.
- `trigger` is an optional short label such as `tool_error`, `bad_docs`, or `confusing_task`.

The extension creates the project's central `VENT.md` when needed and appends each note under a local timestamp:

```md
## 26-04-29 10:42 — tool_error

Symptom: a hook failed twice for the same generated artifact. Repeated workaround: deleted the artifact and reran the same command sequence. Suggested fix: add cleanup to the hook or document the generated-file lifecycle.
```
