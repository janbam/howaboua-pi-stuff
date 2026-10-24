# h-pi-stuff-stack

Skills for Howaboua cloud agents so they match the local Pi skill set.

This plugin is not submitted to the public marketplace. The root marketplace manifest does not list it. The git repository is public, so these files are in the repository even though the plugin is not listed.

## Skills

Cursor discovers these from `skills/`. Each directory includes its references.

| Skill | Use it for |
|---|---|
| `pi-stuff-delivery` | Shipping package changes or preparing a release PR, after general repository delivery |
| `pi-stuff-release-umbrella` | A release that uses a parent collector PR and focused topic PRs |
| `pi-stuff-tool-contracts` | Reviewing or changing a model-facing Pi extension tool, after general agent-tool design. Includes the token-line script |
| `pi-stuff-tool-error-audit` | Auditing tool and Notebook failures across stored Pi sessions. Includes the audit scripts |
| `pi-stuff-prompt-caching` | This repository's Codex cache, continuation, prewarm, replay, or compaction, after general prompt-caching guidance |

## Install

An agent that opens this repository does not load `plugins/h-pi-stuff-stack` just because the directory is committed. The same skill directories are copied into `.cursor/skills/`, which Cursor loads with no marketplace install. Those are real copies, not symlinks.

The plugin directory is the installable bundle, with `.cursor-plugin/plugin.json` and skills discovered from `skills/`. Do not submit it at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). The root marketplace manifest lists only `h-stack`.
