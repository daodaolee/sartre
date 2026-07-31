import { z } from "zod";

const StableActorIdentifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u);

export const HumanActorSchema = z
  .object({
    actorType: z.literal("human"),
    actorId: z.uuid(),
    userId: z.uuid(),
    sessionId: z.uuid(),
    workspaceId: z.uuid().nullable(),
    initiatedByUserId: z.uuid(),
  })
  .strict()
  .superRefine((actor, context) => {
    if (actor.actorId !== actor.userId || actor.initiatedByUserId !== actor.userId) {
      context.addIssue({ code: "custom", message: "human_actor_chain_mismatch" });
    }
  });

export const EndpointActorSchema = z
  .object({
    actorType: z.literal("endpoint"),
    actorId: z.uuid(),
    endpointId: z.uuid(),
    workspaceId: z.uuid(),
    initiatedByUserId: z.uuid().nullable(),
  })
  .strict()
  .superRefine((actor, context) => {
    if (actor.actorId !== actor.endpointId) {
      context.addIssue({ code: "custom", message: "endpoint_actor_chain_mismatch" });
    }
  });

export const SystemActorSchema = z
  .object({
    actorType: z.literal("system"),
    actorId: StableActorIdentifierSchema,
    workspaceId: z.uuid().nullable(),
    initiatedByUserId: z.uuid().nullable(),
  })
  .strict();

export const ActorSchema = z.union([HumanActorSchema, EndpointActorSchema, SystemActorSchema]);

export type HumanActor = z.infer<typeof HumanActorSchema>;
export type EndpointActor = z.infer<typeof EndpointActorSchema>;
export type SystemActor = z.infer<typeof SystemActorSchema>;
export type Actor = z.infer<typeof ActorSchema>;
