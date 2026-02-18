# TickTick Skills

TypeScript toolkit for building TickTick integrations with:
- OAuth2 contract helpers + runtime token client
- Typed TickTick API client (timeout/retry/error typing)
- Task/Project gateway and core use cases
- Strict TypeScript + unit tests

OpenClaw Skill로 등록하려면 `docs/openclaw-skill-guide.md`를 먼저 확인하세요.

## What Is Included

- `src/config/ticktick-env.ts`
  - Validates required env vars and fills defaults.
- `src/auth/oauth2-contract.ts`
  - OAuth URL builder, callback parser, token payload parser, auth error classifier.
- `src/auth/ticktick-oauth2-client.ts`
  - Runtime OAuth token exchange/refresh client.
- `src/api/ticktick-api-client.ts`
  - Low-level HTTP client with retry and timeout.
- `src/api/ticktick-gateway.ts`
  - Domain-oriented task/project operations.
- `src/core/ticktick-usecases.ts`
  - MVP use case interface implementation for 5 flows.
- `src/core/ticktick-runtime.ts`
  - One-shot runtime factory (`oauth2Client`, `apiClient`, `gateway`, `useCases`).

## Step-by-Step Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env` in project root

```env
TICKTICK_CLIENT_ID=your_client_id
TICKTICK_CLIENT_SECRET=your_client_secret
TICKTICK_REDIRECT_URI=http://localhost:3000/oauth/callback

# Optional (defaults shown)
TICKTICK_OAUTH_AUTHORIZE_URL=https://ticktick.com/oauth/authorize
TICKTICK_OAUTH_TOKEN_URL=https://ticktick.com/oauth/token
TICKTICK_API_BASE_URL=https://api.ticktick.com/open/v1
TICKTICK_API_TIMEOUT_MS=10000
TICKTICK_API_MAX_RETRIES=3
TICKTICK_API_RETRY_BASE_DELAY_MS=250
TICKTICK_OAUTH_SCOPE=
TICKTICK_USER_AGENT=
```

### 3) Run quality checks

```bash
npm run typecheck
npm test
```

### 4) Build

```bash
npm run build
```

### 5) Create runtime and call use cases

```ts
import { createTickTickRuntime, parseTickTickEnvFromRuntime } from "./src/index.js";

const env = parseTickTickEnvFromRuntime();

// In production, persist token and refresh when needed.
let accessToken = "replace-with-oauth-access-token";

const runtime = createTickTickRuntime({
  env,
  getAccessToken: async () => accessToken,
});

const created = await runtime.useCases.createTask.execute({
  projectId: "project-id",
  title: "Write integration notes",
  priority: 3,
});

await runtime.useCases.updateTask.execute({
  taskId: created.id,
  dueDate: "2026-02-21T09:00:00.000Z",
  priority: 5,
});

await runtime.useCases.completeTask.execute({
  taskId: created.id,
});

const tasks = await runtime.useCases.listTasks.execute({
  projectId: created.projectId,
  includeCompleted: true,
  limit: 20,
});

const projects = await runtime.useCases.listProjects.execute({ includeClosed: false });

console.log({ taskCount: tasks.length, projectCount: projects.length });
```

## Step-by-Step OAuth Flow

### 1) Build authorization URL

```ts
import { buildAuthorizationUrl, parseTickTickEnvFromRuntime } from "./src/index.js";

const env = parseTickTickEnvFromRuntime();

const authorizationUrl = buildAuthorizationUrl(env.oauthAuthorizeUrl, {
  clientId: env.clientId,
  redirectUri: env.redirectUri,
  state: "csrf-state-token",
  scope: env.oauthScope,
});
```

### 2) User approves and your callback receives query params

```ts
import { parseAuthorizationCallback } from "./src/index.js";

const callback = parseAuthorizationCallback({ code: "auth-code", state: "csrf-state-token" });
if (!callback.ok) {
  throw new Error(callback.value.error);
}
```

### 3) Exchange code for token

```ts
import { TickTickOAuth2Client, parseTickTickEnvFromRuntime } from "./src/index.js";

const env = parseTickTickEnvFromRuntime();

const oauthClient = new TickTickOAuth2Client({
  tokenUrl: env.oauthTokenUrl,
  clientId: env.clientId,
  clientSecret: env.clientSecret,
  timeoutMs: env.apiTimeoutMs,
  userAgent: env.userAgent,
});

const token = await oauthClient.exchangeAuthorizationCode({
  code: "auth-code",
  redirectUri: env.redirectUri,
});
```

### 4) Refresh expired token

```ts
const refreshed = await oauthClient.refreshAccessToken(token.refreshToken ?? "");
```

## Error Categories

Domain errors use `TickTickDomainError` with categories:
- `auth_401`
- `auth_403`
- `not_found_404`
- `rate_limit_429`
- `server_5xx`
- `network`
- `validation`
- `unknown`

## Scripts

- `npm run typecheck` - strict type check
- `npm test` - run unit tests
- `npm run build` - compile TS to `dist/`

## Current Test Coverage

- `tests/unit/auth.unit.test.ts`
  - OAuth contract parsing + runtime token client success/failure behavior
- `tests/unit/api.unit.test.ts`
  - Authorization header, retry behavior, typed API errors
- `tests/unit/core.unit.test.ts`
  - Payload mapping, update flow, API-to-domain error mapping
