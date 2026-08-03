import { z } from "zod";

export const AuthProviderSchema = z.literal("company_email");

const CompanyEmailAuthIdentityRegistrationSchema = z
  .object({
    provider: z.literal("company_email"),
    email: z.email(),
    emailVerified: z.literal(true),
  })
  .strict();

export const AuthIdentityRegistrationSchema = CompanyEmailAuthIdentityRegistrationSchema;

export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type AuthIdentityRegistration = z.infer<typeof AuthIdentityRegistrationSchema>;
