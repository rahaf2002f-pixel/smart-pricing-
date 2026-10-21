---
name: Preview cookie behavior
description: Cookie policies may be rewritten by the embedded preview proxy; retain application-side CSRF protection.
---

The preview proxy can rewrite a server's `SameSite=Lax` cookie to `SameSite=None; Secure` for embedding. Do not weaken authentication or CSRF checks to make a proxied cookie-policy assertion pass.

**Why:** The same account response was observed with `SameSite=Lax` directly from Express and `SameSite=None; Secure` through the HTTPS preview proxy; both retained HttpOnly and restored the session.

**How to apply:** Test the server's Lax/HttpOnly policy separately from the proxied browser session. Keep same-origin validation and the custom authentication request header, and require Secure cookies for non-local access.
