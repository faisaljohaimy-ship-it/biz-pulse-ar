// Auto-split from oms.functions.ts — shared OMS types.
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export type ActivityEvent = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_ref: string | null;
  event: string;
  actor_id: string | null;
  actor_name: string | null;
  payload: JsonValue;
  occurred_at: string;
};
