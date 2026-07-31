import { requireDomain } from "../errors.js";

export type AuthProvider = "company_email" | "feishu";

export type AuthIdentity = {
  readonly identityId: string;
  readonly userId: string;
  readonly provider: AuthProvider;
  readonly providerSubject: string;
  readonly providerTenantId: string | null;
  readonly verifiedEmail: string | null;
  readonly version: number;
};

export type AuthIdentityPolicy = {
  readonly approvedFeishuTenantIds: readonly string[];
  readonly approvedEmailDomains: readonly string[];
};

export type CreateAuthIdentityInput =
  | {
      readonly identityId: string;
      readonly userId: string;
      readonly kind: "feishu";
      readonly subject: string;
      readonly tenantId: string;
    }
  | {
      readonly identityId: string;
      readonly userId: string;
      readonly kind: "company_email";
      readonly email: string;
      readonly emailVerified: boolean;
    };

function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  const separator = normalized.lastIndexOf("@");
  requireDomain(
    separator > 0 && separator < normalized.length - 1,
    "invariant_failed",
    "invalid_email",
  );
  return normalized;
}

function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}

export function createAuthIdentity(
  input: CreateAuthIdentityInput,
  policy: AuthIdentityPolicy,
  existing: readonly AuthIdentity[],
): AuthIdentity {
  requireDomain(
    input.identityId.length > 0 && input.userId.length > 0,
    "invariant_failed",
    "id_required",
  );

  let candidate: AuthIdentity;
  if (input.kind === "feishu") {
    const subject = input.subject.trim();
    const tenantId = input.tenantId.trim();
    requireDomain(
      subject.length > 0 && tenantId.length > 0,
      "invariant_failed",
      "provider_identity_required",
    );
    requireDomain(
      policy.approvedFeishuTenantIds.includes(tenantId),
      "forbidden",
      "provider_tenant_not_approved",
    );
    candidate = {
      identityId: input.identityId,
      userId: input.userId,
      provider: "feishu",
      providerSubject: subject,
      providerTenantId: tenantId,
      verifiedEmail: null,
      version: 0,
    };
  } else {
    const email = normalizeEmail(input.email);
    requireDomain(input.emailVerified, "forbidden", "email_not_verified");
    requireDomain(
      policy.approvedEmailDomains
        .map((domain) => domain.toLowerCase())
        .includes(emailDomain(email)),
      "forbidden",
      "email_domain_not_approved",
    );
    candidate = {
      identityId: input.identityId,
      userId: input.userId,
      provider: "company_email",
      providerSubject: email,
      providerTenantId: null,
      verifiedEmail: email,
      version: 0,
    };
  }

  requireDomain(
    !existing.some(
      (identity) =>
        identity.provider === candidate.provider &&
        identity.providerSubject === candidate.providerSubject,
    ),
    "state_conflict",
    "auth_identity_already_exists",
  );
  return candidate;
}
