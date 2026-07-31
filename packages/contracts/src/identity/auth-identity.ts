import { z } from "zod";

const ProviderIdentifierSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:@+-]*$/u);

export const AuthProviderSchema = z.enum(["feishu", "company_email"]);

const FeishuAuthIdentityRegistrationSchema = z
  .object({
    provider: z.literal("feishu"),
    providerSubject: ProviderIdentifierSchema,
    providerTenantId: ProviderIdentifierSchema,
  })
  .strict();

const CompanyEmailAuthIdentityRegistrationSchema = z
  .object({
    provider: z.literal("company_email"),
    email: z.email(),
    emailVerified: z.literal(true),
  })
  .strict();

export const AuthIdentityRegistrationSchema = z.discriminatedUnion("provider", [
  FeishuAuthIdentityRegistrationSchema,
  CompanyEmailAuthIdentityRegistrationSchema,
]);

export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type AuthIdentityRegistration = z.infer<typeof AuthIdentityRegistrationSchema>;
