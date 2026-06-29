import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";

type ErrorCategory =
  | "InvalidInput"
  | "Unavailable"
  | "Timeout"
  | "Unsupported"
  | "NeedUserAction"
  | "Internal";

@Catch()
export class HandoffHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{
      status: (status: number) => {
        json: (body: unknown) => void;
      };
    }>();
    const mapped = mapException(exception);

    response.status(mapped.status).json({
      schema_version: "1.0",
      error: {
        category: mapped.category,
        message: mapped.message,
      },
    });
  }
}

function mapException(exception: unknown): {
  status: number;
  category: ErrorCategory;
  message: string;
} {
  if (isCategorizedError(exception, "InvalidInput")) {
    return {
      status: HttpStatus.BAD_REQUEST,
      category: "InvalidInput",
      message: exception.message,
    };
  }

  if (isZodErrorLike(exception)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      category: "InvalidInput",
      message: exception.message,
    };
  }

  if (exception instanceof Error && /is unavailable/i.test(exception.message)) {
    return {
      status: HttpStatus.NOT_FOUND,
      category: "Unavailable",
      message: exception.message,
    };
  }

  if (isHttpExceptionLike(exception)) {
    return {
      status: exception.getStatus(),
      category: exception.getStatus() === 404 ? "Unavailable" : "InvalidInput",
      message: exception.message,
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    category: "Internal",
    message: exception instanceof Error ? exception.message : "Internal error",
  };
}

function isZodErrorLike(exception: unknown): exception is Error & {
  issues: unknown[];
} {
  return (
    exception instanceof Error &&
    "issues" in exception &&
    Array.isArray(exception.issues)
  );
}

function isCategorizedError(
  exception: unknown,
  category: ErrorCategory,
): exception is Error & { category: ErrorCategory } {
  return (
    exception instanceof Error &&
    "category" in exception &&
    exception.category === category
  );
}

function isHttpExceptionLike(exception: unknown): exception is Error & {
  getStatus: () => number;
} {
  return (
    exception instanceof Error &&
    "getStatus" in exception &&
    typeof exception.getStatus === "function"
  );
}
