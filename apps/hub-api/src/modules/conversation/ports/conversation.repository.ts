import type {
  AppendConversationMessageRequest,
  ContextProjection,
  ConversationDetailResponse,
  ConversationLedger,
  ConversationListResponse,
  ConversationMessage,
  CreateContextProjectionRequest,
  CreateConversationRequest,
  CreateSummaryCheckpointRequest,
  ModelRun,
  RecordModelRunRequest,
  RecordToolInvocationRequest,
  SummaryCheckpoint,
  ToolInvocationRecord,
} from "@sartre/contracts";

export const CONVERSATION_REPOSITORY = Symbol("CONVERSATION_REPOSITORY");

export interface ConversationRepository {
  createConversation(
    input: CreateConversationRequest,
  ): Promise<ConversationLedger>;
  appendMessage(
    input: AppendConversationMessageRequest,
  ): Promise<ConversationMessage>;
  recordToolInvocation(
    input: RecordToolInvocationRequest,
  ): Promise<ToolInvocationRecord>;
  createSummaryCheckpoint(
    input: CreateSummaryCheckpointRequest,
  ): Promise<SummaryCheckpoint>;
  createContextProjection(
    input: CreateContextProjectionRequest,
  ): Promise<ContextProjection>;
  recordModelRun(input: RecordModelRunRequest): Promise<ModelRun>;
  listConversations(input: {
    tenantId: string;
    endpointId: string;
  }): Promise<ConversationListResponse>;
  getConversationDetail(input: {
    tenantId: string;
    conversationId: string;
  }): Promise<ConversationDetailResponse>;
}
