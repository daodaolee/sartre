import { Inject, Injectable } from "@nestjs/common";
import type {
  AppendConversationMessageRequest,
  CreateContextProjectionRequest,
  CreateConversationRequest,
  CreateSummaryCheckpointRequest,
  RecordModelRunRequest,
  RecordToolInvocationRequest,
} from "@sartre/contracts";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../ports/conversation.repository";

@Injectable()
export class ConversationApplicationService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
  ) {}

  createConversation(input: CreateConversationRequest) {
    return this.conversations.createConversation(input);
  }

  appendMessage(input: AppendConversationMessageRequest) {
    return this.conversations.appendMessage(input);
  }

  recordToolInvocation(input: RecordToolInvocationRequest) {
    return this.conversations.recordToolInvocation(input);
  }

  createSummaryCheckpoint(input: CreateSummaryCheckpointRequest) {
    return this.conversations.createSummaryCheckpoint(input);
  }

  createContextProjection(input: CreateContextProjectionRequest) {
    return this.conversations.createContextProjection(input);
  }

  recordModelRun(input: RecordModelRunRequest) {
    return this.conversations.recordModelRun(input);
  }

  listConversations(input: { tenantId: string; endpointId: string }) {
    return this.conversations.listConversations(input);
  }

  getConversationDetail(input: { tenantId: string; conversationId: string }) {
    return this.conversations.getConversationDetail(input);
  }
}
