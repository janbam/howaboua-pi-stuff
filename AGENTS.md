Merges to main feed Changesets versioning and npm publishing.

We use this toolkit. If tools fail or cause friction, propose concrete fixes. Apply tiny, low-risk fixes without derailing the task. Edit owning source, never installed tooling. Validate and report changes. Source edits do not update running packages.
For this repository's disposable VM review, use `bun run sandbox:setup --name NAME` after candidate changes. See packages/pi-sandbox/README.md. Stop active review agents before replacing the guest snapshot; host edits alone never update it.
Resolve package names against immediate packages subdirectories. Search the unique word match first, then follow direct references.
Keep pi-codex-web-run and pi-codex-imagegen src/codex-runtime trees identical. Do not publish a shared runtime package.

Agent-facing text is behaviour. Keep contracts, skills, prompt metadata and subagent prompts compact. Default to general-purpose assistance. Scope coding assumptions to coding tasks.
Hide extension internals from agent-facing text, including errors. State what happened, what remains available and an actionable next step. Users own account and configuration decisions. Success may expose a new action, not invented workflow advice.
Keep the static prefix small and stable. Defer nonessential tools through Code/Notebook while preserving discovery. Deliver tool guidance on demand through supported mid-session messages or results, not prefix edits.
Mid-session harness updates stay chronological: developer role if supported, user otherwise—never folded into the initial system prompt as Pi’s fallback does.
Extend existing tools, not overlapping choices. Help-backed tools default to no-argument discovery, {} in structured mode. Keep explicit help visible and disclose current arguments on demand. Preserve familiar contracts. Omit obvious field descriptions.
Do not repeat obvious contracts across names, descriptions, schemas, promptSnippet and promptGuidelines. Use the latter two only for concrete failures. Never rewrite prior tool calls or results to integrate a tool.
Measure emitted tool schemas and system-prompt deltas for cache impact. Repository AGENTS.md is internal guidance, not product prompt cost.
Prefer semantic signal over grammatical polish. Drop cosmetic punctuation only if syntax, delimiters, meaning, evidence, caveats and recovery survive.
Skills and extensions must work for any user. Never ship personal names, local paths, machine assumptions or private workflows.

Delete permanent tests by default. Retain only consequential failure coverage that static checks and disposable probes cannot adequately provide. Contract labels do not justify retention. Add permanent tests only when the user explicitly requests more coverage.
If agents misuse tools or ignore prompts, fix the model-facing contract from real-use evidence, not programmatic tests. Tests may cover deterministic parser, executor, result and routing boundaries.
Put editing hazards and fragile ownership/order constraints in the nearest AGENTS.md, not regression suites. Distil constraints, not inventories of deleted assertions. Keep runtime validation in owning code.
Review supported workflows: who triggers the failure, and how does execution reach it? A synthetic reproducer or possible interleaving alone does not prove exposure.
Weigh consequence and exposure against fix complexity. Rare severe failures may warrant fixes. Hypotheticals alone do not justify coordination, recovery or compatibility machinery.
Respect product tradeoffs. Optional capabilities are not defects. Do not inflate severity with unsupported worst cases. If a review questions scope, cull first.

Trace each kickoff through the complete before_agent_start chain before prompt/tool rewrites and prewarm. Custom/developer-message turns and in-run steering bypass it. User-message kickoffs must enter settled. Never substitute captured-prompt patches for other extensions' preparation.
Code/Notebook nested tools sit outside provider JSON schemas. Callable tools do not prove their prompt contracts survived. Verify final instructions and native schemas separately.
Slash commands are for users, tools for agents. Prefer one routed entry command unless explicitly asked for several.

Amend only tiny, immediate, behaviour-preserving corrections to the latest unpublished commit. Put behaviour changes, revised approaches and later fixes in new commits.
Release related session work together: one PR or an atomically merged stack, not serial cleanup releases.
If published behaviour or payload changes, add a changeset. Dependency-only changes, ordinary docs and tests need none.
Changesets describe net user-facing changes since the last release. Omit implementation details, review history and intermediate fixes. Lead with one concise outcome, then capability bullets if needed. Never write "upcoming release", "unreleased" or speculative notes.
Before new work on dev, check whether its previous dev → main PR merged. If yes, align with retained repoDance, never an ad hoc reset. Preserve dirty files and unpublished commits even if alignment blocks. Never merge main into dev.
While editing, use focused package checks. bun run check:changed selects committed branch changes, not working edits. Prefer bun changeset -- "summary". Use bun changeset:raw only for intentional non-patch bumps.
After behaviour-preserving module splits, run bun refactor:compare --base <pre-refactor> --entry <old path> --probe <ESM>. Probe old and replacement modules with identical inputs, assert normalised outputs and explain every reachable old-side path. Coverage is traversal, not proof. Retain probes only for durable independent contracts.
Never manually bump aggregate versions or add their changesets. CI runs bun run changeset:aggregates.

This development host uses an AMD K10-class CPU without AVX. Do not use Bun to compile, transpile, test, or directly execute TypeScript. Use tsgo/tsc for compilation and Node or tsx for execution. Bun remains the package manager and may run scripts that delegate TypeScript work to those tools.
changelog.js is generated, uncommitted, and required before Pi loads packages with changelog.ts. After checkout or bun install, generate all copies with `for f in packages/*/changelog.ts; do node scripts/build-extension-changelog.mjs ${f%/changelog.ts}; done`. Package builds generate their own copy.
Keep root and pi-codex-conversion development typebox pins exactly aligned with Pi's pin so shared schema helpers retain one portable type identity.
This is a fork. FORK.md lists fork-owned changes. Add an entry with changes upstream lacks and preserve listed behaviour when merging upstream releases.
