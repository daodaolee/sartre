import type {
  ConversationReference,
  RoleCapabilityMention,
} from "@sartre/contracts";

export type AttachmentReferenceInput = {
  id: string;
  name: string;
  kind: string;
};

export type BuildTaskConversationReferencesInput = {
  handoffId?: string;
  deliveryId?: string;
  attachments?: AttachmentReferenceInput[];
  capabilityReferences?: RoleCapabilityMention[];
};

export type RenderCapabilityContextInput = {
  title: string;
  content: string;
  authorEndpointId: string;
  targetEndpointId: string;
  references: ConversationReference[];
};

export function buildTaskConversationReferences(
  input: BuildTaskConversationReferencesInput,
): ConversationReference[] {
  const references: ConversationReference[] = [];

  if (input.handoffId) {
    references.push({
      id: `reference_handoff_${toStableToken(input.handoffId)}`,
      type: "handoff",
      target_id: input.handoffId,
      label: input.handoffId,
    });
  }

  if (input.deliveryId) {
    references.push({
      id: `reference_delivery_${toStableToken(input.deliveryId)}`,
      type: "delivery",
      target_id: input.deliveryId,
      label: input.deliveryId,
    });
  }

  for (const attachment of input.attachments ?? []) {
    references.push({
      id: `reference_artifact_${toStableToken(attachment.id)}`,
      type: "artifact",
      target_id: attachment.id,
      label: attachment.name,
      metadata: {
        kind: attachment.kind,
      },
    });
  }

  for (const capability of input.capabilityReferences ?? []) {
    references.push(toCapabilityConversationReference(capability));
  }

  return dedupeReferences(references);
}

export function toCapabilityConversationReference(
  reference: RoleCapabilityMention,
): ConversationReference {
  return {
    id: `reference_capability_${toStableToken(
      `${reference.packId}-${reference.targetId}`,
    )}`,
    type: "capability",
    target_id: reference.targetId,
    label: reference.mention,
    metadata: {
      mention: reference.mention,
      kind: reference.kind,
      label: reference.label,
      pack_id: reference.packId,
      source_project_id: reference.sourceProjectId,
      role: reference.role,
    },
  };
}

export function collectReferenceIds(
  references: ConversationReference[],
): string[] {
  return Array.from(
    new Set(references.map((reference) => reference.target_id)),
  );
}

export function renderCapabilityContextBlock(
  input: RenderCapabilityContextInput,
): string {
  const capabilityReferences = input.references.filter(
    (reference) => reference.type === "capability",
  );
  const artifactReferences = input.references.filter(
    (reference) => reference.type === "artifact",
  );

  const lines = [
    `# ${input.title}`,
    "",
    `Author Endpoint: ${input.authorEndpointId}`,
    `Target Endpoint: ${input.targetEndpointId}`,
    "",
    "## Message",
    input.content,
  ];

  if (capabilityReferences.length > 0) {
    lines.push("", "## Capability References");
    for (const reference of capabilityReferences) {
      const metadata = reference.metadata ?? {};
      lines.push(
        `- ${reference.label ?? reference.target_id}: ${metadata.label ?? reference.target_id}`,
      );
      if (metadata.kind || metadata.source_project_id || metadata.pack_id) {
        lines.push(
          `  kind=${metadata.kind ?? "unknown"} source=${metadata.source_project_id ?? "unknown"} pack=${metadata.pack_id ?? "unknown"}`,
        );
      }
    }
  }

  if (artifactReferences.length > 0) {
    lines.push("", "## Artifacts");
    for (const reference of artifactReferences) {
      lines.push(`- ${reference.label ?? reference.target_id}`);
    }
  }

  return lines.join("\n");
}

function dedupeReferences(
  references: ConversationReference[],
): ConversationReference[] {
  const seen = new Set<string>();
  const deduped: ConversationReference[] = [];

  for (const reference of references) {
    const key = `${reference.type}:${reference.target_id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(reference);
  }

  return deduped;
}

function toStableToken(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "reference"
  );
}
