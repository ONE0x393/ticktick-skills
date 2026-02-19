import { describe, expect, it, vi } from "vitest";

import { createTickTickUseCases } from "../../src/core/ticktick-usecases.js";
import { TickTickApiError, TickTickApiTimeoutError } from "../../src/api/ticktick-api-client.js";

describe("integration error mapping (usecases <- gateway/api)", () => {
  it("maps 401 api error to auth_401 domain error", async () => {
    const gateway = {
      listProjects: vi.fn(async () => {
        throw new TickTickApiError({
          status: 401,
          statusText: "Unauthorized",
          retryable: false,
          body: { message: "invalid token" },
        });
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(useCases.listProjects.execute()).rejects.toMatchObject({
      category: "auth_401",
      retriable: false,
      status: 401,
      responseBody: { message: "invalid token" },
    });
  });

  it("maps 403 api error to auth_403 domain error", async () => {
    const gateway = {
      updateTask: vi.fn(async () => {
        throw new TickTickApiError({
          status: 403,
          statusText: "Forbidden",
          retryable: false,
          body: { message: "insufficient_scope" },
        });
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(
      useCases.updateTask.execute({
        taskId: "task-403",
        priority: 1,
      })
    ).rejects.toMatchObject({
      category: "auth_403",
      retriable: false,
      status: 403,
      responseBody: { message: "insufficient_scope" },
    });
  });

  it("maps 404 api error to not_found_404 domain error", async () => {
    const gateway = {
      completeTask: vi.fn(async () => {
        throw new TickTickApiError({
          status: 404,
          statusText: "Not Found",
          retryable: false,
          body: { message: "task not found" },
        });
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(
      useCases.completeTask.execute({
        taskId: "task-missing",
      })
    ).rejects.toMatchObject({
      category: "not_found_404",
      retriable: false,
      status: 404,
      responseBody: { message: "task not found" },
    });
  });

  it("maps 429 api error to retriable rate_limit_429 domain error", async () => {
    const gateway = {
      listTasks: vi.fn(async () => {
        throw new TickTickApiError({
          status: 429,
          statusText: "Too Many Requests",
          retryable: true,
          body: { message: "rate limited" },
        });
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(useCases.listTasks.execute()).rejects.toMatchObject({
      category: "rate_limit_429",
      retriable: true,
      status: 429,
      responseBody: { message: "rate limited" },
    });
  });

  it("maps 5xx api error to retriable server_5xx domain error", async () => {
    const gateway = {
      createTask: vi.fn(async () => {
        throw new TickTickApiError({
          status: 502,
          statusText: "Bad Gateway",
          retryable: true,
          body: { message: "upstream failed" },
        });
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(
      useCases.createTask.execute({
        projectId: "project-5xx",
        title: "create-5xx",
      })
    ).rejects.toMatchObject({
      category: "server_5xx",
      retriable: true,
      status: 502,
      responseBody: { message: "upstream failed" },
    });
  });

  it("maps timeout errors to retriable network domain error", async () => {
    const gateway = {
      createTask: vi.fn(async () => {
        throw new TickTickApiTimeoutError(5000);
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(
      useCases.createTask.execute({
        projectId: "project-1",
        title: "hello",
      })
    ).rejects.toMatchObject({
      category: "network",
      retriable: true,
    });
  });

  it("maps unknown thrown values to unknown non-retriable domain error", async () => {
    const gateway = {
      completeTask: vi.fn(async () => {
        throw "unexpected-string-error";
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(
      useCases.completeTask.execute({
        taskId: "task-1",
      })
    ).rejects.toMatchObject({
      category: "unknown",
      retriable: false,
    });
  });
});
