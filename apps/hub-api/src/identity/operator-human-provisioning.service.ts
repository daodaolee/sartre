import { randomUUID } from "node:crypto";

import {
  CompanyEmailProvisioningCommandSchema,
  type CompanyEmailProvisioningCommand,
} from "@sartre/contracts";

import type { PasswordHasherPort } from "./argon2id-password-hasher.js";
import type { ClockPort } from "./ports.js";
import type { PostgresHumanAuthRepository } from "./postgres-human-auth.repository.js";

export type HumanProvisioningResult =
  | { readonly outcome: "created"; readonly userId: string }
  | { readonly outcome: "already_exists" }
  | { readonly outcome: "domain_not_approved" };

export class OperatorHumanProvisioningService {
  constructor(
    private readonly options: {
      readonly repository: PostgresHumanAuthRepository;
      readonly passwordHasher: PasswordHasherPort;
      readonly clock: ClockPort;
      readonly approvedEmailDomains: readonly string[];
    },
  ) {}

  async provisionCompanyEmail(
    command: CompanyEmailProvisioningCommand,
  ): Promise<HumanProvisioningResult> {
    const parsed = CompanyEmailProvisioningCommandSchema.parse(command);
    const domain = parsed.email.slice(parsed.email.lastIndexOf("@") + 1);
    if (!this.options.approvedEmailDomains.includes(domain)) {
      return { outcome: "domain_not_approved" };
    }

    const userId = randomUUID();
    const created = await this.options.repository.createCompanyEmailIdentity({
      userId,
      identityId: randomUUID(),
      email: parsed.email,
      displayName: parsed.displayName,
      passwordHash: await this.options.passwordHasher.hash(parsed.password),
      now: this.options.clock.now(),
    });
    return created ? { outcome: "created", userId } : { outcome: "already_exists" };
  }
}
