---
"@howaboua/pi-codex-conversion": patch
---

Added a session-scoped **Adapter enabled** switch and complete `apply_patch` failure output.

- Added **Adapter enabled** to `/codex` General settings. Off restores Pi's stock prompt, requests, tools and compaction for the current session only, including removal of standalone extra tools; voice and `/codex` stay available. Resuming the session restores the choice.
- `apply_patch` failures now show the exact error the model received and the complete rejected patch, even while the row is collapsed.
