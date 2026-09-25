---
"@howaboua/pi-better-skills-tool": patch
---

Fixed `skills list` returning nothing under `--no-skills` when an extension injected a user-only skill: skills Pi loaded now overlay the filesystem catalog instead of replacing it.
