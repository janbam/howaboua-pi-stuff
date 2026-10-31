# Fork-owned changes

Ledger of behavior carried in `janbam/howaboua-pi-stuff` that does not exist upstream (`IgorWarzocha/howaboua-pi-stuff`), plus retained historical fixes. Consult it when merging `upstream/main`: conflicts in the listed files must keep active fork behavior unless the entry is dropped or upstream adopted it. Mark adopted entries as historical rather than erasing the fork history.

- Entry = one feature: commits/PRs, behavior, files touched. Tests and changelogs are omitted; `git show --stat <commit>` has the full list.
- In-code divergences in shared files may carry `// FORK_MOD: <why>` comments; `rg FORK_MOD packages` lists them. Conflicts on those lines keep the fork side.
- Upstream status is "not proposed" unless stated.
- Upstream baseline: `@howaboua/pi-stuff@0.0.110` (`e4aa5bb4`), including `@howaboua/pi-codex-conversion@4.0.7`, `@howaboua/pi-notes-compaction@0.0.13` and `@howaboua/pi-observatory@0.0.3`. Development links Pi 1.4.0 from a local Pi checkout. Root, PCC and Vent retain Pi's TypeBox pin, `1.3.27`, rather than upstream extensions' `1.4.3`, so PCC declarations share Pi's schema identity.
- Version policy: package versions follow the upstream release being merged. Fork-only changes are documented here, not in Changesets or upstream changelogs. This fork does not create versioning PRs, publish npm packages or create package releases; do not run the retained upstream release commands locally.

## Repo

### Upstream 4.0.7 integration

- Upstream release: `@howaboua/pi-stuff@0.0.110` (`e4aa5bb4`), merged with ancestry preserved, including the intervening `0.0.109` release.
- Behavior: adopts upstream's voice models and delegation, Herdr Core, Notes role handoffs, browser loader fixes and package dependency updates. Preserves the fork's session adapter switch, prompt appendix, provider scope, shortcuts, status line, Ask notifications, skills overlay, Vent and Memories.
- Integration: combines session adapter restoration with upstream's execution-mode reapplication on tree navigation. Keeps the adapter toggle and voice web-search availability as separate settings inputs. Retains upstream's extracted prompt-guideline module and updated native binaries with matching provenance.
- Dependencies: Pi peer minima retain the fork's 1.2 floor without weakening higher upstream requirements. Root, PCC and Vent share the local Pi checkout's TypeBox pin. The checkout linker now includes `pi-codemode` so every declared Pi dependency resolves to the same checkout without changing portable package manifests.
- Files: `AGENTS.md`, `FORK.md`, `bun.lock`, package manifests, `scripts/link-pi-checkout.mjs`, `packages/pi-codex-conversion/src/{adapter/activation/config-contract.ts,extension/session-lifecycle.ts,prompt/build-system-prompt.ts,ui/settings/config-items.ts,ui/settings/screen/configuration.ts}`, `packages/pi-gippity-control/README.md`.

### Upstream 4.0.5 integration

- PR: #30
- Upstream releases: `@howaboua/pi-stuff@0.0.107` (`d67cb69b`) and `0.0.108` (`c8afcba3`), merged with ancestry preserved. The follow-up includes upstream's LAN voice handoff, Notes SQLite runtime and pruning-menu fixes without additional fork behavior.
- Behavior: adopts upstream's independent Notes extension, removal of built-in Notes and legacy Remote mode, and new TS and JS notebooks. The session adapter switch remains PCC-owned; Notes uses its own `/notes` controls. The switch is wired into the refactored settings owner without duplicating upstream's five-mode execution selector. Remaining fork features and upstream package versions are preserved.
- Compatibility: Pi peer minima retain the fork's 1.2 floor without weakening higher upstream requirements. The root, PCC and private Vent retain Pi's TypeBox pin. Generated changelog exclusions and Vent's Biome schema follow the updated formatter.
- Tooling: isolated artifact verification accepts both array and package-name-keyed `npm pack --json` results.
- Files: `AGENTS.md`, `FORK.md`, `bun.lock`, package manifests, `scripts/verify-pi-extension-artifact.mjs`, `packages/pi-ask/README.md`, `packages/pi-codex-conversion/{README.md,src/adapter/activation,src/extension,src/providers/code-mode-proxy-provider.ts,src/ui/settings,tests/adapter-tool-activation.test.ts}`, `packages/{pi-grok-realtime,pi-sandbox,pi-vent}/biome.json`.

### Upstream 4.0.4 integration

