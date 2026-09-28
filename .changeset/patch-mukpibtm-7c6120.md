---
"@howaboua/pi-ask": patch
---

Run a notification script whenever an ask needs your attention

- Set `notifyScript` in `pi-ask.json` to an executable; it runs with the first prompt title as its argument whenever a waiting or steering ask panel appears.
- The config file is now `pi-ask.json`; an existing `ask.json` is renamed automatically.
