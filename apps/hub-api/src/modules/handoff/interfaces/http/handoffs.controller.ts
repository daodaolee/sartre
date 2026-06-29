import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import type { CreateHandoffRequest } from "@sartre/contracts";
import { HandoffApplicationService } from "../../application/handoff-application.service";

@Controller("handoffs")
export class HandoffsController {
  constructor(
    @Inject(HandoffApplicationService)
    private readonly handoffs: HandoffApplicationService,
  ) {}

  @Post()
  create(@Body() body: CreateHandoffRequest) {
    return this.handoffs.createHandoff(body);
  }

  @Get(":handoffId")
  async get(@Param("handoffId") handoffId: string) {
    const handoff = await this.handoffs.getHandoff(handoffId);
    if (!handoff) {
      throw new NotFoundException(`Handoff ${handoffId} is unavailable`);
    }
    return { handoff };
  }

  @Post(":handoffId/artifacts")
  async addArtifact(
    @Param("handoffId") handoffId: string,
    @Body()
    body: {
      schema_version: "1.0";
      artifact: {
        id: string;
        name: string;
        kind: string;
        storage_url: string;
        checksum: string;
      };
    },
  ) {
    const artifacts = await this.handoffs.addArtifact(handoffId, {
      id: body.artifact.id,
      name: body.artifact.name,
      kind: body.artifact.kind,
      storageUrl: body.artifact.storage_url,
      checksum: body.artifact.checksum,
    });
    return { artifacts };
  }
}
