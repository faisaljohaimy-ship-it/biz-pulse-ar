export const PDPL_REQUIRED_ENV = [
  "PDPL_CONTROLLER_NAME",
  "PDPL_CONTROLLER_REGISTRATION",
  "PDPL_DPO_NAME",
  "PDPL_PRIVACY_CONTACT_EMAIL",
  "PDPL_DATA_REGION",
  "PDPL_DPA_REGISTER_STATUS",
  "PDPL_ACCOUNT_ERASURE_DAYS",
  "PDPL_AUDIT_RETENTION_DAYS",
  "PDPL_OPERATIONAL_RETENTION_DAYS",
  "PDPL_BREACH_OWNER",
  "PDPL_LEGAL_APPROVAL_REF",
] as const;

export type PdplEnvName = (typeof PDPL_REQUIRED_ENV)[number];

export type PdplReadiness = {
  ready: boolean;
  signals: Array<{ key: string; value: string | number | boolean | null; ok: boolean }>;
  blockers: string[];
};

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function validDays(value: string | undefined): boolean {
  if (!value || !/^\d+$/.test(value.trim())) return false;
  const days = Number(value);
  return Number.isInteger(days) && days >= 1 && days <= 3_650;
}

export function evaluatePdplReadiness(
  env: Record<string, string | undefined> = process.env,
): PdplReadiness {
  const checks: Record<PdplEnvName, boolean> = {
    PDPL_CONTROLLER_NAME: present(env.PDPL_CONTROLLER_NAME),
    PDPL_CONTROLLER_REGISTRATION: present(env.PDPL_CONTROLLER_REGISTRATION),
    PDPL_DPO_NAME: present(env.PDPL_DPO_NAME),
    PDPL_PRIVACY_CONTACT_EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      env.PDPL_PRIVACY_CONTACT_EMAIL?.trim() ?? "",
    ),
    PDPL_DATA_REGION: present(env.PDPL_DATA_REGION),
    PDPL_DPA_REGISTER_STATUS: ["approved", "executed"].includes(
      env.PDPL_DPA_REGISTER_STATUS?.trim().toLowerCase() ?? "",
    ),
    PDPL_ACCOUNT_ERASURE_DAYS: validDays(env.PDPL_ACCOUNT_ERASURE_DAYS),
    PDPL_AUDIT_RETENTION_DAYS: validDays(env.PDPL_AUDIT_RETENTION_DAYS),
    PDPL_OPERATIONAL_RETENTION_DAYS: validDays(env.PDPL_OPERATIONAL_RETENTION_DAYS),
    PDPL_BREACH_OWNER: present(env.PDPL_BREACH_OWNER),
    PDPL_LEGAL_APPROVAL_REF: present(env.PDPL_LEGAL_APPROVAL_REF),
  };

  const signals = PDPL_REQUIRED_ENV.map((key) => {
    const isDays = key.endsWith("_DAYS");
    const value = env[key]?.trim();
    return {
      key: key.toLowerCase(),
      value: checks[key] ? (isDays ? Number(value) : "configured") : null,
      ok: checks[key],
    };
  });
  const blockers = PDPL_REQUIRED_ENV.filter((key) => !checks[key]).map(
    (key) => `PDPL production control missing or invalid: ${key}`,
  );
  return { ready: blockers.length === 0, signals, blockers };
}
