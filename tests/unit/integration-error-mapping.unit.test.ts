import { describe, expect, it, vi } from "vitest";

import { createTickTickUseCases } from "../../src/core/ticktick-usecases.js";
import { TickTickApiError, TickTickApiTimeoutError } from "../../src/api/ticktick-api-client.js";

describe("integration error mapping (usecases <- gateway/api)", () => {
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
