import { createServerFn } from "@tanstack/react-start";
import { runDirectiveAudit, type DirectiveAuditReport } from "./phase-audit.server";

export const getDirectiveAudit = createServerFn({ method: "GET" }).handler(
  async (): Promise<DirectiveAuditReport> => runDirectiveAudit(),
);
