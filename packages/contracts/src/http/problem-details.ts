import { z } from "zod";
import { ErrorCodeSchema } from "../error-catalog.js";

const ProblemDetailsBase = z.object({
  type: z.string().min(1).max(256),
  title: z.string().min(1).max(128),
  requestId: z.uuid(),
  correlationId: z.uuid(),
});

export const ProblemDetailsSchema = ProblemDetailsBase.extend({
  status: z.number().int().min(400).max(599),
  code: ErrorCodeSchema,
  message: z.string().min(1).max(256),
}).strict();

const ForbiddenProblemSchema = ProblemDetailsBase.extend({
  status: z.literal(403),
  code: z.literal("forbidden"),
  message: z.literal("Access denied"),
}).strict();

const ResourceNotFoundProblemSchema = ProblemDetailsBase.extend({
  status: z.literal(404),
  code: z.literal("resource_not_found"),
  message: z.literal("Access denied"),
}).strict();

const ProjectAccessDeniedProblemSchema = ProblemDetailsBase.extend({
  status: z.literal(403),
  code: z.literal("project_access_denied"),
  message: z.literal("Access denied"),
}).strict();

export const NonDisclosingAuthorizationProblemSchema = z.union([
  ForbiddenProblemSchema,
  ProjectAccessDeniedProblemSchema,
  ResourceNotFoundProblemSchema,
]);

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
export type NonDisclosingAuthorizationProblem = z.infer<
  typeof NonDisclosingAuthorizationProblemSchema
>;
