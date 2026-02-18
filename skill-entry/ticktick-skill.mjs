import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTickTickRuntime, parseTickTickEnvFromRuntime } from "../dist/src/index.js";

const DEFAULT_TOKEN_PATH = path.join(os.homedir(), ".config", "ticktick", "token.json");

async function readAccessTokenFromFile(tokenPath) {
  const raw = await fs.readFile(tokenPath, "utf8");
  const parsed = JSON.parse(raw);
  const token = parsed?.accessToken;

  if (typeof token !== "string" || token.trim().length === 0) {
    throw new Error(`Token file '${tokenPath}' does not contain a valid accessToken`);
  }

  return token;
}

/**
 * Build OpenClaw-ready TickTick skill actions.
 *
 * @param {object} [options]
 * @param {string} [options.tokenPath] - JSON file path containing `accessToken`
 * @param {() => Promise<string>} [options.getAccessToken] - custom token provider
 * @param {import('../dist/src/config/ticktick-env.js').TickTickEnvSchema} [options.env]
 */
export function createTickTickOpenClawSkill(options = {}) {
  const tokenPath = options.tokenPath ?? process.env.TICKTICK_TOKEN_PATH ?? DEFAULT_TOKEN_PATH;

  const getAccessToken =
    options.getAccessToken ??
    (async () => {
      return readAccessTokenFromFile(tokenPath);
    });

  const env = options.env ?? parseTickTickEnvFromRuntime();
  const runtime = createTickTickRuntime({ env, getAccessToken });

  return {
    name: "ticktick",
    description: "TickTick task/project integration skill",
    actions: {
      async create_task(input) {
        return runtime.useCases.createTask.execute(input);
      },

      async list_tasks(input) {
        return runtime.useCases.listTasks.execute(input);
      },

      async update_task(input) {
        return runtime.useCases.updateTask.execute(input);
      },

      async complete_task(input) {
        return runtime.useCases.completeTask.execute(input);
      },

      async list_projects(input) {
        return runtime.useCases.listProjects.execute(input);
      },
    },
  };
}

export default createTickTickOpenClawSkill;
