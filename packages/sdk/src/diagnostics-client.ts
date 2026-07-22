import {
  DiagnosticProbeRequestSchema,
  DiagnosticTimelineSchema,
  type DiagnosticProbeRequest,
  type DiagnosticTimeline,
  type ErrorCode,
} from "@sartre/contracts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DiagnosticsClient {
  submitProbe(request: DiagnosticProbeRequest): Promise<DiagnosticTimeline>;
  readCorrelation(correlationId: string): Promise<DiagnosticTimeline>;
}

export interface DiagnosticsClientOptions {
  readonly hubBaseUrl: string;
  readonly ms0SelfTestToken: string;
  readonly timeoutMs: number;
}

export class DiagnosticsClientError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = "DiagnosticsClientError";
  }
}

function normalizedLoopbackBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new DiagnosticsClientError("validation_failed", 400);
  }
  return parsed.origin;
}

async function errorCodeForResponse(response: Response): Promise<ErrorCode> {
  const status = response.status;
  if (status === 404) return "resource_not_found";
  if (status === 400) return "validation_failed";
  if (status === 503) {
    try {
      const body = (await response.json()) as { code?: unknown };
      return body.code === "degraded" ? "degraded" : "dependency_unavailable";
    } catch {
      return "dependency_unavailable";
    }
  }
  return "degraded";
}

export function createDiagnosticsClient(options: DiagnosticsClientOptions): DiagnosticsClient {
  const hubBaseUrl = normalizedLoopbackBaseUrl(options.hubBaseUrl);
  if (!/^[0-9a-f]{64}$/.test(options.ms0SelfTestToken)) {
    throw new DiagnosticsClientError("validation_failed", 400);
  }
  if (
    !Number.isInteger(options.timeoutMs) ||
    options.timeoutMs < 50 ||
    options.timeoutMs > 30_000
  ) {
    throw new DiagnosticsClientError("validation_failed", 400);
  }

  const request = async (path: string, init?: RequestInit): Promise<DiagnosticTimeline> => {
    let response: Response;
    try {
      response = await fetch(`${hubBaseUrl}${path}`, {
        ...init,
        headers: {
          "x-sartre-ms0-session": options.ms0SelfTestToken,
          ...(init?.body ? { "content-type": "application/json" } : {}),
        },
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch {
      throw new DiagnosticsClientError("dependency_unavailable", 503);
    }
    if (response.status !== 200) {
      throw new DiagnosticsClientError(await errorCodeForResponse(response), response.status);
    }
    try {
      return DiagnosticTimelineSchema.parse(await response.json());
    } catch {
      throw new DiagnosticsClientError("degraded", 503);
    }
  };

  return {
    submitProbe: async (input) => {
      const parsed = DiagnosticProbeRequestSchema.parse(input);
      return request("/__ms0/self-test/diagnostics/probes", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
    },
    readCorrelation: async (correlationId) => {
      if (!UUID.test(correlationId)) {
        throw new DiagnosticsClientError("validation_failed", 400);
      }
      return request(`/__ms0/self-test/diagnostics/correlations/${correlationId}`);
    },
  };
}
