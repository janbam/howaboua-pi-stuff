# Fork-owned changes

Ledger of behavior carried in `janbam/howaboua-pi-stuff` that does not exist upstream (`IgorWarzocha/howaboua-pi-stuff`). Consult it when merging `upstream/main`: conflicts in the listed files must keep the fork behavior unless the entry is dropped or upstream adopted it. Remove an entry once upstream ships equivalent behavior.

- Entry = one feature: commits/PRs, behavior, files touched. Tests and changelogs are omitted; `git show --stat <commit>` has the full list.
- In-code divergences in shared files may carry `// FORK_MOD: <why>` comments; `rg FORK_MOD packages` lists them. Conflicts on those lines keep the fork side.
- Upstream status is "not proposed" unless stated.

## Repo

### Root `AGENTS.md` rules

- Commits: `f75e2b8`, `c19a43d`, `99e1ef7`, this ledger
- Behavior: fork-added agent rules: K10 host (no Bun for TypeScript), `changelog.js` generation after install/build, TypeBox pins aligned with Pi, `FORK.md` maintenance.
- Files: `AGENTS.md`

### Generated `changelog.js` handling

- Commits: `f987721`, `e340b30`
- Behavior: `changelog.js` is ignored once at the repo root instead of per package, and every package `biome.json` excludes it so local lint passes once it is generated.
- Files: `.gitignore`, `packages/pi-codex-conversion/.gitignore` (entry removed), `packages/*/biome.json`

### TypeBox pinned to Pi's version

- Commit: `99e1ef7`
- Behavior: root and pi-codex-conversion dev dependency on `typebox` match Pi's pin so schema helpers share one type identity.
- Files: `package.json`, `packages/pi-codex-conversion/package.json`, `bun.lock`

## pi-ask

### Notify script and `pi-ask.json`

- PR: #23
- Behavior: `notifyScript` in the config runs an executable with the first prompt title whenever a wait or steer ask panel appears. Config file renamed `ask.json` → `pi-ask.json`, with automatic rename of an existing `ask.json`.
- Fork-only files: `packages/pi-ask/ask/notify.ts`
- Shared files: `ask/config.ts` (rename, migration, `notifyScript`), `ask/coordinator.ts` (`onPresent` hook in `present`), `ask/tool.ts` (threads `onPresent`), `index.ts` (wires `runNotifyScript`), `README.md` (Notifications section, config file name)
- Dropping it: revert the files above; existing users then need `pi-ask.json` renamed back to `ask.json`.

## pi-vent

### Centralized vent logs

- Commit: `f75e2b8`
- Behavior: vent logs live outside project repos, isolated per project via Pi's session-path encoding. A repo-local `VENT.md` is migrated on first use (moved, or appended to existing central history).
- Fork-only files: `packages/pi-vent/extensions/storage.ts`
- Shared files: `extensions/vent.ts`, `README.md`, `package.json`
- Dropping it: logs already migrated stay in central storage; move them back manually if needed.

## pi-better-skills-tool

### Loaded skills overlay the filesystem catalog

