import { z } from "zod";

const Opaque256BitSecretSchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]{43}$/u);

const VersionedCommandSchema = {
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.uuid(),
} as const;

export const EndpointPairingIntentCreateCommandSchema = z
  .object({
    pairingIntentId: z.uuid(),
    challenge: Opaque256BitSecretSchema,
    idempotencyKey: z.uuid(),
  })
  .strict();

export const EndpointPairingIntentSummarySchema = z
  .object({
    workspaceId: z.uuid(),
    pairingIntentId: z.uuid(),
    status: z.literal("pending"),
    expiresAt: z.iso.datetime({ offset: true }),
    version: z.number().int().nonnegative(),
  })
  .strict();

export const EndpointPairingCompleteCommandSchema = z
  .object({
    pairingIntentId: z.uuid(),
    challenge: Opaque256BitSecretSchema,
    endpointId: z.uuid(),
    credential: Opaque256BitSecretSchema,
  })
  .strict();

export const EndpointPairingResultSchema = z
  .object({
    workspaceId: z.uuid(),
    endpointId: z.uuid(),
    credential: Opaque256BitSecretSchema,
    version: z.number().int().nonnegative(),
  })
  .strict();

export const EndpointCredentialExchangeCommandSchema = z
  .object({
    endpointId: z.uuid(),
    credential: Opaque256BitSecretSchema,
  })
  .strict();

export const EndpointAccessTokenClaimsSchema = z
  .object({
    iss: z.url().startsWith("https://"),
    aud: z.literal("sartre-endpoint"),
    sub: z.uuid(),
    wid: z.uuid(),
    uid: z.uuid(),
    ver: z.number().int().nonnegative(),
    jti: z.uuid(),
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
  })
  .strict()
  .refine((claims) => claims.exp > claims.iat, { message: "endpoint_token_expiry_invalid" });

export const EndpointAuthSessionSchema = z
  .object({
    endpointId: z.uuid(),
    workspaceId: z.uuid(),
    accessToken: z.string().min(1).max(8_192),
    accessExpiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const EndpointCredentialRotateCommandSchema = z
  .object({
    endpointId: z.uuid(),
    replacementCredential: Opaque256BitSecretSchema,
    ...VersionedCommandSchema,
  })
  .strict();

export const EndpointRevokeCommandSchema = z
  .object({
    endpointId: z.uuid(),
    ...VersionedCommandSchema,
  })
  .strict();

export const EndpointSummarySchema = z
  .object({
    endpointId: z.uuid(),
    workspaceId: z.uuid(),
    status: z.enum(["active", "revoked"]),
    version: z.number().int().nonnegative(),
  })
  .strict();

export type EndpointPairingIntentCreateCommand = z.infer<
  typeof EndpointPairingIntentCreateCommandSchema
>;
export type EndpointPairingIntentSummary = z.infer<typeof EndpointPairingIntentSummarySchema>;
export type EndpointPairingCompleteCommand = z.infer<typeof EndpointPairingCompleteCommandSchema>;
export type EndpointPairingResult = z.infer<typeof EndpointPairingResultSchema>;
export type EndpointCredentialExchangeCommand = z.infer<
  typeof EndpointCredentialExchangeCommandSchema
>;
export type EndpointAccessTokenClaims = z.infer<typeof EndpointAccessTokenClaimsSchema>;
export type EndpointAuthSession = z.infer<typeof EndpointAuthSessionSchema>;
export type EndpointCredentialRotateCommand = z.infer<typeof EndpointCredentialRotateCommandSchema>;
export type EndpointRevokeCommand = z.infer<typeof EndpointRevokeCommandSchema>;
export type EndpointSummary = z.infer<typeof EndpointSummarySchema>;
