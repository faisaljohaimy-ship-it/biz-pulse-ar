import { beforeEach, describe, expect, it } from "vitest";
import { createApprovalToken, verifyApprovalToken } from "./outbound-messaging.server";

const claims = () => ({
  v: 1 as const,
  ledgerId: "47d95a92-7c29-42bc-9c56-7c97589a17d4",
  actorId: "96e1fb67-a502-418d-b986-ef452f4758b7",
  orgId: "00000000-0000-0000-0000-000000000001",
  contentHash: "a".repeat(64),
  expiresAt: Date.now() + 60_000,
  nonce: "one-time",
});

describe("ARIA outbound approval token", () => {
  beforeEach(() => {
    process.env.ARIA_MESSAGE_APPROVAL_SECRET =
      "test-secret-that-is-longer-than-thirty-two-characters";
  });

  it("round-trips signed claims", async () => {
    const token = await createApprovalToken(claims());
    await expect(verifyApprovalToken(token)).resolves.toMatchObject({
      ledgerId: claims().ledgerId,
      actorId: claims().actorId,
      contentHash: "a".repeat(64),
    });
  });

  it("rejects tampering", async () => {
    const token = await createApprovalToken(claims());
    const [payload, signature] = token.split(".");
    await expect(verifyApprovalToken(`${payload}x.${signature}`)).rejects.toThrow(/signature/i);
  });

  it("rejects expired approvals", async () => {
    const token = await createApprovalToken({ ...claims(), expiresAt: Date.now() - 1 });
    await expect(verifyApprovalToken(token)).rejects.toThrow(/expired/i);
  });

  it("fails closed without a production-length secret", async () => {
    process.env.ARIA_MESSAGE_APPROVAL_SECRET = "short";
    await expect(createApprovalToken(claims())).rejects.toThrow(/32/);
  });
});
