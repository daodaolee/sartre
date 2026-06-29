import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type RoleCapabilityPack,
  roleCapabilityPackSchema,
} from "@sartre/contracts";
import { type ConnectorProfile, defaultHubBaseUrl } from "./profiles";

export type CapabilityMentionKind =
  | "repo"
  | "skill"
  | "command"
  | "hook"
  | "constraint";

export type CapabilityMention = {
  mention: string;
  kind: CapabilityMentionKind;
  label: string;
  summary: string;
  role: RoleCapabilityPack["role"];
  packId: string;
  sourceProjectId: string;
  targetId: string;
};

export async function loadRoleCapabilityPacksFromDirectory(
  directory: URL | string,
): Promise<RoleCapabilityPack[]> {
  const directoryPath =
    directory instanceof URL ? fileURLToPath(directory) : directory;
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const packPaths = entries
    .filter((entry) => entry.isFile() && extname(entry.name) === ".json")
    .map((entry) => join(directoryPath, entry.name))
    .sort();

  const packs = await Promise.all(
    packPaths.map(async (packPath) => {
      const rawPack = JSON.parse(await readFile(packPath, "utf8"));
      return roleCapabilityPackSchema.parse(rawPack);
    }),
  );

  return packs.sort((left, right) => left.id.localeCompare(right.id));
}

export function roleCapabilityPackToConnectorProfile(
  pack: RoleCapabilityPack,
): ConnectorProfile {
  return {
    tenantId: pack.agent_endpoint.tenant_id,
    userId: pack.agent_endpoint.user_id,
    role: pack.agent_endpoint.role,
    agentEndpointId: pack.agent_endpoint.agent_endpoint_id,
    executionMode:
      pack.agent_endpoint.execution_mode === "mock" ? "mock" : "manual_confirm",
    hubBaseUrl: defaultHubBaseUrl,
    capabilitySources: pack.capability_sources,
    executor: pack.agent_endpoint.executor,
    approvalPolicy: pack.agent_endpoint.approval_policy,
  };
}

export function collectCapabilityMentions(
  packs: RoleCapabilityPack[],
): CapabilityMention[] {
  const mentions = packs.flatMap((pack) => [
    createMention(pack, {
      mention: `@repo.${pack.source_project.id}`,
      kind: "repo",
      label: pack.source_project.label,
      summary: pack.summary,
      targetId: pack.source_project.id,
    }),
    ...pack.capability_sources.map((source) =>
      createMention(pack, {
        mention: `@${roleMentionPrefix(pack)}.${mentionSlugFromCapabilitySource(source)}`,
        kind: source.type === "skill" ? "skill" : "hook",
        label: source.name,
        summary: source.summary,
        targetId: source.id,
      }),
    ),
    ...pack.commands.map((command) =>
      createMention(pack, {
        mention: `@${roleMentionPrefix(pack)}.${command.slug}`,
        kind: "command",
        label: command.label,
        summary: command.summary,
        targetId: command.id,
      }),
    ),
    ...pack.hooks.map((hook) =>
      createMention(pack, {
        mention: `@${roleMentionPrefix(pack)}.${hook.slug}`,
        kind: "hook",
        label: hook.label,
        summary: hook.summary,
        targetId: hook.id,
      }),
    ),
    ...pack.constraints.map((constraint) =>
      createMention(pack, {
        mention: `@${roleMentionPrefix(pack)}.${constraint.slug}`,
        kind: "constraint",
        label: constraint.label,
        summary: constraint.summary,
        targetId: constraint.id,
      }),
    ),
  ]);

  return dedupeMentions(mentions).sort((left, right) =>
    left.mention.localeCompare(right.mention),
  );
}

function createMention(
  pack: RoleCapabilityPack,
  input: Omit<CapabilityMention, "packId" | "role" | "sourceProjectId">,
): CapabilityMention {
  return {
    ...input,
    role: pack.role,
    packId: pack.id,
    sourceProjectId: pack.source_project.id,
  };
}

function roleMentionPrefix(pack: RoleCapabilityPack): string {
  if (pack.metadata?.mention_prefix) {
    return pack.metadata.mention_prefix;
  }

  switch (pack.source_project.kind) {
    case "qa_automation":
      return "qa";
    case "frontend_app":
      return "dev.frontend";
    case "bff_service":
      return "dev.bff";
    case "admin_console":
      return "dev.vcm";
    default:
      return pack.role;
  }
}

function mentionSlugFromCapabilitySource(
  source: RoleCapabilityPack["capability_sources"][number],
): string {
  if (source.metadata?.mention_slug) {
    return source.metadata.mention_slug;
  }

  return source.id
    .replace(/^(qa|dev|frontend|bff|vcm)_skill_/, "")
    .replace(/^(qa|dev|frontend|bff|vcm)_hook_/, "")
    .replaceAll("_", "-");
}

function dedupeMentions(mentions: CapabilityMention[]): CapabilityMention[] {
  const byMention = new Map<string, CapabilityMention>();

  for (const mention of mentions) {
    if (!byMention.has(mention.mention)) {
      byMention.set(mention.mention, mention);
    }
  }

  return [...byMention.values()];
}
