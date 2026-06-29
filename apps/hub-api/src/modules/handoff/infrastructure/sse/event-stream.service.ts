import { Injectable } from "@nestjs/common";
import { map, type Observable, Subject } from "rxjs";
import type { DeliveryEventRecord } from "../../ports/handoff.repository";

export type HandoffStreamMessage = {
  type: string;
  data: DeliveryEventRecord;
};

@Injectable()
export class EventStreamService {
  private readonly streams = new Map<string, Subject<DeliveryEventRecord>>();

  streamForEndpoint(endpointId: string): Observable<HandoffStreamMessage> {
    return this.subjectFor(endpointId).pipe(
      map((event) => ({ type: event.type, data: event })),
    );
  }

  publish(endpointId: string, event: DeliveryEventRecord): void {
    this.subjectFor(endpointId).next(event);
  }

  private subjectFor(endpointId: string): Subject<DeliveryEventRecord> {
    const existing = this.streams.get(endpointId);
    if (existing) {
      return existing;
    }

    const created = new Subject<DeliveryEventRecord>();
    this.streams.set(endpointId, created);
    return created;
  }
}
