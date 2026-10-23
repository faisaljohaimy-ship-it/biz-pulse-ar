/**
 * vitest setupFile — runs inside every worker before the test module loads.
 * Puts the stack env into `process.env` so `supabaseAdmin` (which reads
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY lazily on first use) points at
 * the gateway, and makes sure no kill-switch or external model key leaks in.
 */
import { loadIntegrationEnv } from "./harness/env";

import { randomBytes } from "node:crypto";

loadIntegrationEnv();
delete process.env.SADEED_AI_DISABLED;
// بوابة تأكيد كتابات الدردشة (HMAC + AES-GCM) تشترط سرًّا ≥ 32 حرفًا: سرٌّ
// عشوائي لكل عامل اختبار — اقتراحٌ مختوم في ملفٍّ لا يُقبل في ملفٍّ آخر.
process.env.SADEED_MESSAGE_APPROVAL_SECRET = randomBytes(32).toString("hex");
// The model is mocked per test; a real key must never be consulted here.
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
