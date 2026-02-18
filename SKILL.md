---
name: ticktick
description: "TickTick task/project integration toolkit (OAuth2 + typed API + task/project usecases)."
---

# TickTick Skill

Use this skill when the user asks to connect, automate, or operate TickTick tasks/projects.

## What this skill provides

- OAuth2 helpers + token refresh client
- Typed TickTick API client (timeout/retry/error typing)
- Task/Project usecases:
  - create task
  - list tasks
  - update task
  - complete task
  - list projects

## Prerequisites

Required env vars:

- `TICKTICK_CLIENT_ID`
- `TICKTICK_CLIENT_SECRET`
- `TICKTICK_REDIRECT_URI`

Optional defaults are documented in `README.md`.

## Recommended flow

1. Load env (`parseTickTickEnvFromRuntime`)
2. Build auth URL
3. Exchange auth code for token
4. Refresh token as needed (or reauthorize when refresh unavailable)
5. Execute usecases via `createTickTickRuntime`

For OpenClaw wrapper/CLI, auto reauth helpers are in:
- `skill-entry/token-manager.mjs`
- `skill-entry/ticktick-skill.mjs`
- `scripts/ticktick-cli.mjs`

Optional webhook notification env vars:
- `TICKTICK_REAUTH_WEBHOOK_URL`
- `TICKTICK_REAUTH_NOTIFY_COOLDOWN_MS`
- `TICKTICK_REAUTH_NOTIFY_STATE_PATH`

## References

- `README.md`
- `docs/openclaw-skill-guide.md`
- `src/core/ticktick-runtime.ts`
- `src/core/ticktick-usecases.ts`
