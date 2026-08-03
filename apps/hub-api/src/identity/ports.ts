export interface ClockPort {
  now(): Date;
}

export interface VerificationMailPort {
  sendVerificationCode(input: { email: string; code: string; expiresAt: string }): Promise<void>;
}
