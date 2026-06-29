import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ConversationApplicationService } from "./application/conversation-application.service";
import { PostgresConversationRepository } from "./infrastructure/postgres/postgres-conversation.repository";
import { ConversationsController } from "./interfaces/http/conversations.controller";
import { CONVERSATION_REPOSITORY } from "./ports/conversation.repository";

@Module({
  imports: [DatabaseModule],
  controllers: [ConversationsController],
  providers: [
    ConversationApplicationService,
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: PostgresConversationRepository,
    },
  ],
})
export class ConversationModule {}
