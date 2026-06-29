import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import {
  deliveryLifecycleCommandRequestSchema,
  deliveryTerminalCommandRequestSchema,
} from "@sartre/contracts";
import { HandoffApplicationService } from "../../application/handoff-application.service";

@Controller("deliveries")
export class DeliveriesController {
  constructor(
    @Inject(HandoffApplicationService)
    private readonly handoffs: HandoffApplicationService,
  ) {}

  @Post(":deliveryId/ack")
  @HttpCode(200)
  acknowledge(
    @Param("deliveryId") deliveryId: string,
    @Body() _body: { schema_version: "1.0" },
  ) {
    return this.handoffs
      .acknowledgeDelivery(deliveryId)
      .then((delivery) => ({ delivery }));
  }

  @Post(":deliveryId/fail")
  @HttpCode(200)
  fail(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const request = deliveryTerminalCommandRequestSchema.parse(body);
    return this.handoffs
      .failDelivery(deliveryId, request)
      .then((delivery) => ({ delivery }));
  }

  @Post(":deliveryId/expire")
  @HttpCode(200)
  expire(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const request = deliveryTerminalCommandRequestSchema.parse(body);
    return this.handoffs
      .expireDelivery(deliveryId, request)
      .then((delivery) => ({ delivery }));
  }

  @Post(":deliveryId/accept")
  @HttpCode(200)
  accept(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const request = deliveryLifecycleCommandRequestSchema.parse(body);
    return this.handoffs
      .acceptDelivery(deliveryId, request)
      .then((delivery) => ({ delivery }));
  }

  @Post(":deliveryId/start")
  @HttpCode(200)
  start(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const request = deliveryLifecycleCommandRequestSchema.parse(body);
    return this.handoffs
      .startDelivery(deliveryId, request)
      .then((delivery) => ({ delivery }));
  }

  @Post(":deliveryId/report-ready")
  @HttpCode(200)
  reportReady(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const request = deliveryLifecycleCommandRequestSchema.parse(body);
    return this.handoffs
      .markDeliveryReportReady(deliveryId, request)
      .then((delivery) => ({ delivery }));
  }

  @Post(":deliveryId/send-result")
  @HttpCode(200)
  sendResult(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const request = deliveryLifecycleCommandRequestSchema.parse(body);
    return this.handoffs
      .sendDeliveryResult(deliveryId, request)
      .then((delivery) => ({ delivery }));
  }

  @Post(":deliveryId/close")
  @HttpCode(200)
  close(@Param("deliveryId") deliveryId: string, @Body() body: unknown) {
    const request = deliveryLifecycleCommandRequestSchema.parse(body);
    return this.handoffs
      .closeDelivery(deliveryId, request)
      .then((delivery) => ({ delivery }));
  }
}
