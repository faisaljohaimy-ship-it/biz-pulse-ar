export const EXECUTIVE_ACCEPTANCE_KEY = "nexios-executive-acceptance:v1";

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type AcceptanceRecord = {
  version: 1;
  acceptedAt: string;
  scope: "executive-activation";
};

export function hasExecutiveAcceptance(storage?: StorageReader | null): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(EXECUTIVE_ACCEPTANCE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<AcceptanceRecord>;
    return (
      parsed.version === 1 &&
      parsed.scope === "executive-activation" &&
      typeof parsed.acceptedAt === "string" &&
      Number.isFinite(Date.parse(parsed.acceptedAt))
    );
  } catch {
    return false;
  }
}

export function recordExecutiveAcceptance(
  storage: StorageWriter,
  acceptedAt = new Date(),
): AcceptanceRecord {
  const record: AcceptanceRecord = {
    version: 1,
    acceptedAt: acceptedAt.toISOString(),
    scope: "executive-activation",
  };
  storage.setItem(EXECUTIVE_ACCEPTANCE_KEY, JSON.stringify(record));
  return record;
}

export function clearExecutiveAcceptance(storage: StorageWriter): void {
  storage.removeItem(EXECUTIVE_ACCEPTANCE_KEY);
}
