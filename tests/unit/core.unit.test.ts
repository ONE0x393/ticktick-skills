import { describe, expect, it, vi } from "vitest";
import { TickTickOAuth2Client } from "../../src/auth/index.js";
import { TickTickApiError, TickTickApiTimeoutError } from "../../src/api/index.js";
import { createTickTickRuntimeFromEnv, createTickTickUseCases } from "../../src/core/index.js";

describe("core module", () => {
  it("creates TickTick task payloads from domain input", async () => {
    const post = vi.fn(async (_path: string, body?: unknown) => ({
      id: "task-1",
      projectId: "proj-1",
      title: "Write docs",
      content: (body as { content?: string }).content,
      desc: (body as { desc?: string }).desc,
      status: 0,
    }));

    const useCases = createTickTickUseCases({
      get: vi.fn(),
      post,
    });

    const created = await useCases.createTask.execute({
      projectId: "proj-1",
      title: "Write docs",
      description: "Details",
      content: "Content",
      priority: 3,
    });

    expect(post).toHaveBeenCalledWith("/task", {
      projectId: "proj-1",
      title: "Write docs",
      desc: "Details",
      content: "Content",
      priority: 3,
    });
    expect(created.title).toBe("Write docs");
  });

  it("updates due date and priority through stable command flow", async () => {
    const post = vi.fn(async (_path: string, body?: unknown) => ({
      id: "task-2",
      projectId: "proj-1",
      title: "Refine plan",
      dueDate: (body as { dueDate?: string }).dueDate,
      priority: (body as { priority?: number }).priority,
      status: 0,
    }));

    const useCases = createTickTickUseCases({
      get: vi.fn(),
      post,
    });

    await useCases.updateTask.execute({
      taskId: "task-2",
      dueDate: "2026-02-20T09:00:00.000Z",
      priority: 5,
    });

    expect(post).toHaveBeenCalledWith("/task/task-2", {
      dueDate: "2026-02-20T09:00:00.000Z",
      priority: 5,
    });
  });

  it("maps API-level failures to core-level error categories", async () => {
    const rateLimitError = new TickTickApiError({
      status: 429,
      statusText: "Too Many Requests",
      retryable: true,
      body: { error: "rate_limited" },
    });

    const useCases = createTickTickUseCases({
      get: vi.fn(async () => {
        throw rateLimitError;
      }),
      post: vi.fn(async () => {
        throw new TickTickApiTimeoutError(100);
      }),
    });

    await expect(useCases.listProjects.execute()).rejects.toMatchObject({
      category: "rate_limit_429",
      retriable: true,
      status: 429,
    });

    await expect(
      useCases.createTask.execute({
        projectId: "proj-1",
        title: "A",
      })
    ).rejects.toMatchObject({
      category: "network",
      retriable: true,
    });
  });

  it("creates full runtime from env source factory", () => {
    const runtime = createTickTickRuntimeFromEnv({
      envSource: {
        TICKTICK_CLIENT_ID: "client-1",
        TICKTICK_CLIENT_SECRET: "secret-1",
        TICKTICK_REDIRECT_URI: "http://localhost:3000/oauth/callback",
        TICKTICK_USER_AGENT: "ticktick-skills-test",
      },
      getAccessToken: () => "access-token-1",
    });

    expect(runtime.oauth2Client).toBeInstanceOf(TickTickOAuth2Client);
    expect(runtime.gateway).toBeDefined();
    expect(runtime.apiClient).toBeDefined();
    expect(runtime.useCases).toBeDefined();
  });
});
