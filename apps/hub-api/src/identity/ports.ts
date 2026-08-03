export interface ClockPort {
  now(): Date;
}

export type FeishuOAuthErrorKind = "callback_rejected" | "dependency_unavailable";

export class FeishuOAuthError extends Error {
  constructor(readonly kind: FeishuOAuthErrorKind) {
    super(kind);
    this.name = "FeishuOAuthError";
  }
}

export interface FeishuOAuthPort {
  createAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): Promise<string>;
  exchangeCode(input: { code: string; codeVerifier: string; redirectUri: string }): Promise<{
    subject: string;
    tenantId: string;
    displayName: string;
  }>;
}

export interface VerificationMailPort {
  sendVerificationCode(input: { email: string; code: string; expiresAt: string }): Promise<void>;
}
