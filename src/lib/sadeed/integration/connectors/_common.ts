/**
 * Phase 9.1 — Shared defaults / helpers used across connector modules.
 */

import type {
  CircuitBreakerPolicy,
  ConnectorDescriptor,
  CredentialField,
  RateLimitPolicy,
  RetryPolicy,
  TimeoutPolicy,
} from "../core/types";
import { defineConnector } from "../core/registry";

export const RETRY_STANDARD: RetryPolicy = {
  max_attempts: 4,
  initial_delay_ms: 250,
  max_delay_ms: 8_000,
  jitter: true,
};
export const RETRY_LOW: RetryPolicy = {
  max_attempts: 2,
  initial_delay_ms: 100,
  max_delay_ms: 1_000,
  jitter: true,
};
export const TIMEOUT_STANDARD: TimeoutPolicy = { connect_ms: 5_000, request_ms: 30_000 };
export const TIMEOUT_LONG: TimeoutPolicy = { connect_ms: 8_000, request_ms: 120_000 };
export const RATE_LIMIT_STANDARD: RateLimitPolicy = { requests_per_second: 10, burst: 20 };
export const RATE_LIMIT_LOW: RateLimitPolicy = { requests_per_second: 3, burst: 5 };
export const CIRCUIT_STANDARD: CircuitBreakerPolicy = {
  failure_threshold: 5,
  cooldown_ms: 30_000,
  half_open_probes: 1,
};

export function secret(name: string, description: string, required = true): CredentialField {
  return { name, kind: "secret", required, description };
}

export function config(name: string, description: string, required = true): CredentialField {
  return { name, kind: "config", required, description };
}

export function make(desc: ConnectorDescriptor): ConnectorDescriptor {
  return defineConnector(desc);
}
