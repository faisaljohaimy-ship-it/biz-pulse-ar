# Production Operations Handbook

## System overview

- Frontend: TanStack Start, React 19, and Vite.
- Data plane: Supabase Postgres, Auth, Realtime, and Storage with tenant RLS.
- Intelligence: native Google Gemini only (`gemini-3.6-flash`).
- Retrieval: Gemini embeddings plus tenant-scoped hybrid retrieval and an Evidence Gate.
- Speech: Gemini transcription; ElevenLabs speech output.
- Agent runtime: FINN Chief plus the canonical Council of Ten.

## Observability

- Use the in-app observability and agent-operation views for latency, failures, approvals, token usage, RAG gaps, and tool audit events.
- Alert on cross-tenant denials, repeated Evidence Gate failures, tool approval bypass attempts, and provider readiness changes.
- Never log prompts containing secrets, raw audio, provider keys, or full private documents.

## Backup and recovery

- Enable managed database backups and test point-in-time recovery quarterly.
- Restore to an isolated staging project, apply migrations, then run authentication, RAG isolation, agent-council, and core route smoke tests.
- Preserve knowledge verification history and audit events during recovery.

## Deployment

CI must pass lint, typecheck, unit tests, production build, performance budget, and secret scanning. Production promotion remains a deliberate human action after staging acceptance.

## Secrets

Store secrets in the deployment vault and rotate them on policy. Core server secrets are the Gemini key, Supabase service role, and optional ElevenLabs/connector credentials. Never commit `.env`, expose server keys through `VITE_*`, or include them in downloadable artifacts.
