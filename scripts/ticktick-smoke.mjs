#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createTickTickRuntime, parseTickTickEnvFromRuntime } from "../dist/src/index.js";
import {
  createWebhookReauthNotifierFromEnv,
  getAccessTokenWithAutoReauth,
} from "../skill-entry/token-manager.mjs";

const DEFAULT_ENV_PATH = path.resolve(process.cwd(), ".env");

const REQUIRED_ENV_KEYS = [
  "TICKTICK_CLIENT_ID",
  "TICKTICK_CLIENT_SECRET",
  "TICKTICK_REDIRECT_URI",
];

function printUsage() {
  console.log(`ticktick-smoke

Usage:
  ticktick-smoke [--env <path>] [--projectId <id>] [--tokenPath <path>] [--dryRun]

Options:
  --env <path>        Path to .env (default: ./ .env)
  --projectId <id>    Use project id for create/update/complete flow
  --tokenPath <path>  Token JSON path (default: ~/.config/ticktick/token.json)
  --dryRun            Validate configuration and print planned steps without API calls
`);
}

function parseArgv(argv) {
  const out = {
    flags: new Set(),
    values: new Map(),
  };

  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${current}`);
    }

    const key = current.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith("--")) {
      out.flags.add(key);
      continue;
    }

    out.values.set(key, next);
    i += 1;
  }

  return out;
}

function missingRequiredKeys() {
  const missing = [];
  for (const key of REQUIRED_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      missing.push(key);
    }
  }
  return missing;
}

async function loadDotEnv(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();

      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function resolveConfiguration({ envPath, tokenPath }) {
  await loadDotEnv(envPath);
  const env = parseTickTickEnvFromRuntime();

  return {
    env,
    tokenPath: path.resolve(tokenPath ?? process.env.TICKTICK_TOKEN_PATH ?? path.join(process.env.HOME ?? "~", ".config", "ticktick", "token.json")),
  };
}

async function runSmokeFlow({ envPath, projectId, tokenPath }) {
  const { env, tokenPath: resolvedTokenPath } = await resolveConfiguration({ envPath, tokenPath });
  const onReauthRequired = createWebhookReauthNotifierFromEnv();

  const runtime = createTickTickRuntime({
    env,
    getAccessToken: async () => getAccessTokenWithAutoReauth({
      tokenPath: resolvedTokenPath,
      env,
      onReauthRequired,
    }),
  });

  const projects = await runtime.useCases.listProjects.execute({ includeClosed: false });
  if (projects.length === 0) {
    console.log("[ticktick-smoke] No projects found. Cannot run create/update/complete flow.");
    return;
  }

  const chosen =
    projectId && projects.find((project) => project.id === projectId) ?
    projects.find((project) => project.id === projectId)
    : projects[0];

  console.log(`[ticktick-smoke] Using project: ${chosen.name} (${chosen.id})`);

  const created = await runtime.useCases.createTask.execute({
    projectId: chosen.id,
    title: `[smoke] ${new Date().toISOString()}`,
    priority: 0,
  });

  const updated = await runtime.useCases.updateTask.execute({
    taskId: created.id,
    title: `${created.title} (updated)`,
    priority: 1,
    description: "Smoke test update",
  });

  await runtime.useCases.completeTask.execute({ taskId: updated.id, completedAt: new Date().toISOString() });

  const tasks = await runtime.useCases.listTasks.execute({
    projectId: chosen.id,
    includeCompleted: true,
    limit: 20,
  });

  const foundUpdated = tasks.some((task) => task.id === updated.id && task.status === "completed");

  if (!foundUpdated) {
    throw new Error("Smoke flow completed but updated task not visible in list_tasks output.");
  }

  console.log(`[ticktick-smoke] smoke flow finished. created task id=${created.id}`);
}

function printDryRunReport() {
  const missing = missingRequiredKeys();
  const hasMissing = missing.length > 0;

  if (hasMissing) {
    console.log("[ticktick-smoke] dryRun: required env is missing.");
    console.log("Missing:", missing.join(", "));
    console.log("Tip: fill them in .env or pass --env path to prepare before real smoke run.");
    return;
  }

  console.log("[ticktick-smoke] dryRun: required env is present.");
  console.log("Next: run without --dryRun to execute a live smoke flow.");
}

async function main() {
  const parsed = parseArgv(process.argv);

  if (parsed.flags.has("help") || parsed.flags.has("h")) {
    printUsage();
    return;
  }

  const envPath = path.resolve(parsed.values.get("env") ?? DEFAULT_ENV_PATH);
  const projectId = parsed.values.get("projectId");
  const tokenPath = parsed.values.get("tokenPath");
  const isDryRun = parsed.flags.has("dryRun");

  await loadDotEnv(envPath);

  if (isDryRun) {
    printDryRunReport();
    process.exit(0);
  }

  const missing = missingRequiredKeys();
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  await runSmokeFlow({ envPath, projectId, tokenPath });
}

main().catch((error) => {
  console.error("[ticktick-smoke]", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
