/**
 * Phase 9.1 — Credential Vault interface.
 *
 * Zero-trust: no plaintext values ever cross the boundary. Callers may
 * only ask "is this present?" or receive an opaque *reference* to a
 * secret; the actual value is read on demand inside a bounded closure
 * and never logged, returned, or serialized.
 */

export interface CredentialReference {
  readonly name: string;
  readonly present: boolean;
  /** Runs `fn` with the secret value, then discards it. Value never returned. */
  use<T>(fn: (value: string) => Promise<T> | T): Promise<T | null>;
}

export interface CredentialVault {
  has(name: string): boolean;
  reference(name: string): CredentialReference;
  missing(names: readonly string[]): string[];
}

function envValue(name: string): string | null {
  try {
    const env = (globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    }).process?.env;
    const v = env?.[name];
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

class EnvVault implements CredentialVault {
  has(name: string): boolean {
    return envValue(name) !== null;
  }
  missing(names: readonly string[]): string[] {
    return names.filter((n) => !this.has(n));
  }
  reference(name: string): CredentialReference {
    const present = this.has(name);
    return {
      name,
      present,
      use: async <T,>(fn: (value: string) => Promise<T> | T): Promise<T | null> => {
        const v = envValue(name);
        if (v === null) return null;
        try {
          return await fn(v);
        } finally {
          // No cleanup needed; the value is a captured string not stored elsewhere.
        }
      },
    };
  }
}

const DEFAULT_VAULT: CredentialVault = new EnvVault();
let ACTIVE_VAULT: CredentialVault = DEFAULT_VAULT;

export function getCredentialVault(): CredentialVault {
  return ACTIVE_VAULT;
}

/** Rare: allow tests or an alternate provider to swap the vault. */
export function setCredentialVault(vault: CredentialVault): void {
  ACTIVE_VAULT = vault;
}

export function resetCredentialVault(): void {
  ACTIVE_VAULT = DEFAULT_VAULT;
}