- PR: #29
- Behavior: preserves the fork's adapter switch, prompt appendix, provider scope, shortcuts, status line, Ask notifications and skill catalog overlay alongside upstream's Pi 1.4 transcript API and GPT prompt mode. Pi peer minima retain the fork's 1.2 floor without weakening higher upstream requirements. Other retired upstream packages are removed, while Vent remains fork-owned.
- Files: `AGENTS.md`, `FORK.md`, `bun.lock`, `knip.jsonc`, package manifests, `scripts/{link-pi-checkout,pi-sdk-policy,sync-aggregate-packages}.mjs`, `packages/pi-ask/ask/tool.ts`, `packages/pi-better-skills-tool/README.md`, `packages/pi-codex-conversion/{README.md,src/adapter/activation,src/extension,src/prompt/build-system-prompt.ts,src/ui/settings}`, `packages/{pi-observatory,pi-suggestions}/biome.json`

### Upstream-owned versioning and releases

- PR: #28
- Behavior: this fork's GitHub Release workflow is disabled; its retained source job also runs only in the upstream repository. The changeset check exempts forks. Fork-only changesets were removed after preserving their outcomes in this ledger. Incoming upstream release metadata remains untouched.
- Rationale: local source and Git commits identify fork modifications without drifting from upstream package versions or publishing under upstream package names.
- Files: `.github/workflows/release.yml`, `scripts/require-changeset.mjs`, `AGENTS.md`, `.changeset/*.md`

### Pi 1.2 SDK and checkout linking

- PR: #27
- Behavior: extensions require Pi 1.2.0, share its TypeBox pin, and prepare both user and custom kickoffs without treating custom messages as user-text handoffs. The checkout helper links declared Pi dependencies across all workspaces; the removed server package is no longer referenced.
- Files: `package.json`, `bun.lock`, `packages/*/package.json`, package requirement documentation, `scripts/{link-pi-checkout,pi-sdk-policy}.mjs`, `packages/pi-codex-conversion/src/extension/turn-lifecycle.ts`

### Root `AGENTS.md` rules

- Commits: `f75e2b8`, `c19a43d`, `99e1ef7`, this ledger
- Behavior: fork-added agent rules: K10 host (no Bun for TypeScript), `changelog.js` generation after install/build, TypeBox pins aligned with Pi, `FORK.md` maintenance.
- Files: `AGENTS.md`

### Generated `changelog.js` handling

- Commits: `f987721`, `e340b30`, PR #27
- Behavior: `changelog.js` is ignored once at the repo root instead of per package, and every package `biome.json` excludes it so local lint passes once it is generated. Knip explicitly includes source changelog entry points whose generated imports are ignored, plus the retained skills contract tests.
- Files: `.gitignore`, `packages/pi-codex-conversion/.gitignore` (entry removed), `packages/*/biome.json`, `knip.jsonc`

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
- Ownership: retained as a private fork-owned package after upstream removed Vent in `9c5167e4`. Keep its last upstream version, `0.2.11`, without publishing it. Development dependencies follow Pi 1.4.0 and its TypeBox 1.3.27 pin.
- Behavior: vent logs live outside project repos, isolated per project via Pi's session-path encoding. A repo-local `VENT.md` is migrated on first use (moved, or appended to existing central history).
- Fork-only files: `packages/pi-vent/extensions/storage.ts`
- Shared files: `extensions/vent.ts`, `README.md`, `package.json`
- Dropping it: logs already migrated stay in central storage; move them back manually if needed.

## pi-memories

### Fork-owned shutdown memory distiller

- PR: #31
- Ownership: retained as a private fork-owned package after upstream removed Memories in `9c5167e4`. Keep its last upstream version, `0.1.5`, without publishing it. Development dependencies follow Pi 1.4.0.
- Behavior: on `quit`, distil the newest compaction summary plus the following conversation through `ctx.modelRegistry.streamSimple` and append candidates to `memory-inbox.md`. `/memory-review` remains the manual promotion step. Failures go to `pi-memories.log`, not the inbox. The retired `includeProjectContext` option is ignored.
- Rationale: the retired child-process bridge stopped injecting the distillation prompt, so agent replies to the trigger sentence were written into the inbox. The direct request removes both the provider-payload rewrite and the child Pi process.
- Files: `packages/pi-memories/{index.ts,package.json,README.md,AGENTS.md}`, `bun.lock`
- Dropping it: remove the package and the local `~/.pi/agent/pi-memories.json`, `memory-inbox.md`, and `pi-memories.log`; existing candidate text stays until deleted.

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

### Exact realtime voice delegation in expanded cards

- PRs: #33, #34
- Behavior: expanded Task for Pi cards show the exact complete message submitted to Pi, including attached transcript context. Codex Live cards also retain and label the original delegation text before rewriting as UI-only audit data. Collapsed cards keep the prepared task. The same captured outgoing string is sent and saved with the card; older cards retain their recorded display.
- Files: `src/voice/{ui,turns,session-messages}.ts`, `src/voice/conversation/turn-events.ts`, `README.md`

