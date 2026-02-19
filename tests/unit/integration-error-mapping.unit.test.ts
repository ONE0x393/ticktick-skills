import { describe, expect, it, vi } from "vitest";

import { createTickTickUseCases } from "../../src/core/ticktick-usecases.js";
import { createTickTickGateway } from "../../src/api/ticktick-gateway.js";
import { TickTickApiClient, TickTickApiError, TickTickApiTimeoutError } from "../../src/api/ticktick-api-client.js";

interface MockResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: { get(name: string): string | null };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

function createMockResponse(params: {
  ok: boolean;
  status: number;
  statusText?: string;
  body?: unknown;
  contentType?: string;
  retryAfter?: string;
}): MockResponse {
  const contentType = params.contentType ?? "application/json";
  return {
    ok: params.ok,
    status: params.status,
    statusText: params.statusText ?? "",
    headers: {
      get(name: string) {
        const key = name.toLowerCase();
        if (key === "content-type") {
          return contentType;
        }
        if (key === "retry-after") {
          return params.retryAfter ?? null;
        }
        return null;
      },
    },
    async json() {
      return params.body;
    },
    async text() {
      if (typeof params.body === "string") {
        return params.body;
      }
      return params.body === undefined ? "" : JSON.stringify(params.body);
    },
  };
}

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

  it("recovers after retryable 5xx at api client layer via gateway->usecase path", async () => {
    const fetchMock = vi
      .fn<
        (url: string, init: { headers: Record<string, string> }) => Promise<MockResponse>
      >()
      .mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 502,
          statusText: "Bad Gateway",
          body: { error: "upstream" },
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: [{ id: "proj-1", name: "Inbox", closed: false }],
        })
      );

    const apiClient = new TickTickApiClient({
      baseUrl: "https://api.ticktick.com/open/v1",
      getAccessToken: () => "token-123",
      fetchImplementation: fetchMock,
      maxRetries: 2,
      retryBaseDelayMs: 1,
      timeoutMs: 500,
    });
    const gateway = createTickTickGateway(apiClient);
    const useCases = createTickTickUseCases(gateway);

    await expect(useCases.listProjects.execute()).resolves.toEqual([
      { id: "proj-1", name: "Inbox", closed: false },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it("maps network-like Error (e.g., ECONNRESET) to retriable network domain error", async () => {
    const gateway = {
      listTasks: vi.fn(async () => {
        const error = new Error("socket hang up ECONNRESET");
        error.name = "FetchError";
        throw error;
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(useCases.listTasks.execute()).rejects.toMatchObject({
      category: "network",
      retriable: true,
    });
  });

  it("maps rejected fetch TypeError to retriable network domain error", async () => {
    const gateway = {
      listProjects: vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    } as any;

    const useCases = createTickTickUseCases(gateway);

    await expect(useCases.listProjects.execute()).rejects.toMatchObject({
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
