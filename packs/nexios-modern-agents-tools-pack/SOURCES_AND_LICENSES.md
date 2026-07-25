# المصادر والتراخيص

هذه الحزمة مكتوبة بصياغة أصلية لـ NEXIOS. لم تُنسخ نصوص مهارات أو وكلاء أو أدوات مملوكة من مواقع أخرى. استُخدمت المواصفات والوثائق العامة التالية لتوجيه التصميم والتوافق والأمان.

| المصدر | الاستخدام | الملاحظة |
|---|---|---|
| [Anthropic Agent Skills public repository](https://github.com/anthropics/skills) | Filesystem skill pattern, progressive disclosure, and SKILL.md conventions | No repository text or source-available document skill was copied into this pack. |
| [Anthropic Agent Skills documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | Skill metadata and staged loading architecture | Used as design guidance only. |
| [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) | Agents, tools, handoffs, guardrails, sessions, and tracing concepts | Definitions in this pack are original and platform-neutral. |
| [Model Context Protocol specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) | Tool, resource, prompt, lifecycle, and authorization interoperability | Descriptors are MCP-ready but are not live MCP servers. |
| [Agent2Agent Protocol 1.0](https://a2a-protocol.org/v1.0.0/) | Agent discovery, cards, tasks, and controlled delegation | Agent cards require a deployed A2A endpoint before activation. |
| [OpenAPI Specification 3.2.0](https://spec.openapis.org/oas/v3.2.0.html) | Language-neutral API contracts | Tool schemas are simplified JSON descriptors, not full vendor OpenAPI documents. |
| [Arazzo Specification 1.1.0](https://spec.openapis.org/arazzo/latest.html) | Multi-step API workflow description | Workflow validation tool is descriptor-only until an Arazzo engine is connected. |
| [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12) | Input and output validation contracts | All pack schemas declare Draft 2020-12. |
| [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) | Govern, Map, Measure, and Manage risk lifecycle | The pack is not a certification or legal opinion. |
| [NIST Generative AI Profile NIST.AI.600-1](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) | Generative AI risk and assurance considerations | Controls are original operational patterns. |
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | Agentic threats, excessive agency, tool misuse, and governance | No OWASP prose is reproduced. |
| [MITRE ATT&CK](https://attack.mitre.org/) | Threat-informed defense and ICS technique mapping | Validate ATT&CK identifiers against the current knowledge base during implementation. |
| [OpenTelemetry documentation](https://opentelemetry.io/docs/) | Traces, metrics, logs, profiles, correlation, and vendor-neutral telemetry | A compatible collector and backend must be configured. |
| [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | RLS-first tenancy and least-privilege data access | Policies must be regression-tested against the deployed NEXIOS schema. |
| [Saudi NCA Essential Cybersecurity Controls ECC 2-2024](https://nca.gov.sa/en/regulatory-documents/controls-list/ecc/) | Saudi cybersecurity control mapping and evidence workflows | Use the binding Arabic publication and qualified compliance review. |
| [Saudi Personal Data Protection Law](https://sdaia.gov.sa/en/Research/Pages/DataProtection.aspx) | Privacy classification, rights requests, impact assessment, and records governance | The pack does not replace legal advice; verify current law and regulations. |
| [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference) | Least-privileged Microsoft 365 and identity connector scopes | Every deployed operation needs an operation-specific permission review. |
| [SAP REST and OData API documentation guidance](https://help.sap.com/docs/api-style-guide/sap-api-style-guide-public/rest-and-odata-api-documentation) | SAP connector contract design | Exact endpoints and scopes depend on the customer's SAP products and tenant. |
| [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/) | Edge-runtime compatibility and deployment constraints | Filesystem loading must be replaced by generated registries in edge deployments. |

## حدود الاستخدام

- المراجع التنظيمية والأمنية لا تجعل الحزمة شهادة امتثال أو رأيًا قانونيًا.
- تحقّق من النسخ الرسمية السارية وقت التركيب، وبالأخص NCA ECC وPDPL وHCIS.
- موصلات Microsoft وSAP وOracle وغيرها تتطلب تراخيص وصلاحيات واعتمادًا منفصلًا.
- تعريف الأداة لا يمنح صلاحية ولا ينفذ اتصالًا تلقائيًا.
