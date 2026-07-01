/**
 * Phase 9.1 — Relational and document databases.
 */

import type { ConnectorDescriptor } from "../core/types";
import { CIRCUIT_STANDARD, RATE_LIMIT_STANDARD, RETRY_LOW, TIMEOUT_LONG, make, secret } from "./_common";

function dbConnector(id: string, label: string, vendor: string, envVar: string, versionCompat: string, extra?: string): ConnectorDescriptor {
  return make({
    id, label, category: "database", vendor,
    auth: "connection_string",
    credentials: [secret(envVar, extra ?? `${label} connection string`)],
    capabilities: [
      { id: `${id}.query`, verb: "query", scope: "database", description: "Execute query" },
      { id: `${id}.execute`, verb: "write", scope: "database", description: "Execute write statement" },
    ],
    permissions: [
      { capability: `${id}.query`, provider_scopes: [] },
      { capability: `${id}.execute`, provider_scopes: [] },
    ],
    retry: RETRY_LOW, timeout: TIMEOUT_LONG, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
    version_compatibility: versionCompat,
  });
}

export const postgres = dbConnector("db.postgres", "PostgreSQL", "PostgreSQL Global Development Group", "POSTGRES_URL", "PostgreSQL 12+");
export const mssql = dbConnector("db.mssql", "SQL Server", "Microsoft", "MSSQL_CONNECTION_STRING", "SQL Server 2017+");
export const oracle = dbConnector("db.oracle", "Oracle Database", "Oracle", "ORACLE_CONNECTION_STRING", "Oracle 19c+");
export const mysql = dbConnector("db.mysql", "MySQL", "Oracle", "MYSQL_URL", "MySQL 8+");
export const mariadb = dbConnector("db.mariadb", "MariaDB", "MariaDB Foundation", "MARIADB_URL", "MariaDB 10.6+");
export const mongodb = dbConnector("db.mongodb", "MongoDB", "MongoDB Inc.", "MONGODB_URI", "MongoDB 5+");

export const DATABASE_CONNECTORS: ConnectorDescriptor[] = [postgres, mssql, oracle, mysql, mariadb, mongodb];
