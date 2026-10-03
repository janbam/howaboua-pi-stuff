# Changelog

## 0.0.1

Initial monorepo release for the Howaboua Pi package collection.

This repository brings the previously separate Pi packages into one Bun workspace while keeping every package separately installable. It also adds aggregate packages for installing everything, extensions only, or skills only:

- `@howaboua/pi-stuff`
- `@howaboua/pi-extensions`
- `@howaboua/pi-skills`

Legacy Pi Codex history remains in its [package changelog](./packages/pi-codex-conversion/CHANGELOG.md).

Going forward, package-level changelogs remain the source of truth for each package, and this top-level changelog summarizes monorepo-wide releases.

<!-- package-changelog-summary -->

## Latest package changelogs

### @howaboua/pi-ask — 0.0.11

- Run a notification script whenever an ask needs your attention

  - Set `notifyScript` in `pi-ask.json` to an executable; it runs with the first prompt title as its argument whenever a waiting or steering ask panel appears.
  - The config file is now `pi-ask.json`; an existing `ask.json` is renamed automatically.

[Full changelog](./packages/pi-ask/CHANGELOG.md)

### @howaboua/pi-auto-trees — 0.1.16

- GPT-6 Sol and Luna now share Astra's Codex support.

  - Removed `/terra`; use `/luna` instead.
  - Added Responses Lite, non-destructive reasoning changes and terse context guidance for GPT-6 Sol and Luna.
  - Image descriptions now use GPT-6 Luna directly instead of preferring older mini models.
  - Cost estimates now use published GPT-6 Sol and Luna rates, including cache writes and long-context pricing.
  - Agent, review, exploration, web search, voice summary and image-description defaults now use GPT-6; Luna replaces Terra defaults. GPT Switcher retains Luna's 472K context limit, while Codex Conversion defaults all three GPT-6 models to 272K.

[Full changelog](./packages/pi-auto-trees/CHANGELOG.md)

### @howaboua/pi-better-skills-tool — 0.0.7

- Fixed `skills list` returning nothing under `--no-skills` when an extension injected a user-only skill: skills Pi loaded now overlay the filesystem catalog instead of replacing it.

- The `skills` tool call line in the TUI now shows the full command instead of only the tool name.

[Full changelog](./packages/pi-better-skills-tool/CHANGELOG.md)

### @howaboua/pi-browser — 0.0.6

- Requires Pi 1.0.0 or later.

  Browser now uses help-first discovery in ordinary Pi and Structured mode. Native calls accept help and single or batched JSON requests through `command`, matching Code and Notebook. Existing object calls remain supported.

[Full changelog](./packages/pi-browser/CHANGELOG.md)

### @howaboua/pi-cache-hit-predictor — 0.0.1

### Changes

