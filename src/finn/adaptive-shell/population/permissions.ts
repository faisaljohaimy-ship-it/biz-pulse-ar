/**
 * Section 08 — Permission model.
 *
 * Grants map principals (roles, not people — the Shell stays generic) to
 * permission actions per subject or globally ("*"). Deny-by-default:
 * an action is allowed only when an explicit grant covers it.
 */
import { PERMISSION_ACTIONS, PopulationError, type PermissionAction } from "./types";

export interface PermissionGrant {
  readonly principal: string;
  readonly subjectId: string | "*";
  readonly actions: readonly PermissionAction[];
}

export class PermissionModel {
  private readonly grants: PermissionGrant[] = [];

  grant(grant: PermissionGrant): void {
    if (grant.principal.trim() === "") {
      throw new PopulationError("permissions", "grant principal must be non-empty");
    }
    if (grant.actions.length === 0) {
      throw new PopulationError("permissions", `grant for "${grant.principal}" has no actions`);
    }
    for (const action of grant.actions) {
      if (!PERMISSION_ACTIONS.includes(action)) {
        throw new PopulationError("permissions", `unknown permission action "${action}"`);
      }
    }
    this.grants.push(grant);
  }

  isAllowed(principal: string, subjectId: string, action: PermissionAction): boolean {
    return this.grants.some(
      (g) =>
        g.principal === principal &&
        (g.subjectId === "*" || g.subjectId === subjectId) &&
        g.actions.includes(action),
    );
  }

  assertAllowed(principal: string, subjectId: string, action: PermissionAction): void {
    if (!this.isAllowed(principal, subjectId, action)) {
      throw new PopulationError(
        "permissions",
        `"${principal}" lacks "${action}" on "${subjectId}" (deny-by-default)`,
      );
    }
  }

  grantsFor(principal: string): readonly PermissionGrant[] {
    return this.grants.filter((g) => g.principal === principal);
  }

  /** Coverage law: a record may not demand an action vocabulary this model doesn't know. */
  unknownActions(actions: readonly string[]): readonly string[] {
    return actions.filter((a) => !PERMISSION_ACTIONS.includes(a as PermissionAction));
  }
}
