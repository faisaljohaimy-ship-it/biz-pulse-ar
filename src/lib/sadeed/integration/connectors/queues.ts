/**
 * Phase 9.1 — Message queues & streams (Kafka, RabbitMQ, Redis Streams).
 */

import type { ConnectorDescriptor } from "../core/types";
import {
  CIRCUIT_STANDARD,
  RATE_LIMIT_STANDARD,
  RETRY_STANDARD,
  TIMEOUT_STANDARD,
  config,
  make,
  secret,
} from "./_common";

export const kafka: ConnectorDescriptor = make({
  id: "kafka",
  label: "Apache Kafka",
  category: "queue",
  vendor: "Apache",
  auth: "api_key",
  credentials: [
    config("KAFKA_BROKERS", "Comma-separated broker list"),
    secret("KAFKA_SASL_USERNAME", "SASL username", false),
    secret("KAFKA_SASL_PASSWORD", "SASL password", false),
    config("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT | SASL_SSL | SSL", false),
  ],
  capabilities: [
    {
      id: "kafka.publish",
      verb: "publish",
      scope: "topic",
      description: "Produce message",
      batching: true,
    },
    {
      id: "kafka.consume",
      verb: "subscribe",
      scope: "topic",
      description: "Consume stream",
      streaming: true,
    },
  ],
  permissions: [
    { capability: "kafka.publish", provider_scopes: ["Write"] },
    { capability: "kafka.consume", provider_scopes: ["Read"] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Kafka 2.8+",
});

export const rabbitmq: ConnectorDescriptor = make({
  id: "rabbitmq",
  label: "RabbitMQ",
  category: "queue",
  vendor: "VMware",
  auth: "basic",
  credentials: [
    config("RABBITMQ_URL", "amqp(s):// connection URL"),
    secret("RABBITMQ_USER", "Username", false),
    secret("RABBITMQ_PASSWORD", "Password", false),
  ],
  capabilities: [
    { id: "rabbit.publish", verb: "publish", scope: "exchange", description: "Publish message" },
    {
      id: "rabbit.consume",
      verb: "subscribe",
      scope: "queue",
      description: "Consume queue",
      streaming: true,
    },
  ],
  permissions: [
    { capability: "rabbit.publish", provider_scopes: ["write"] },
    { capability: "rabbit.consume", provider_scopes: ["read"] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "AMQP 0-9-1",
});

export const redisStreams: ConnectorDescriptor = make({
  id: "redis.streams",
  label: "Redis Streams",
  category: "queue",
  vendor: "Redis",
  auth: "connection_string",
  credentials: [secret("REDIS_URL", "redis(s):// connection URL")],
  capabilities: [
    { id: "redis.xadd", verb: "publish", scope: "stream", description: "Append to stream" },
    {
      id: "redis.xread",
      verb: "subscribe",
      scope: "stream",
      description: "Read from stream",
      streaming: true,
    },
  ],
  permissions: [
    { capability: "redis.xadd", provider_scopes: [] },
    { capability: "redis.xread", provider_scopes: [] },
  ],
  retry: RETRY_STANDARD,
  timeout: TIMEOUT_STANDARD,
  rate_limit: RATE_LIMIT_STANDARD,
  circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Redis 5.0+",
});

export const QUEUE_CONNECTORS: ConnectorDescriptor[] = [kafka, rabbitmq, redisStreams];
