# @howaboua/pi-memories

Distils a finished Pi session into a small set of memory candidates when Pi quits, then leaves the final decision to you. There is no database, vector store, or hidden profile: candidates go to a plain Markdown inbox for manual review.

Upstream retired this extension. This fork retains it as a private, fork-owned package and does not publish npm releases.

## How it works

Distillation runs only for a real Pi shutdown (`session_shutdown` with reason `quit`), not reloads, new sessions, resumes, or forks. It uses the newest compaction summary plus the conversation after it, or the recent conversation when no compaction exists.

The extension makes one tool-free request through Pi's configured model registry. The distillation contract lives in the system prompt, so there is no child process, provider-payload rewriting, or temporary bridge extension.

Native-only Codex compactions store an opaque checkpoint rather than readable text. For those sessions only the retained tail is available; choose a portable Pi summary if pre-compaction context should be reviewable.

Candidates are appended to `~/.pi/agent/memory-inbox.md`. Short sessions without compaction are skipped by default, and output equal to `No durable memories.` is not written.

Failures go to `~/.pi/agent/pi-memories.log` instead of the inbox, so a broken model or missing credential cannot masquerade as a memory candidate.

## Review

Run `/memory-review`. The command fills the editor with a review prompt that asks the agent to promote only durable, non-sensitive information into the appropriate global or project `AGENTS.md`, merge duplicates, and empty the inbox when finished.

The review is deliberately manual. Inbox entries are candidates, not truth.

## Configuration

The extension creates `~/.pi/agent/pi-memories.json` on first load.

| Option                       | Default                       | Purpose                                                                                        |
| ---------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `enabled`                    | `true`                        | Enable shutdown distillation.                                                                  |
| `model`                      | empty                         | Provider/model reference, e.g. `openai-codex/gpt-5.4`. Empty uses the closing session's model. |
| `thinking`                   | `low`                         | Thinking level, from `off` through `max`.                                                      |
| `inboxPath`                  | `~/.pi/agent/memory-inbox.md` | Destination for candidates.                                                                    |
| `logPath`                    | `~/.pi/agent/pi-memories.log` | Destination for failure diagnostics.                                                           |
| `prompt`                     | built-in distillation prompt  | Replace the worker prompt.                                                                     |
| `timeoutMs`                  | `120000`                      | Maximum request runtime.                                                                       |
| `minUserMessagesWithoutBlob` | `3`                           | Skip shorter sessions when no compaction exists.                                               |

The retired `includeProjectContext` option is ignored. Context files are not re-sent to the distiller; the manual review step catches candidates already covered by `AGENTS.md`.

## Install

```bash
pi install /absolute/path/to/this/checkout/packages/pi-memories
```
