---
"@howaboua/pi-codex-conversion": patch
---

Fixed the `Handler removed the leading system message` error on Pi 0.87: reasoning updates recorded before the first prompt no longer push the system prompt off the head of the request.
