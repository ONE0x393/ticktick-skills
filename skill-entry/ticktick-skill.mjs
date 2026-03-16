import fs from "node:fs/promises";
import path from "node:path";
import { createTickTickRuntime, parseTickTickEnvFromRuntime } from "../dist/src/index.js";
import {
  DEFAULT_TOKEN_PATH,
  ReauthRequiredError,
  createWebhookReauthNotifierFromEnv,
  getAccessTokenWithAutoReauth,
} from "./token-manager.mjs";

const DEFAULT_SKILL_STATE_PATH = path.resolve(process.cwd(), "skill-entry/.ticktick-skill-state.json");

function isValidIanaTimeZone(timezone) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

async function readSkillState(statePath) {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeSkillState(statePath, state) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

async function getConfiguredTimezone(statePath) {
  const state = await readSkillState(statePath);
  return typeof state.timezone === "string" && state.timezone.length > 0 ? state.timezone : undefined;
}

async function setConfiguredTimezone(statePath, timezone) {
  if (!isValidIanaTimeZone(timezone)) {
    throw new Error(`Invalid IANA timezone: ${timezone}. Example: Asia/Seoul`);
  }

  const now = new Date().toISOString();
  const previous = await readSkillState(statePath);
  const next = {
    ...previous,
    timezone,
    timezoneSetAtUtc: now,
    updatedAtUtc: now,
  };
  await writeSkillState(statePath, next);
  return next;
}

function ensureTimezoneConfigured(timezone) {
  if (!timezone) {
    throw new Error(
      [
        "TickTick timezone is not configured yet.",
        "Please ask the user: '현재 거주/기준 시간대가 어디인가요? (예: Asia/Seoul)'",
        "Then call ticktick.set_timezone with that IANA timezone.",
      ].join("\n")
    );
  }
}

function formatOffsetNoColon(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const asUtcMillis = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );

  const offsetMinutes = Math.round((asUtcMillis - date.getTime()) / 60000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hh = String(Math.floor(absMinutes / 60)).padStart(2, "0");
  const mm = String(absMinutes % 60).padStart(2, "0");
  return `${sign}${hh}${mm}`;
}

function toTimeZoneLocalIso(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const offset = formatOffsetNoColon(date, timeZone);

  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}.000${offset}`;
}

function normalizeTickTickDateString(input, timezone) {
  if (input === undefined || input === null) {
    return input;
  }

  if (typeof input !== "string") {
    return input;
  }

  const trimmed = input.trim();

  // already +HHMM
  if (/([+-]\d{4})$/.test(trimmed)) {
    return trimmed;
  }

  // +HH:MM -> +HHMM
  if (/([+-]\d{2}:\d{2})$/.test(trimmed)) {
    return trimmed.replace(/([+-]\d{2}):(\d{2})$/, "$1$2");
  }

  // Z or full ISO with timezone colon: convert to timezone-local +HHMM format for TickTick consistency.
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return toTimeZoneLocalIso(parsed, timezone);
  }

  return trimmed;
}

function normalizeDateFields(input, timezone) {
  if (!input || typeof input !== "object") {
    return input;
  }

  const cloned = { ...input };
  if ("startDate" in cloned && typeof cloned.startDate === "string") {
    cloned.startDate = normalizeTickTickDateString(cloned.startDate, timezone);
  }
  if ("dueDate" in cloned && typeof cloned.dueDate === "string") {
    cloned.dueDate = normalizeTickTickDateString(cloned.dueDate, timezone);
  }
  if ("from" in cloned && typeof cloned.from === "string") {
    cloned.from = normalizeTickTickDateString(cloned.from, timezone);
  }
  if ("to" in cloned && typeof cloned.to === "string") {
    cloned.to = normalizeTickTickDateString(cloned.to, timezone);
  }

  return cloned;
}

function pickExpectedDateFields(input) {
  const expected = {};
  if (input && typeof input === "object") {
    if (Object.prototype.hasOwnProperty.call(input, "startDate")) {
      expected.startDate = input.startDate;
    }
    if (Object.prototype.hasOwnProperty.call(input, "dueDate")) {
      expected.dueDate = input.dueDate;
    }
  }
  return expected;
}

function hasDateExpectation(expected) {
  return Object.prototype.hasOwnProperty.call(expected, "startDate") || Object.prototype.hasOwnProperty.call(expected, "dueDate");
}

function datesEquivalent(expected, actual) {
  if (expected === actual) {
    return true;
  }

  if (typeof expected !== "string" || typeof actual !== "string") {
    return false;
  }

  const expectedTime = Date.parse(expected);
  const actualTime = Date.parse(actual);
  if (!Number.isNaN(expectedTime) && !Number.isNaN(actualTime)) {
    return expectedTime === actualTime;
  }

  return expected.replace(/([+-]\d{2}):(\d{2})$/, "$1$2") === actual.replace(/([+-]\d{2}):(\d{2})$/, "$1$2");
}

function dateFieldMatches(expected, actual) {
  if (expected === null) {
    return actual === undefined || actual === null;
  }

  if (expected === undefined) {
    return true;
  }

  return datesEquivalent(expected, actual);
}

async function verifyTaskDatePersistence(runtime, task, expected, contextLabel) {
  if (!hasDateExpectation(expected)) {
    return;
  }

  if (!task?.id || !task?.projectId) {
    throw new Error(`[${contextLabel}] Cannot verify date persistence: missing task id/projectId in response.`);
  }

  let lastSeen;
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const tasks = await runtime.useCases.listTasks.execute({
      projectId: task.projectId,
      includeCompleted: true,
      limit: 200,
    });

    const current = tasks.find((item) => item.id === task.id);
    if (current) {
      lastSeen = current;
      const startOk = dateFieldMatches(expected.startDate, current.startDate);
      const dueOk = dateFieldMatches(expected.dueDate, current.dueDate);
      if (startOk && dueOk) {
        return;
      }
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }

  throw new Error(
    [
      `[${contextLabel}] TickTick date persistence check failed after create/update.`,
      `taskId=${task.id}`,
      `expected.startDate=${String(expected.startDate)}`,
      `expected.dueDate=${String(expected.dueDate)}`,
      `actual.startDate=${String(lastSeen?.startDate)}`,
      `actual.dueDate=${String(lastSeen?.dueDate)}`,
      "Please retry with an explicit datetime and timezone.",
    ].join(" ")
  );
}

/**
 * Build OpenClaw-ready TickTick skill actions.
 *
 * @param {object} [options]
 * @param {string} [options.tokenPath] - JSON file path containing `accessToken`
 * @param {string} [options.statePath] - JSON file path containing skill state such as timezone
 * @param {() => Promise<string>} [options.getAccessToken] - custom token provider
 * @param {(payload: {reason:string,message:string,authUrl:string,state:string}) => Promise<void>} [options.onReauthRequired]
 * @param {import('../dist/src/config/ticktick-env.js').TickTickEnvSchema} [options.env]
 */
export function createTickTickOpenClawSkill(options = {}) {
  const tokenPath = options.tokenPath ?? process.env.TICKTICK_TOKEN_PATH ?? DEFAULT_TOKEN_PATH;
  const statePath = options.statePath ?? process.env.TICKTICK_SKILL_STATE_PATH ?? DEFAULT_SKILL_STATE_PATH;

  const env = options.env ?? parseTickTickEnvFromRuntime();

  const onReauthRequired = options.onReauthRequired ?? createWebhookReauthNotifierFromEnv();

  const getAccessToken =
    options.getAccessToken ??
    (async () => {
      return getAccessTokenWithAutoReauth({ tokenPath, env, onReauthRequired });
    });

  const runtime = createTickTickRuntime({ env, getAccessToken });

  const withReauthHint = (fn) => async (input) => {
    try {
      return await fn(input);
    } catch (error) {
      if (error instanceof ReauthRequiredError) {
        throw new Error(
          `${error.message}\nReauthorize URL: ${error.authUrl}\nThen run auth-exchange and retry.`
        );
      }
      throw error;
    }
  };

  const withTimezone = (fn) =>
    withReauthHint(async (input) => {
      const timezone = await getConfiguredTimezone(statePath);
      ensureTimezoneConfigured(timezone);
      const normalized = normalizeDateFields(input, timezone);
      return fn(normalized, timezone);
    });

  return {
    name: "ticktick",
    description: "TickTick task/project integration skill",
    actions: {
      get_timezone: async () => {
        const timezone = await getConfiguredTimezone(statePath);
        return {
          timezone: timezone ?? null,
          configured: Boolean(timezone),
          statePath,
        };
      },
      set_timezone: async (input) => {
        const timezone = input?.timezone;
        if (typeof timezone !== "string" || timezone.trim().length === 0) {
          throw new Error("timezone is required. Example: Asia/Seoul");
        }

        const state = await setConfiguredTimezone(statePath, timezone.trim());
        return {
          configured: true,
          timezone: state.timezone,
          statePath,
          updatedAtUtc: state.updatedAtUtc,
        };
      },
      create_task: withTimezone(async (input) => {
        const created = await runtime.useCases.createTask.execute(input);
        const expected = pickExpectedDateFields(input);
        await verifyTaskDatePersistence(runtime, created, expected, "create_task");
        return created;
      }),
      list_tasks: withTimezone((input) => runtime.useCases.listTasks.execute(input)),
      update_task: withTimezone(async (input) => {
        const updated = await runtime.useCases.updateTask.execute(input);
        const expected = pickExpectedDateFields(input);
        await verifyTaskDatePersistence(runtime, updated, expected, "update_task");
        return updated;
      }),
      complete_task: withTimezone((input) => runtime.useCases.completeTask.execute(input)),
      list_projects: withTimezone((input) => runtime.useCases.listProjects.execute(input)),
    },
  };
}

export default createTickTickOpenClawSkill;