### Direct voice/Pi communication in expanded cards

- Behavior: expanded Voice Context includes the exact startup text and refresh carryover. Compact Sent to Codex Live entries expose submitted Pi updates and control messages; voice-session cards expose instructions sent to Pi, and Sent to Pi entries reveal leftover transcript context. Audit entries are display-only, do not invalidate context refresh and omit the Live system prompt, model metadata and rewrite internals. Existing task and speech-transcript displays remain unchanged.
- Files: `src/voice/{message-types,ui,session-messages}.ts`, `src/voice/controller/{context,sessions,start}.ts`, `src/voice/conversation/{session,turn-events}.ts`, `README.md`

### Leading system message ordering

- Commit: `ecd31dbd` (PR #17)
- Historical behavior: on Pi 0.87, reasoning updates recorded before the first prompt could precede the system message. Context projection kept the leading system message ahead of virtual Codex bookkeeping, fixing `Handler removed the leading system message`. Current Pi 1.2 lifecycle handling is described above.
- Upstream status: equivalent ordering protection is included in baseline `76f20771`.
- File: `src/adapter/developer-history.ts`

### Empty shortcut binding disables the shortcut

- Commit: `e132fc8` (`FORK_MOD`)
- Behavior: an empty or whitespace string for any of the eight voice or background-shell shortcut bindings disables it instead of falling back to the default. Disabled bindings are not registered, and the widget footer lists only enabled ones.
- Files: `src/adapter/activation/config-{migration,normalize,values}.ts`, `src/extension/ui.ts`, `src/ui/background-bash-widget.ts`, `src/voice/{setup,shortcuts}.ts`

### Compact status line with 5h usage, 1-minute usage cache

- Commits: `407c820`, `5edc924` (`FORK_MOD`)
- Behavior: status line shows 5-hour usage next to weekly usage from one cached `/wham/usage` read, with shortened labels ("Codex", "Cache", no "left"). The compact v2 indicator and verbosity level are hidden. The usage cache lasts 1 minute instead of 5.
- Upstream status: five-hour extraction and display are included in 4.0.4. Compact labels, hidden indicators and the one-minute cache remain fork-owned.
- Files: `src/codex-usage/{client,payload}.ts`, `src/adapter/activation/{state,tool-set}.ts`, `src/extension/{session-lifecycle,turn-lifecycle,ui}.ts`, `src/ui/status.ts`, `src/diagnostics/{runtime.ts,AGENTS.md}`, `README.md`

### Appended Codex system prompt file

- Commit: `b452e63` (`FORK_MOD`)
- Behavior: optional user-owned file appended after Pi's prompt construction and conversion, controlled by a default-on General setting with global/project scope. Realtime Voice Mode's prompt is untouched.
- Fork-only files: `src/prompt/append-system-prompt.ts`
- Shared files: `src/prompt/build-system-prompt.ts`, `src/adapter/activation/config-{contract,normalize}.ts`, `src/extension/{register,runtime,turn-lifecycle}.ts`, `src/ui/settings/{command,config-items-adapter}.ts`, `README.md`

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
- Files: `src/extension/session-lifecycle.ts`, `src/tools/code-mode/install-host.ts`

### Session adapter switch and `apply_patch` failure diagnostics

- Commits: `352af15` (PR #15), `a563eca` (changeset restore); `FORK_MOD` in tests
- Behavior: a session-local "Adapter enabled" toggle under `/codex` General settings. When off, all adapter overlays and tools are suppressed and the adapter's Codex provider is unregistered so stock Pi takes over; the setting is stored as a session entry and restored on branch navigation. Failed `apply_patch` results render the exact model-visible error and the full rejected patch, also in resumed sessions.
- Historical: live-toggle guards for protected local and routed Remote Notes delivery were removed with upstream's legacy Remote mode in 4.0.5. The independent Notes extension is not disabled by PCC's session switch.
- Fork-only files: `src/adapter/activation/session-state.ts`
- Shared files: `src/adapter/activation/{runtime-plan,state}.ts`, `src/adapter/provider-request.ts`, `src/extension/{events,register,runtime,session-lifecycle,turn-lifecycle,ui}.ts`, `src/providers/{code-mode-proxy-provider,openai-codex-custom-provider}.ts`, `src/tools/apply-patch/{render-state,tool}.ts`, `src/ui/settings/{command,screen,screen/configuration}.ts`, `README.md`. Historical files: `src/context-management/{external-notes-remote,notes-response-projection}.ts`.
