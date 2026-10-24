# Sandbox reviewer profile

This is a portable copy of the custom profile used for our reviews. The prompt omits personal account configuration. The model is a placeholder because it selects your reviewer, independently of the models tested inside the guest.

From the repository root, install it in a new profile directory. If `sandbox-reviewer` already exists, compare the files instead of running these copy commands over your configuration.

```sh
profile="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}/shepherdr/profiles/sandbox-reviewer"
mkdir -p "$profile"
cp docs/e2e-sandboxing-test-procedure/assets/sandbox-reviewer/profile.example.json "$profile/profile.json"
cp docs/e2e-sandboxing-test-procedure/assets/sandbox-reviewer/prompt.md "$profile/prompt.md"
cp packages/pi-shepherdr/profiles/reviewer/prepare.mjs "$profile/prepare.mjs"
```

Replace `PROVIDER/MODEL` in `profile.json` with an available reviewer model and choose a supported thinking level. Reload Pi to discover the profile.

The preparation module is the repository's existing reviewer helper. It supplies the repository root, current ref, base, merge base and working-tree status to the assignment. There is no second copy to maintain here.

Ask the agent to spawn `sandbox-reviewer` with the checkout as `cwd`, the intended `base` and the workflows to exercise as its task. The profile is asynchronous. Its prompt keeps the reviewer on guest testing while the parent owns source fixes.

Profile discovery and configuration are documented in [Shepherdr](../../../../packages/pi-shepherdr/README.md).