- Commit: `96d7696` (PR #20)
- Behavior: the filesystem catalog is always scanned and Pi-loaded skills are overlaid on it (winning name collisions) instead of replacing it; a partial loaded set (e.g. under `--no-skills`) no longer hides filesystem skills. A loaded skill with `disable-model-invocation` removes that name.
- Files: `packages/pi-better-skills-tool/src/discovery.ts`

### Full command in the skills call line

- Commit: `7f94a9d` (PR #21)
- Behavior: `renderCall` prints `skills <command>` untruncated; Pi's default renderer showed only the tool name.
- Files: `packages/pi-better-skills-tool/src/tool.ts`

## pi-codex-conversion

Paths below are relative to `packages/pi-codex-conversion/`.

### Empty shortcut binding disables the shortcut

- Commit: `e132fc8` (`FORK_MOD`)
- Behavior: an empty or whitespace string for any of the eight voice or background-shell shortcut bindings disables it instead of falling back to the default. Disabled bindings are not registered, and the widget footer lists only enabled ones.
- Files: `src/adapter/activation/config-{migration,normalize,values}.ts`, `src/extension/ui.ts`, `src/ui/background-bash-widget.ts`, `src/voice/{setup,shortcuts}.ts`

### Compact status line with 5h usage, 1-minute usage cache

- Commits: `407c820`, `5edc924` (`FORK_MOD`)
- Behavior: status line shows 5-hour usage next to weekly usage from one cached `/wham/usage` read, with shortened labels ("Codex", "Cache", no "left"). The compact v2 indicator and verbosity level are hidden. The usage cache lasts 1 minute instead of 5.
- Files: `src/codex-usage/{client,payload}.ts`, `src/adapter/activation/{state,tool-set}.ts`, `src/extension/{events,ui}.ts`, `src/ui/status.ts`, `src/diagnostics/{runtime.ts,AGENTS.md}`, `README.md`

### Appended Codex system prompt file

- Commit: `b452e63` (`FORK_MOD`)
- Behavior: optional user-owned file appended after Pi's prompt construction and conversion, controlled by a default-on General setting with global/project scope. Realtime Voice Mode's prompt is untouched.
- Fork-only files: `src/prompt/append-system-prompt.ts`
- Shared files: `src/prompt/build-system-prompt.ts`, `src/adapter/activation/config-{contract,normalize}.ts`, `src/extension/{register,runtime}.ts`, `src/ui/settings/{command,config-items-adapter}.ts`, `src/voice/delegation-preflight.ts`, `README.md`

### Codex + Extra tools provider scope

- Commit: `09c586f`
- Behavior: mixed scope applies the full adapter to Codex and Responses-compatible providers, and exposes enabled standalone tools to providers on other APIs.
- Files: `src/adapter/activation/{config-contract,config-normalizers,runtime-plan}.ts`, `src/ui/settings/{command,config-items-adapter}.ts`, `README.md`

### Standalone `apply_patch` replaces `edit` and `write`

- Commit: `8710da4`
- Behavior: when standalone `apply_patch` is exposed, Pi's builtin `edit` and `write` are hidden; disabling the adapter or the tool restores them.
- Files: `src/adapter/activation/{activation,tool-set}.ts`, `src/ui/settings/config-items-tools.ts`, `README.md`

### Cancelled Code Mode host setup is silent

- Commit: `a41b207`
- Behavior: cancelling a Code Mode host download while switching to Notebook mode no longer surfaces as a download failure.
- Files: `src/extension/events.ts`, `src/tools/code-mode/install-host.ts`

### Session adapter switch and `apply_patch` failure diagnostics

- Commits: `352af15` (PR #15), `a563eca` (changeset restore); `FORK_MOD` in tests
- Behavior: a session-local "Adapter enabled" toggle at the top of `/codex` General settings. When off, all adapter overlays and tools are suppressed and the adapter's Codex provider is unregistered so stock Pi takes over; the setting is stored as a session entry and restored on branch navigation. Failed `apply_patch` results render the exact model-visible error and the full rejected patch, also in resumed sessions.
- Fork-only files: `src/adapter/activation/session-state.ts`
- Shared files: `src/adapter/activation/{runtime-plan,state}.ts`, `src/adapter/provider-request.ts`, `src/extension/{events,register,runtime,ui}.ts`, `src/providers/{code-mode-proxy-provider,openai-codex-custom-provider}.ts`, `src/tools/apply-patch/{render-state,tool}.ts`, `src/ui/settings/command.ts`, `README.md`

### Prompt message stays at the head of context

- Commit: `ecd31db` (PR #17)
- Behavior: the head system message is hoisted ahead of virtual Codex bookkeeping entries (e.g. the reasoning update at model selection), restoring Pi 0.87's invariant that the prompt leads the context.
- Files: `src/adapter/developer-history.ts`
- Upstream status: bug fix against Pi 0.87; worth proposing upstream.
