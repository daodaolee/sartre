import { z } from "zod";
import { ErrorCodeSchema, type ErrorCode } from "./error-catalog.js";

const ResultErrorSchema = z
  .object({
    code: ErrorCodeSchema,
    message: z.string().min(1),
    details: z.unknown().optional(),
  })
  .strict();

export function createResultSchema<TSchema extends z.ZodType>(dataSchema: TSchema) {
  return z.discriminatedUnion("success", [
    z.object({ success: z.literal(true), data: dataSchema }).strict(),
    z.object({ success: z.literal(false), error: ResultErrorSchema }).strict(),
  ]);
}

export type Result<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: ErrorCode;
        message: string;
        details?: unknown;
      };
    };
