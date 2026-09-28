# Fork-owned changes

Ledger of behavior carried in `janbam/howaboua-pi-stuff` that does not exist upstream (`IgorWarzocha/howaboua-pi-stuff`). Consult it when merging `upstream/main`: conflicts in the listed files must keep the fork behavior unless the entry is dropped or upstream adopted it. Remove an entry once upstream ships equivalent behavior.

## pi-ask: notify script and `pi-ask.json`

- PR: #23
- Behavior: `notifyScript` in the config runs an executable with the first prompt title whenever a wait or steer ask panel appears. Config file renamed `ask.json` → `pi-ask.json`, with automatic rename of an existing `ask.json`.
- Fork-only files: `packages/pi-ask/ask/notify.ts`
- Shared files touched: `packages/pi-ask/ask/config.ts` (rename, migration, `notifyScript`), `packages/pi-ask/ask/coordinator.ts` (`onPresent` hook in `present`), `packages/pi-ask/ask/tool.ts` (threads `onPresent`), `packages/pi-ask/index.ts` (wires `runNotifyScript`), `packages/pi-ask/README.md` (Notifications section, config file name)
- Upstream status: not proposed
- Dropping it: revert the files above; existing users then need `pi-ask.json` renamed back to `ask.json`.
