# @howaboua/pi-notes-compaction

## 0.0.5

- We've been informed that Astra and Sol currently retain their prompt caches for around an hour. If you use notes-managed idle rollover, consider increasing it from 25 to 55 minutes. Cache retention can vary. YMMV. We'll keep monitoring. Please share your cache-retention and long-context quota observations in [the feedback thread](https://github.com/IgorWarzocha/howaboua-pi-stuff/issues/508).

  Added configurable task-boundary reminders and a clearer settings layout.

  - Added optional reminders at preset or custom token counts when context capacity exceeds 272k, showing the remaining percentage.
  - Status text and keyboard hints now wrap to fit narrow terminals.
  - Notes help now lists required arguments. Writes accept `content` when `text` is omitted.
  - Fixed fresh worker startup with Notes enabled.

## 0.0.4

- Fixed note queries and manual context rollover with Codex Conversion.

  - Restored negative line ranges, default limits, result ordering, metadata and complete read and search content. Help now shows concrete call syntax, and invalid arguments are reported before execution.
  - `/compact` now honours the Normal compaction setting. With it off, Notes Compaction reuses fresh saved notes or requests a checkpoint, then opens a new context window without starting a continuation turn.

## 0.0.3

- Fixed shared agent startup after package updates when the startup changelog is present.

## 0.0.2

- Added a `/notes` settings panel for normal compaction, idle rollover, continuity status and confirmed pruning, replacing the subcommands and JSON status output.

## 0.0.1

- Added Notes Compaction: local checkpoint notes, searchable session history and notes-guided context windows for any Pi model, with optional Codex Conversion integration and cached remote lookup.
