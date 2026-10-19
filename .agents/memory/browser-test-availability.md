---
name: Browser test availability
description: Fallback for a mismatch between the testing skill and the available testing callback.
---

Do not assume the specialized testing callback is available solely because its skill is installed.

**Why:** The callback rejected the documented testing configuration as an unknown kind in this environment.

**How to apply:** Check the current capability once. If unavailable, the installed Chromium and native Node WebSocket/CDP can exercise the real UI without adding application dependencies. Always use an isolated browser profile and remove only records created by that test.