- [#140](https://github.com/IgorWarzocha/howaboua-pi-stuff/pull/140) [`c95d68a`](https://github.com/IgorWarzocha/howaboua-pi-stuff/commit/c95d68a21939860e4c6dcff9c58a6bf8a50044ff) Thanks [@IgorWarzocha](https://github.com/IgorWarzocha)!:
  - Show inline cache-hit predictions when switching models or reasoning lanes.
  - Warn once that automatic reasoning changes can miss the prompt cache and affect costs or quotas.

[Full changelog](./packages/pi-cache-hit-predictor/CHANGELOG.md)

### @howaboua/pi-codex-conversion — 3.0.44

- Standalone `apply_patch` now replaces Pi's `edit` and `write` tools while it is exposed; `read` and `bash` stay available.

- Add `CODEX_APPEND_SYSTEM.md` as the final section of active converted system prompts, with a General-menu toggle to disable it.

- Keep the full adapter on Codex and Responses-compatible Additional providers while giving listed providers on other APIs enabled standalone tools in the new mixed provider scope.

- Added a session-scoped **Adapter enabled** switch and complete `apply_patch` failure output.

  - Added **Adapter enabled** to `/codex` General settings. Off restores Pi's stock prompt, requests, tools and compaction for the current session only, including removal of standalone extra tools; voice and `/codex` stay available. Resuming the session restores the choice.
  - `apply_patch` failures now show the exact error the model received and the complete rejected patch, even while the row is collapsed.

- Fixed the `Handler removed the leading system message` error on Pi 0.87: reasoning updates recorded before the first prompt no longer push the system prompt off the head of the request.

- pi-codex-conversion: set a shortcut binding to an empty string to disable that shortcut instead of falling back to its default

- Suppress cancelled Code Mode host downloads while switching to Notebook mode.

- pi-codex-conversion: status line uses compact labels: "Codex" without "adapter", no verbosity level, no compact v2 indicator, and no "left" suffix on usage

- pi-codex-conversion: status-line usage cache refreshes every minute instead of five, keeping displayed quota closer to live state

[Full changelog](./packages/pi-codex-conversion/CHANGELOG.md)

### @howaboua/pi-codex-imagegen — 0.0.9

- Requires Pi 1.0.0 or later.

  Updated Undici to 8.10.2 with security fixes.

[Full changelog](./packages/pi-codex-imagegen/CHANGELOG.md)

### @howaboua/pi-codex-web-run — 0.0.6

- Requires Pi 1.0.0 or later.

  Updated Undici to 8.10.2 with security fixes.

[Full changelog](./packages/pi-codex-web-run/CHANGELOG.md)

### @howaboua/pi-dynamic-tools — 0.0.9

- Reviewer prompts now request evidence-backed findings without issue-count targets.

[Full changelog](./packages/pi-dynamic-tools/CHANGELOG.md)

### @howaboua/pi-explore-subagents — 0.1.15

- Explorer prompts now use concise evidence maps and explicit unknowns without fixed-length report templates or repeated discovery instructions.

[Full changelog](./packages/pi-explore-subagents/CHANGELOG.md)

### @howaboua/pi-extensions — 0.0.85

- Include bundled package updates:

  - @howaboua/pi-ask: Run a notification script whenever an ask needs your attention - Set `notifyScript` in `pi-ask.json` to an executable; it runs with the first prompt title as its argument whenever a waiting or steering ask panel appears. - The config file is now `pi-ask.json`; an existing `ask.json` is renamed automatically.
  - @howaboua/pi-better-skills-tool: Fixed `skills list` returning nothing under `--no-skills` when an extension injected a user-only skill: skills Pi loaded now overlay the filesystem catalog instead of replacing it.
  - @howaboua/pi-better-skills-tool: The `skills` tool call line in the TUI now shows the full command instead of only the tool name.
  - @howaboua/pi-vent: Store project vent logs under ~/.pi/agent/vent and migrate repo-local logs without losing existing central history.
  - @howaboua/pi-explore-subagents: Remove retired bundled extension.

[Full changelog](./packages/pi-extensions/CHANGELOG.md)

### @howaboua/pi-gippity-control — 0.0.24

- Requires Pi 1.0.0 or later.

  Updated Undici to 8.10.2 with security fixes.

[Full changelog](./packages/pi-gippity-control/CHANGELOG.md)

### @howaboua/pi-gpt-switcher — 0.1.4

- The `/sol` shortcut now selects GPT-6.1 Sol while preserving configured context and reasoning defaults.

[Full changelog](./packages/pi-gpt-switcher/CHANGELOG.md)

### @howaboua/pi-memories — 0.1.5

- Memory extraction now uses supplied context without assuming that global or project instruction files were loaded.

[Full changelog](./packages/pi-memories/CHANGELOG.md)

### @howaboua/pi-pet — 0.1.4

- Remove obsolete test-only helper exports without changing tool behavior.

[Full changelog](./packages/pi-pet/CHANGELOG.md)

### @howaboua/pi-semantic-grep — 0.1.19

### Changes

- [#239](https://github.com/IgorWarzocha/howaboua-pi-stuff/pull/239) [`7dbbfc8`](https://github.com/IgorWarzocha/howaboua-pi-stuff/commit/7dbbfc8bc28746ec28b3142a73efc8e0b14d2ffa) Thanks [@IgorWarzocha](https://github.com/IgorWarzocha)!:
  - Make indexing non-blocking at session startup.
  - Use a single writer with atomic, resumable rebuilds.
  - Respect ignore rules and prioritize metadata, batching, and roles.
  - Preserve usable prior indexes across interrupted rebuilds.

[Full changelog](./packages/pi-semantic-grep/CHANGELOG.md)

### @howaboua/pi-shepherdr — 0.2.10

- Requires Pi 1.0.0 or later.

  - Added optional agent-tree message boards with channels, replies, search, subscriptions and persistent folder-local history. Boards require Node.js 22.13 or later.
  - Added session, exact-folder and global board settings under `/herdr board`. Board notifications reach running turns without waking idle agents.
  - Board history is stored as plaintext in `.pi/agent-message-board.sqlite` and remains after disabling boards. Keep this archive out of version control and restricted to its intended readers.
  - Agent messages and worker reports now respect Codex Conversion's saved-Notes idle rollover before waking an idle agent.
  - Updated coordination guidance to favor asynchronous implementation workers and ending the controller turn when only waiting. Blocked workers are directed to a question-asking tool instead of peer messages, and final replies replace duplicate completion reports.

[Full changelog](./packages/pi-shepherdr/CHANGELOG.md)

### @howaboua/pi-skill-chrome-cdp — 0.0.5

### Changes

- [#342](https://github.com/IgorWarzocha/howaboua-pi-stuff/pull/342) [`35182d9`](https://github.com/IgorWarzocha/howaboua-pi-stuff/commit/35182d9a002daded7610cca64c47b25bed3267df) Thanks [@howaclawa](https://github.com/howaclawa)! - Give Chrome CDP agents bounded snapshots and screenshots with non-aliasing reusable element references, broader ARIA control support, targeted search, serialized daemon commands, released remote object handles, revalidated native clicks, identity-safe referenced-field input, Shadow DOM support, actionable timeout recovery, and reliable linked CLI execution.

[Full changelog](./packages/pi-skill-chrome-cdp/CHANGELOG.md)

### @howaboua/pi-skill-code — 0.0.3

- Scratchpad guidance now keeps one-off checks temporary and deletes their artifacts after use. Persistent projects require an explicit request to retain them.

[Full changelog](./packages/pi-skill-code/CHANGELOG.md)

### @howaboua/pi-skill-foundations — 0.0.3

- Communication guidance now uses a shorter baseline, rejects stock banter and checks apparent contradictions before conceding a mistake.

[Full changelog](./packages/pi-skill-foundations/CHANGELOG.md)

### @howaboua/pi-skill-harness-and-agent-engineering — 0.0.5

- Harness audits now stay within the requested workflow, reuse supplied context and measure startup overhead only when in scope.

  Tool-design guidance now prefers on-demand help for unfamiliar multi-action or state-dependent tools, while preserving familiar native contracts and simple schemas.

[Full changelog](./packages/pi-skill-harness-and-agent-engineering/CHANGELOG.md)

### @howaboua/pi-skill-omarchy-help — 0.0.6

- Expanded Omarchy guidance for personalization, maintenance, recovery, Bluetooth, crashes, and runtime triage.

[Full changelog](./packages/pi-skill-omarchy-help/CHANGELOG.md)

### @howaboua/pi-skills — 0.0.23

- Include bundled package updates:

  - @howaboua/pi-skill-harness-and-agent-engineering: Harness audits now stay within the requested workflow, reuse supplied context and measure startup overhead only when in scope. Tool-design guidance now prefers on-demand help for unfamiliar multi-action or state-dependent tools, while preserving familiar native contracts and simple schemas.

[Full changelog](./packages/pi-skills/CHANGELOG.md)

### @howaboua/pi-smart-btw — 0.2.8

- GPT-6 Sol and Luna now share Astra's Codex support.

  - Removed `/terra`; use `/luna` instead.
  - Added Responses Lite, non-destructive reasoning changes and terse context guidance for GPT-6 Sol and Luna.
  - Image descriptions now use GPT-6 Luna directly instead of preferring older mini models.
  - Cost estimates now use published GPT-6 Sol and Luna rates, including cache writes and long-context pricing.
  - Agent, review, exploration, web search, voice summary and image-description defaults now use GPT-6; Luna replaces Terra defaults. GPT Switcher retains Luna's 472K context limit, while Codex Conversion defaults all three GPT-6 models to 272K.

[Full changelog](./packages/pi-smart-btw/CHANGELOG.md)

### @howaboua/pi-stuff — 0.0.93

- Include bundled package updates:

  - @howaboua/pi-ask: Run a notification script whenever an ask needs your attention - Set `notifyScript` in `pi-ask.json` to an executable; it runs with the first prompt title as its argument whenever a waiting or steering ask panel appears. - The config file is now `pi-ask.json`; an existing `ask.json` is renamed automatically.
  - @howaboua/pi-better-skills-tool: Fixed `skills list` returning nothing under `--no-skills` when an extension injected a user-only skill: skills Pi loaded now overlay the filesystem catalog instead of replacing it.
  - @howaboua/pi-better-skills-tool: The `skills` tool call line in the TUI now shows the full command instead of only the tool name.
  - @howaboua/pi-vent: Store project vent logs under ~/.pi/agent/vent and migrate repo-local logs without losing existing central history.
  - @howaboua/pi-explore-subagents: Remove retired bundled extension.

[Full changelog](./packages/pi-stuff/CHANGELOG.md)

### @howaboua/pi-subagent-review — 0.2.25

- Reviewer prompts now request evidence-backed findings without issue-count targets.

[Full changelog](./packages/pi-subagent-review/CHANGELOG.md)

### @howaboua/pi-subdir-agents — 0.0.9

- Expanded AGENTS.md notices now use the same muted theme colour as their summaries.

[Full changelog](./packages/pi-subdir-agents/CHANGELOG.md)

### @howaboua/pi-unicode-charts — 0.1.0

### Changes

- [#295](https://github.com/IgorWarzocha/howaboua-pi-stuff/pull/295) [`b3c662a`](https://github.com/IgorWarzocha/howaboua-pi-stuff/commit/b3c662abe45472e7b720cc900421164e1f137ee6) Thanks [@howaclawa](https://github.com/howaclawa)! - Add terminal-native Unicode bar, line, scatter, sparkline, and heatmap rendering for explicit `chart` Markdown blocks

[Full changelog](./packages/pi-unicode-charts/CHANGELOG.md)

### @howaboua/pi-vent — 0.2.12

- Store project vent logs under ~/.pi/agent/vent and migrate repo-local logs without losing existing central history.

[Full changelog](./packages/pi-vent/CHANGELOG.md)

