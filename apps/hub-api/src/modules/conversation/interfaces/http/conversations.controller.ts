import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import type {
  AppendConversationMessageRequest,
  CreateContextProjectionRequest,
  CreateConversationRequest,
  CreateSummaryCheckpointRequest,
  RecordModelRunRequest,
  RecordToolInvocationRequest,
} from "@sartre/contracts";
import { ConversationApplicationService } from "../../application/conversation-application.service";

@Controller("conversations")
export class ConversationsController {
  constructor(
    @Inject(ConversationApplicationService)
    private readonly conversations: ConversationApplicationService,
  ) {}

  @Post()
  create(@Body() body: CreateConversationRequest) {
    return this.conversations.createConversation(body);
  }

  @Get()
  list(
    @Query("tenant_id") tenantId = "local-demo",
    @Query("endpoint_id") endpointId: string,
  ) {
    return this.conversations.listConversations({ tenantId, endpointId });
  }

  @Get(":conversationId")
  get(
    @Param("conversationId") conversationId: string,
    @Query("tenant_id") tenantId = "local-demo",
  ) {
    return this.conversations.getConversationDetail({
      tenantId,
      conversationId,
    });
  }

  @Post(":conversationId/messages")
  appendMessage(
    @Param("conversationId") conversationId: string,
    @Body() body: AppendConversationMessageRequest,
  ) {
    return this.conversations.appendMessage({
      ...body,
      conversation_id: conversationId,
    });
  }

  @Post(":conversationId/tool-invocations")
  recordToolInvocation(
    @Param("conversationId") conversationId: string,
    @Body() body: RecordToolInvocationRequest,
  ) {
    return this.conversations.recordToolInvocation({
      ...body,
      conversation_id: conversationId,
    });
  }

  @Post(":conversationId/summary-checkpoints")
  createSummaryCheckpoint(
    @Param("conversationId") conversationId: string,
    @Body() body: CreateSummaryCheckpointRequest,
  ) {
    return this.conversations.createSummaryCheckpoint({
      ...body,
      conversation_id: conversationId,
    });
  }

  @Post(":conversationId/context-projections")
  createContextProjection(
    @Param("conversationId") conversationId: string,
    @Body() body: CreateContextProjectionRequest,
  ) {
    return this.conversations.createContextProjection({
      ...body,
      conversation_id: conversationId,
    });
  }

  @Post(":conversationId/model-runs")
  recordModelRun(
    @Param("conversationId") conversationId: string,
    @Body() body: RecordModelRunRequest,
  ) {
    return this.conversations.recordModelRun({
      ...body,
      conversation_id: conversationId,
    });
  }
}
