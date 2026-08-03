import { Argon2idPasswordHasher } from "../../apps/hub-api/src/identity/argon2id-password-hasher.js";
import { OperatorHumanProvisioningService } from "../../apps/hub-api/src/identity/operator-human-provisioning.service.js";
import { PostgresHumanAuthRepository } from "../../apps/hub-api/src/identity/postgres-human-auth.repository.js";

function argument(name: string): string | undefined {
  const position = process.argv.indexOf(name);
  const value = position >= 0 ? process.argv[position + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function configuration(): {
  readonly databaseUrl: string;
  readonly email: string;
  readonly displayName: string;
  readonly approvedEmailDomains: readonly string[];
} {
  const databaseUrl = process.env.SARTRE_DATABASE_URL;
  const email = argument("--email");
  const displayName = argument("--display-name");
  const approvedEmailDomains = (process.env.SARTRE_AUTH_APPROVED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  if (!databaseUrl || !email || !displayName || approvedEmailDomains.length === 0) {
    throw new Error("provisioning_configuration_invalid");
  }
  return { databaseUrl, email, displayName, approvedEmailDomains };
}

async function passwordFromStandardInput(): Promise<string> {
  process.stdin.setEncoding("utf8");
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input, "utf8") > 130) {
      throw new Error("provisioning_password_input_invalid");
    }
  }
  return input.replace(/\r?\n$/u, "");
}

async function run(): Promise<void> {
  let phase = "configuration";
  let repository: PostgresHumanAuthRepository | undefined;
  try {
    const config = configuration();
    phase = "password_input";
    const password = await passwordFromStandardInput();
    phase = "repository";
    repository = new PostgresHumanAuthRepository(config.databaseUrl);
    phase = "provisioning";
    const service = new OperatorHumanProvisioningService({
      repository,
      passwordHasher: new Argon2idPasswordHasher(),
      clock: { now: () => new Date() },
      approvedEmailDomains: config.approvedEmailDomains,
    });
    const result = await service.provisionCompanyEmail({
      email: config.email,
      displayName: config.displayName,
      password,
    });
    if (result.outcome !== "created") {
      throw new Error(`provisioning_${result.outcome}`);
    }
    process.stdout.write(`${JSON.stringify({ outcome: result.outcome, userId: result.userId })}\n`);
  } catch (error) {
    if (error instanceof Error && /^provisioning_[a-z_]+$/u.test(error.message)) throw error;
    throw new Error(`provisioning_${phase}_failed`, { cause: error });
  } finally {
    await repository?.close();
  }
}

run().catch((error: unknown) => {
  const code =
    error instanceof Error && /^provisioning_[a-z_]+$/u.test(error.message)
      ? error.message
      : error instanceof Error && error.name === "ZodError"
        ? "provisioning_validation_failed"
        : typeof error === "object" &&
            error !== null &&
            "code" in error &&
            /^[0-9A-Z]{5}$/u.test(String(error.code))
          ? `provisioning_database_failed_${String(error.code)}`
          : "provisioning_dependency_failed";
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
});
