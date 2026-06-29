create index if not exists delivery_events_endpoint_cursor_idx
  on delivery_events (tenant_id, recipient_endpoint_id, cursor);
