---
name: pi-stuff-delivery
description: "Read after general repository delivery when shipping package changes or preparing a release PR."
---

Discover and load an applicable general repository delivery skill before delivery work.

When Igor explicitly asks to drive a release through admin overrides, use the GitHub account he authorises, verify its identity, and merge the reviewed head with `--admin --match-head-commit`. Do not manufacture an approving review or disable repository rules. Follow the Changesets version PR through merge and npm publication verification rather than stopping at the feature PR. Keep actual failing checks and unresolved material findings visible and fix them before merging.

For shipped package work, read `references/release-and-repository-hygiene.md`. This repo requires changesets for intended published behavior, not documentation or internal plumbing that merely happens to live in a package.

For a release split into topic PRs, also discover and load the repo's applicable release-umbrella skill. Related package work from one session remains one release unit.
