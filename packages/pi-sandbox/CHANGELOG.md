# @howaboua/pi-sandbox

## 0.1.2

- Require Pi 1.2.0 or newer. Codex conversion prepares both user and extension-triggered runs using the current lifecycle API, preserving prompt and tool contributions without treating custom messages as user prompts.

## 0.1.1

- Added Pi Sandbox for persistent local Gondolin environments and app previews.

  - Named instances and reusable prepared templates retain guest files across disk checkpoints and reopen.
  - Managed services provide readiness checks, restart supervision and localhost HTTP and WebSocket previews.
  - Guest commands, file access and temporary SSH terminals work without forwarding host credentials.
