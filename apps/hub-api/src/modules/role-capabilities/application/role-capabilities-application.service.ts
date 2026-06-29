import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { Injectable } from "@nestjs/common";
import {
  collectCapabilityMentions,
  loadRoleCapabilityPacksFromDirectory,
} from "@sartre/connector-core";
import type { RoleCapabilityCatalogResponse } from "@sartre/contracts";

@Injectable()
export class RoleCapabilitiesApplicationService {
  async getCatalog(
    tenantId = "local-demo",
  ): Promise<RoleCapabilityCatalogResponse> {
    const packs = await loadRoleCapabilityPacksFromDirectory(
      resolveCapabilityPackDirectory(),
    );

    return {
      schema_version: "1.0",
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      packs,
      mentions: collectCapabilityMentions(packs),
    };
  }
}

function resolveCapabilityPackDirectory() {
  if (process.env.SARTRE_ROLE_CAPABILITY_PACK_DIR) {
    return process.env.SARTRE_ROLE_CAPABILITY_PACK_DIR;
  }

  let current = process.cwd();
  while (true) {
    const candidate = join(current, ".agents/capabilities/roles");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      return ".agents/capabilities/roles";
    }
    current = parent;
  }
}
