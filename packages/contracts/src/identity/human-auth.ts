import { z } from "zod";

const OpaqueSecretSchema = z
  .string()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);

const PkceVerifierSchema = z
  .string()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9._~-]+$/u);

const NormalizedEmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(320));

const PasswordSchema = z
  .string()
  .min(12)
  .max(128)
  .superRefine((value, context) => {
    if (Buffer.byteLength(value, "utf8") > 128) {
      context.addIssue({ code: "custom", message: "password_too_large" });
    }
  });

const RedirectUriSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "https:";
}, "redirect_uri_scheme_invalid");

export const FeishuAuthorizationStartCommandSchema = z
  .object({
    redirectUri: RedirectUriSchema,
    codeChallenge: OpaqueSecretSchema,
  })
  .strict();

export const FeishuAuthorizationStartResultSchema = z
  .object({
    authorizationUrl: z.url(),
    callbackExpiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const FeishuAuthorizationCallbackCommandSchema = z
  .object({
    state: OpaqueSecretSchema,
    code: z.string().min(1).max(2_048),
    codeVerifier: PkceVerifierSchema,
    redirectUri: RedirectUriSchema,
  })
  .strict();

export const EmailVerificationRequestSchema = z.object({ email: NormalizedEmailSchema }).strict();

export const EmailVerificationAcceptedSchema = z.object({ accepted: z.literal(true) }).strict();

export const CompanyEmailRegistrationCommandSchema = z
  .object({
    email: NormalizedEmailSchema,
    verificationCode: z.string().regex(/^\d{6}$/u),
    password: PasswordSchema,
    displayName: z.string().trim().min(1).max(200),
  })
  .strict();

export const CompanyEmailLoginCommandSchema = z
  .object({
    email: NormalizedEmailSchema,
    password: PasswordSchema,
  })
  .strict();

export const HumanRefreshCommandSchema = z.object({ refreshToken: OpaqueSecretSchema }).strict();

export const HumanAccessTokenClaimsSchema = z
  .object({
    iss: z.url(),
    aud: z.literal("sartre-human"),
    sub: z.uuid(),
    sid: z.uuid(),
    jti: z.uuid(),
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
  })
  .strict()
  .superRefine((claims, context) => {
    if (claims.exp <= claims.iat) {
      context.addIssue({ code: "custom", message: "token_expiry_invalid" });
    }
  });

export const HumanAuthSessionSchema = z
  .object({
    userId: z.uuid(),
    sessionId: z.uuid(),
    accessToken: z.string().regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u),
    accessExpiresAt: z.iso.datetime({ offset: true }),
    refreshToken: OpaqueSecretSchema,
  })
  .strict();

export const HumanSessionInventoryItemSchema = z
  .object({
    sessionId: z.uuid(),
    status: z.enum(["active", "revoked", "expired"]),
    current: z.boolean(),
    createdAt: z.iso.datetime({ offset: true }),
    lastActiveAt: z.iso.datetime({ offset: true }),
    idleExpiresAt: z.iso.datetime({ offset: true }),
    absoluteExpiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const HumanSessionInventorySchema = z
  .object({ sessions: z.array(HumanSessionInventoryItemSchema).max(100) })
  .strict();

export type FeishuAuthorizationStartCommand = z.infer<typeof FeishuAuthorizationStartCommandSchema>;
export type FeishuAuthorizationStartResult = z.infer<typeof FeishuAuthorizationStartResultSchema>;
export type FeishuAuthorizationCallbackCommand = z.infer<
  typeof FeishuAuthorizationCallbackCommandSchema
>;
export type EmailVerificationRequest = z.infer<typeof EmailVerificationRequestSchema>;
export type CompanyEmailRegistrationCommand = z.infer<typeof CompanyEmailRegistrationCommandSchema>;
export type CompanyEmailLoginCommand = z.infer<typeof CompanyEmailLoginCommandSchema>;
export type HumanRefreshCommand = z.infer<typeof HumanRefreshCommandSchema>;
export type HumanAccessTokenClaims = z.infer<typeof HumanAccessTokenClaimsSchema>;
export type HumanAuthSession = z.infer<typeof HumanAuthSessionSchema>;
export type HumanSessionInventoryItem = z.infer<typeof HumanSessionInventoryItemSchema>;
export type HumanSessionInventory = z.infer<typeof HumanSessionInventorySchema>;
