---
"@howaboua/pi-codex-conversion": patch
---

Add session-scoped adapter control and complete `apply_patch` failure diagnostics.

- Disable the adapter and all extra tools for one resumable session without affecting other sessions.
- Preserve model-visible errors and complete failed patch input in rendered output.
