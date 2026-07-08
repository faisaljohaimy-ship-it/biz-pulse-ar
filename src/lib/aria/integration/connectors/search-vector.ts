/**
 * Phase 9.1 — Search & vector databases.
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

function search(
  id: string,
  label: string,
  vendor: string,
  urlEnv: string,
  apiEnv: string,
  versionCompat: string,
): ConnectorDescriptor {
  return make({
    id,
    label,
    category: "search",
    vendor,
    auth: "api_key",
    credentials: [config(urlEnv, `${label} URL`), secret(apiEnv, `${label} API key`, false)],
    capabilities: [
      { id: `${id}.index`, verb: "write", scope: "index", description: "Index document" },
      {
        id: `${id}.search`,
        verb: "search",
        scope: "index",
        description: "Search index",
        paginated: true,
      },
    ],
    permissions: [
      { capability: `${id}.index`, provider_scopes: [] },
      { capability: `${id}.search`, provider_scopes: [] },
    ],
    retry: RETRY_STANDARD,
    timeout: TIMEOUT_STANDARD,
    rate_limit: RATE_LIMIT_STANDARD,
    circuit_breaker: CIRCUIT_STANDARD,
    version_compatibility: versionCompat,
  });
}

export const elasticsearch = search(
  "search.elasticsearch",
  "Elasticsearch",
  "Elastic",
  "ELASTICSEARCH_URL",
  "ELASTICSEARCH_API_KEY",
  "Elasticsearch 8.x",
);
export const opensearch = search(
  "search.opensearch",
  "OpenSearch",
  "OpenSearch Project",
  "OPENSEARCH_URL",
  "OPENSEARCH_API_KEY",
  "OpenSearch 2.x",
);

function vector(
  id: string,
  label: string,
  vendor: string,
  urlEnv: string,
  apiEnv: string,
  versionCompat: string,
): ConnectorDescriptor {
  return make({
    id,
    label,
    category: "vector",
    vendor,
    auth: "api_key",
    credentials: [
      config(urlEnv, `${label} URL`, id !== "vector.pinecone"),
      secret(apiEnv, `${label} API key`),
    ],
    capabilities: [
      {
        id: `${id}.upsert`,
        verb: "write",
        scope: "collection",
        description: "Upsert vectors",
        batching: true,
      },
      {
        id: `${id}.query`,
        verb: "search",
        scope: "collection",
        description: "Nearest neighbor query",
        paginated: true,
      },
    ],
    permissions: [
      { capability: `${id}.upsert`, provider_scopes: [] },
      { capability: `${id}.query`, provider_scopes: [] },
    ],
    retry: RETRY_STANDARD,
    timeout: TIMEOUT_STANDARD,
    rate_limit: RATE_LIMIT_STANDARD,
    circuit_breaker: CIRCUIT_STANDARD,
    version_compatibility: versionCompat,
  });
}

export const pinecone = vector(
  "vector.pinecone",
  "Pinecone",
  "Pinecone",
  "PINECONE_ENVIRONMENT",
  "PINECONE_API_KEY",
  "Pinecone Serverless",
);
export const qdrant = vector(
  "vector.qdrant",
  "Qdrant",
  "Qdrant",
  "QDRANT_URL",
  "QDRANT_API_KEY",
  "Qdrant 1.x",
);
export const milvus = vector(
  "vector.milvus",
  "Milvus",
  "Zilliz",
  "MILVUS_URL",
  "MILVUS_TOKEN",
  "Milvus 2.x",
);
export const weaviate = vector(
  "vector.weaviate",
  "Weaviate",
  "Weaviate",
  "WEAVIATE_URL",
  "WEAVIATE_API_KEY",
  "Weaviate 1.24+",
);
export const chroma = vector(
  "vector.chroma",
  "Chroma",
  "Chroma",
  "CHROMA_URL",
  "CHROMA_API_KEY",
  "Chroma 0.5+",
);

export const SEARCH_CONNECTORS: ConnectorDescriptor[] = [elasticsearch, opensearch];
export const VECTOR_CONNECTORS: ConnectorDescriptor[] = [
  pinecone,
  qdrant,
  milvus,
  weaviate,
  chroma,
];
