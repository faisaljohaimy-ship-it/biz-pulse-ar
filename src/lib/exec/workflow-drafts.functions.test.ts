import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createMiddleware: () => ({ server: () => ({}) }),
  createServerFn: () => {
    const builder = { middleware: () => builder, validator: () => builder, handler: () => ({}) };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { WorkflowDraftSaveSchema } from "./workflow-drafts.functions";
const valid = {
  draftId: "11111111-1111-4111-8111-111111111111",
  orgId: "00000000-0000-0000-0000-000000000001",
  request: "offline asset diagnostic draft",
  limit: 20,
};
it("accepts only the reviewed strict save boundary", () => {
  expect(WorkflowDraftSaveSchema.parse(valid)).toEqual(valid);
});
it.each(["enabled", "definition", "owner_id", "triggerTopic", "toolId"])(
  "rejects user-supplied privilege/execution fields: %s",
  (field) => {
    expect(WorkflowDraftSaveSchema.safeParse({ ...valid, [field]: true }).success).toBe(false);
  },
);
it.each([
  { orgId: "" },
  { draftId: "bad" },
  { limit: 51 },
  { limit: 1.5 },
  { request: "x".repeat(161) },
])("rejects invalid bounded save input: %j", (extra) => {
  expect(WorkflowDraftSaveSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
});
