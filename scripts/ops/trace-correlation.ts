import { pathToFileURL } from "node:url";

import {
  createDiagnosticsClient,
  DiagnosticsClientError,
  type DiagnosticTimeline,
} from "../../packages/sdk/src/index.js";

export interface TraceCorrelationCliOptions {
  readonly argv: readonly string[];
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

function parseArguments(argv: readonly string[]): string {
  if (
    argv.length !== 3 ||
    argv[0] !== "--self-test" ||
    argv[1] !== "--correlation-id" ||
    !argv[2]
  ) {
    throw new Error("validation_failed");
  }
  return argv[2];
}

function cliOutput(timeline: DiagnosticTimeline): string {
  return JSON.stringify({
    correlationId: timeline.correlationId,
    lastSuccessfulStage: timeline.lastSuccessfulStage,
    firstFailedStage: timeline.firstFailedStage,
    currentState: timeline.currentState,
    suggestedRecoveryAction: timeline.suggestedRecoveryAction,
    stages: timeline.timelineItems.map((item) => ({
      sequence: item.sequence,
      stage: item.context.stage,
      status: item.context.status,
      errorCode: item.context.errorCode,
    })),
  });
}

export async function runTraceCorrelationCli(options: TraceCorrelationCliOptions): Promise<number> {
  try {
    const correlationId = parseArguments(options.argv);
    const hubBaseUrl = options.environment.SARTRE_HUB_BASE_URL;
    const token = options.environment.SARTRE_MS0_SELF_TEST_TOKEN;
    if (!hubBaseUrl || !token) throw new Error("validation_failed");
    const timeline = await createDiagnosticsClient({
      hubBaseUrl,
      ms0SelfTestToken: token,
      timeoutMs: 5_000,
    }).readCorrelation(correlationId);
    options.stdout(cliOutput(timeline));
    return timeline.currentState === "completed" ? 0 : 1;
  } catch (error) {
    options.stderr(error instanceof DiagnosticsClientError ? error.code : "validation_failed");
    return 1;
  }
}

const executedPath = process.argv[1];
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  process.exitCode = await runTraceCorrelationCli({
    argv: process.argv.slice(2),
    environment: process.env,
    stdout: (line) => console.info(line),
    stderr: (line) => console.error(line),
  });
}
