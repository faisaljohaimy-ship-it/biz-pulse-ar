/**
 * SADEED Shell — proposal authorization (single source of truth).
 *
 * Policy = ADMIN_ONLY_APPROVAL, the safest reading of the current spec:
 *
 *   • Only an `app_role = admin` may approve / reject / veto a proposal — the
 *     final decision. This mirrors the shell_proposals RLS
 *     (`has_role(auth.uid(), 'admin'::app_role)`) at the application layer.
 *   • An `org_role = manager` may AUTHOR and track a proposal, but never make
 *     the final decision. A manager is NOT promoted to admin.
 *   • Admin authority does not cross organization boundaries: when the resource
 *     is org-scoped, the admin must belong to that same org.
 *   • No new app_role is introduced, and the admin check is never swapped for a
 *     manager check.
 *
 * These are pure predicates. The UI and the executive path build an `Actor`
 * from the authenticated session and call the SAME functions here — the check
 * lives in exactly one place.
 */

/** Platform RBAC roles (Database Enums.app_role). */
export type AppRole = "admin" | "manager" | "member";

/** Organization membership roles (Database Enums.org_role). */
export type OrgRole = "owner" | "admin" | "manager" | "operator" | "viewer";

export interface Actor {
  /** null → no authenticated session. */
  readonly userId: string | null;
  /** app_role grants held by the actor (platform RBAC). */
  readonly appRoles: readonly AppRole[];
  /** The actor's role within their organization. */
  readonly orgRole: OrgRole | null;
  /** The actor's organization id. */
  readonly orgId: string | null;
}

export type ProposalDecision = "approve" | "reject" | "veto";

const hasSession = (a: Actor): boolean => typeof a.userId === "string" && a.userId.length > 0;
const isAdmin = (a: Actor): boolean => a.appRoles.includes("admin");

/**
 * The final decision (approve / reject / veto) on a proposal.
 * app_role=admin ONLY, and — when the proposal is org-scoped — the admin must
 * be in the same org. Everyone else (manager included) is denied.
 */
export function canDecideProposal(actor: Actor, resourceOrgId?: string | null): boolean {
  if (!hasSession(actor)) return false;
  if (!isAdmin(actor)) return false;
  if (resourceOrgId != null && actor.orgId !== resourceOrgId) return false;
  return true;
}

/**
 * Authoring / tracking a proposal (no final authority). An org manager may
 * create one; an admin may too. Everyone below manager is denied.
 */
export function canCreateProposal(actor: Actor): boolean {
  if (!hasSession(actor)) return false;
  return isAdmin(actor) || actor.orgRole === "manager";
}

/**
 * Guard for the executive path: throws unless the actor may make the final
 * decision. Use at the mutation site so a UI bug can never bypass the policy.
 */
export function assertCanDecideProposal(actor: Actor, resourceOrgId?: string | null): void {
  if (!canDecideProposal(actor, resourceOrgId)) {
    throw new Error("Forbidden: proposal approval requires app_role=admin in the resource org.");
  }
}
