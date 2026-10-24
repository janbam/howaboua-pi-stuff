---
name: pi-stuff-free-model-smoke
description: "Read before selecting or verifying a free live model for Pi smoke tests or sandbox reviews."
---

Check current OpenRouter stealth and preview models first, then other free tool-capable models. Select a concrete model ID for reproducible tests. Do not retain a preferred model list: free routes disappear and capabilities change.

## Find a usable route

Use `https://openrouter.ai/api/v1`:

1. `GET /models`: inspect `data[]`, including `id`, `pricing`, `supported_parameters`, context and output limits. Require explicit numeric zero for prompt and completion prices and `tools` support. Missing prices are unknown, not zero. Check any other charges relevant to the request.
2. `GET /models/{author}/{slug}/endpoints`: inspect `data.endpoints[]` for current providers, prices and required parameters. Preserve the model's suffix, including `:free`. An empty endpoint list is not a usable route, even if a marketing page still exists.
3. Authenticated `GET /key`: record only `data.limit`, `limit_remaining`, `usage`, `is_free_tier` and `free_model_daily_requests` when present, before and after the probe. The credit ceiling and daily request allowance are separate. Treat counters as reported snapshots, not guaranteed capacity or immediate accounting. Rate limits and account policy can still block requests.

Send `Authorization: Bearer <key>` from an in-memory credential. Never print headers, auth objects or the complete key response. Use only disposable test content.

For `POST /chat/completions`, constrain routing in the request body:

```json
{"provider":{"require_parameters":true,"max_price":{"prompt":0,"completion":0}}}
```

Keep paid models and billable add-ons out of the request. A spend ceiling is not permission to use it. Do not add a paid fallback when free endpoints fail.

## Prove the tool round-trip through Pi

Use the installed public `ModelRuntime` export from `@earendil-works/pi-coding-agent`. The repo dependency is suitable for a host probe. A sandbox must use its candidate's runtime and authorised guest credentials.

- `await ModelRuntime.create()` uses Pi's configured credential store. If skipping initial refresh, call `await runtime.getAvailable("openrouter")` before judging availability. An uninitialised auth snapshot can look unconfigured.
- Select the exact model from that result. `await runtime.getAuth("openrouter")` supplies `auth.apiKey` for metadata requests. Never log the returned object.
- Use `runtime.completeSimple(model, { messages, tools }, options)` with a short output budget and an abort timeout. Its `onPayload` callback can return the payload with the routing constraint above. Preserve other request fields.
- Supply a lookup tool for an opaque value, with one required key argument. Ask the model to call it. Require a real `toolCall` with the expected name and valid arguments.
- Generate a fresh nonce **after** that call. Append the assistant response and a Pi `toolResult` with the matching `toolCallId`, `toolName`, text content, timestamp and `isError: false`. Complete again. Require the answer to contain the nonce, not to equal an exact formatting template.

Record model ID, time, actual tool call, nonce consumption, errors, token usage and reported cost. Simple arithmetic proves nothing: the model can answer without executing a tool. Advertised `tool_choice` support does not guarantee every value works. Test forced selection separately only if the workflow needs it.

## Handle blockers without widening the claim

Stop on authentication or client-only policy errors. OpenCode free routes have rejected external Pi calls even with a valid key. Do not spoof its client. For 429s, respect retry timing or choose another verified free route rather than looping.

If credential setup is explicitly requested, use Pi's login flow or `ModelRuntime.login(provider, "api_key", interaction)` with secure input. Do not import the unexported `AuthStorage` or rewrite auth JSON. Keep personal keys, limits and provisioning details outside this skill.

A successful SDK probe establishes that provider's Pi tool round-trip. Exercise the actual application to claim workflow acceptance. OpenRouter cannot validate ChatGPT Remote or its native compaction backend.

If API behaviour changes, consult [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection) and [limits](https://openrouter.ai/docs/api/reference/limits), then recheck the live endpoints.
