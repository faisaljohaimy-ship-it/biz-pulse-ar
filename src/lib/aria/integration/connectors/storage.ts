/**
 * Phase 9.1 — Storage & file transfer (Dropbox, Box, S3, MinIO, FTP, SFTP).
 */

import type { ConnectorDescriptor } from "../core/types";
import { CIRCUIT_STANDARD, RATE_LIMIT_STANDARD, RETRY_STANDARD, TIMEOUT_LONG, TIMEOUT_STANDARD, config, make, secret } from "./_common";

export const dropbox: ConnectorDescriptor = make({
  id: "dropbox", label: "Dropbox", category: "storage", vendor: "Dropbox",
  auth: "oauth2",
  credentials: [
    secret("DROPBOX_APP_KEY", "Dropbox app key"),
    secret("DROPBOX_APP_SECRET", "Dropbox app secret"),
    secret("DROPBOX_REFRESH_TOKEN", "OAuth refresh token"),
  ],
  capabilities: [
    { id: "dropbox.files.list", verb: "list", scope: "files", description: "List folder", paginated: true },
    { id: "dropbox.files.download", verb: "download", scope: "files", description: "Download file", streaming: true },
    { id: "dropbox.files.upload", verb: "upload", scope: "files", description: "Upload file", streaming: true },
  ],
  permissions: [
    { capability: "dropbox.files.list", provider_scopes: ["files.metadata.read"] },
    { capability: "dropbox.files.download", provider_scopes: ["files.content.read"] },
    { capability: "dropbox.files.upload", provider_scopes: ["files.content.write"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "API v2",
});

export const box: ConnectorDescriptor = make({
  id: "box", label: "Box", category: "storage", vendor: "Box",
  auth: "oauth2",
  credentials: [
    secret("BOX_CLIENT_ID", "Box client id"),
    secret("BOX_CLIENT_SECRET", "Box client secret"),
    secret("BOX_REFRESH_TOKEN", "OAuth refresh token"),
  ],
  capabilities: [
    { id: "box.folders.items", verb: "list", scope: "folder", description: "List folder items", paginated: true },
    { id: "box.files.download", verb: "download", scope: "file", description: "Download file", streaming: true },
    { id: "box.files.upload", verb: "upload", scope: "file", description: "Upload file", streaming: true },
  ],
  permissions: [
    { capability: "box.folders.items", provider_scopes: ["root_readwrite"] },
    { capability: "box.files.download", provider_scopes: ["root_readwrite"] },
    { capability: "box.files.upload", provider_scopes: ["root_readwrite"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_STANDARD, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "Content API v2.0",
});

export const s3: ConnectorDescriptor = make({
  id: "aws.s3", label: "Amazon S3", category: "object_storage", vendor: "AWS",
  auth: "api_key",
  credentials: [
    secret("AWS_ACCESS_KEY_ID", "AWS access key id"),
    secret("AWS_SECRET_ACCESS_KEY", "AWS secret access key"),
    config("AWS_REGION", "AWS region"),
    config("AWS_S3_BUCKET", "Default bucket name", false),
  ],
  capabilities: [
    { id: "s3.objects.list", verb: "list", scope: "bucket", description: "List objects", paginated: true },
    { id: "s3.object.get", verb: "download", scope: "bucket", description: "Get object", streaming: true },
    { id: "s3.object.put", verb: "upload", scope: "bucket", description: "Put object", streaming: true },
  ],
  permissions: [
    { capability: "s3.objects.list", provider_scopes: ["s3:ListBucket"] },
    { capability: "s3.object.get", provider_scopes: ["s3:GetObject"] },
    { capability: "s3.object.put", provider_scopes: ["s3:PutObject"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_LONG, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "SigV4",
});

export const minio: ConnectorDescriptor = make({
  id: "minio", label: "MinIO", category: "object_storage", vendor: "MinIO",
  auth: "api_key",
  credentials: [
    config("MINIO_ENDPOINT", "MinIO endpoint URL"),
    secret("MINIO_ACCESS_KEY", "Access key"),
    secret("MINIO_SECRET_KEY", "Secret key"),
    config("MINIO_BUCKET", "Default bucket", false),
  ],
  capabilities: [
    { id: "minio.objects.list", verb: "list", scope: "bucket", description: "List objects", paginated: true },
    { id: "minio.object.get", verb: "download", scope: "bucket", description: "Get object", streaming: true },
    { id: "minio.object.put", verb: "upload", scope: "bucket", description: "Put object", streaming: true },
  ],
  permissions: [
    { capability: "minio.objects.list", provider_scopes: ["s3:ListBucket"] },
    { capability: "minio.object.get", provider_scopes: ["s3:GetObject"] },
    { capability: "minio.object.put", provider_scopes: ["s3:PutObject"] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_LONG, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "S3-compatible",
});

export const ftp: ConnectorDescriptor = make({
  id: "ftp", label: "FTP", category: "file_transfer", vendor: "IETF",
  auth: "basic",
  credentials: [
    config("FTP_HOST", "FTP host"),
    config("FTP_PORT", "FTP port", false),
    secret("FTP_USER", "FTP username"),
    secret("FTP_PASSWORD", "FTP password"),
  ],
  capabilities: [
    { id: "ftp.list", verb: "list", scope: "directory", description: "List directory" },
    { id: "ftp.get", verb: "download", scope: "file", description: "Download file", streaming: true },
    { id: "ftp.put", verb: "upload", scope: "file", description: "Upload file", streaming: true },
  ],
  permissions: [
    { capability: "ftp.list", provider_scopes: [] },
    { capability: "ftp.get", provider_scopes: [] },
    { capability: "ftp.put", provider_scopes: [] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_LONG, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "RFC 959",
  notes: "Prefer SFTP; FTP is included for legacy integration only.",
});

export const sftp: ConnectorDescriptor = make({
  id: "sftp", label: "SFTP", category: "file_transfer", vendor: "IETF",
  auth: "api_key",
  credentials: [
    config("SFTP_HOST", "SFTP host"),
    config("SFTP_PORT", "SFTP port", false),
    secret("SFTP_USER", "SFTP username"),
    secret("SFTP_PRIVATE_KEY", "SSH private key (PEM)"),
  ],
  capabilities: [
    { id: "sftp.list", verb: "list", scope: "directory", description: "List directory" },
    { id: "sftp.get", verb: "download", scope: "file", description: "Download file", streaming: true },
    { id: "sftp.put", verb: "upload", scope: "file", description: "Upload file", streaming: true },
  ],
  permissions: [
    { capability: "sftp.list", provider_scopes: [] },
    { capability: "sftp.get", provider_scopes: [] },
    { capability: "sftp.put", provider_scopes: [] },
  ],
  retry: RETRY_STANDARD, timeout: TIMEOUT_LONG, rate_limit: RATE_LIMIT_STANDARD, circuit_breaker: CIRCUIT_STANDARD,
  version_compatibility: "SSH v2 (SFTP v3)",
});

export const STORAGE_CONNECTORS: ConnectorDescriptor[] = [dropbox, box, s3, minio, ftp, sftp];
