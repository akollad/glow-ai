---
name: Imported Vite builds
description: Environment requirements for building imported Vite artifacts outside managed workflows.
---

Imported Vite artifact configs may intentionally fail fast when `PORT` or `BASE_PATH` is absent. Managed Replit workflows provide those values automatically; standalone verification must provide the artifact's configured values explicitly.

**Why:** This preserves the artifact's proxied routing and avoids weakening a deliberate runtime configuration check just to make a shell build pass.

**How to apply:** Read the artifact's `.replit-artifact/artifact.toml` and run the build with its configured `PORT` and `BASE_PATH` when verifying outside the workflow.