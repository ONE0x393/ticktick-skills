import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildAuthorizationUrl, TickTickOAuth2Client } from "../dist/src/index.js";

const REFRESH_BUFFER_SECONDS = 120;

export const DEFAULT_TOKEN_PATH = path.join(os.homedir(), ".config", "ticktick", "token.json");

export class ReauthRequiredError extends Error {
  constructor(message, authUrl, state) {
    super(message);
    this.name = "ReauthRequiredError";
    this.authUrl = authUrl;
    this.state = state;
  }
}

export function createOAuthClientFromEnv(env) {
  return new TickTickOAuth2Client({
    tokenUrl: env.oauthTokenUrl,
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    timeoutMs: env.apiTimeoutMs,
    userAgent: env.userAgent,
  });
}

export function createOAuthState(prefix = "oc") {
  return `${prefix}_${Date.now().toString(36)}`;
}

export function buildTickTickAuthUrl(env, state) {
  return buildAuthorizationUrl(env.oauthAuthorizeUrl, {
    clientId: env.clientId,
    redirectUri: env.redirectUri,
    responseType: "code",
    state,
    scope: env.oauthScope,
  });
}

export async function readTokenFile(tokenPath = DEFAULT_TOKEN_PATH) {
  const raw = await fs.readFile(tokenPath, "utf8");
  return JSON.parse(raw);
}

export async function writeTokenFile(tokenPath = DEFAULT_TOKEN_PATH, tokenRecord) {
  const dir = path.dirname(tokenPath);
  await fs.mkdir(dir, { recursive: true });

  const now = new Date();
  const expiresIn = Number.isFinite(tokenRecord?.expiresIn)
    ? Math.max(0, Number(tokenRecord.expiresIn))
    : undefined;
  const expiresAt =
    expiresIn !== undefined ? new Date(now.getTime() + expiresIn * 1000).toISOString() : tokenRecord?.expiresAtUtc;

  const payload = {
    accessToken: tokenRecord?.accessToken,
    tokenType: tokenRecord?.tokenType,
    scope: tokenRecord?.scope,
    expiresIn,
    expiresAtUtc: expiresAt,
    obtainedAtUtc: now.toISOString(),
    refreshToken: tokenRecord?.refreshToken,
  };

  await fs.writeFile(tokenPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.chmod(tokenPath, 0o600);
}

function isTokenUsable(tokenRecord, now = new Date()) {
  if (!tokenRecord || typeof tokenRecord.accessToken !== "string" || tokenRecord.accessToken.trim().length === 0) {
    return false;
  }

  if (!tokenRecord.expiresAtUtc) {
    return true;
  }

  const expiresAtMs = Date.parse(tokenRecord.expiresAtUtc);
  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }

  return expiresAtMs - now.getTime() > REFRESH_BUFFER_SECONDS * 1000;
}

export async function getAccessTokenWithAutoReauth({ tokenPath = DEFAULT_TOKEN_PATH, env }) {
  const oauthClient = createOAuthClientFromEnv(env);
  let tokenRecord;

  try {
    tokenRecord = await readTokenFile(tokenPath);
  } catch (error) {
    const state = createOAuthState();
    const authUrl = buildTickTickAuthUrl(env, state);
    throw new ReauthRequiredError(
      `Token file not found: ${tokenPath}. Complete OAuth authorization first.`,
      authUrl,
      state
    );
  }

  if (isTokenUsable(tokenRecord)) {
    return tokenRecord.accessToken;
  }

  const refreshToken = tokenRecord?.refreshToken;
  if (typeof refreshToken === "string" && refreshToken.trim().length > 0) {
    try {
      const refreshed = await oauthClient.refreshAccessToken(refreshToken);
      const merged = {
        ...tokenRecord,
        ...refreshed,
        refreshToken: refreshed.refreshToken ?? refreshToken,
      };
      await writeTokenFile(tokenPath, merged);
      return merged.accessToken;
    } catch {
      // fall through to reauth-required flow
    }
  }

  const state = createOAuthState();
  const authUrl = buildTickTickAuthUrl(env, state);
  throw new ReauthRequiredError(
    "Access token expired and refresh token is unavailable (or refresh failed). Reauthorization required.",
    authUrl,
    state
  );
}

export function parseCallbackUrl(callbackUrl) {
  const parsed = new URL(callbackUrl);
  const code = parsed.searchParams.get("code") ?? undefined;
  const state = parsed.searchParams.get("state") ?? undefined;
  const error = parsed.searchParams.get("error") ?? undefined;
  const errorDescription = parsed.searchParams.get("error_description") ?? undefined;

  return { code, state, error, errorDescription };
}

export async function exchangeCodeAndPersistToken({ code, tokenPath = DEFAULT_TOKEN_PATH, env }) {
  const oauthClient = createOAuthClientFromEnv(env);
  const token = await oauthClient.exchangeAuthorizationCode({
    code,
    redirectUri: env.redirectUri,
  });

  await writeTokenFile(tokenPath, token);
  return token;
}
