import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check, Bot, RefreshCw, Sparkles } from "lucide-react";
import { AriaSignatureBackdrop } from "@/components/aria/AriaSignatureBackdrop";
import { DOMAIN_URL } from "@/lib/domain";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect an AI assistant · NEXIOS AI OS" },
      {
        name: "description",
        content:
          "Connect ChatGPT or Claude to NEXIOS via MCP. Copy the server URL and follow the step-by-step guide.",
      },
      { property: "og:title", content: "Connect an AI assistant to NEXIOS" },
      {
        property: "og:description",
        content: "Step-by-step: paste the NEXIOS MCP URL into ChatGPT or Claude.",
      },
      { property: "og:url", content: `${DOMAIN_URL}/connect` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/connect` }],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const [mcpUrl, setMcpUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMcpUrl(new URL("/mcp", window.location.origin).toString());
  }, []);

  async function copy() {
    if (!mcpUrl) return;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#04070F] text-white">
      <AriaSignatureBackdrop intensity={1.2} />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#3AE8FF]/12 text-[#3AE8FF]">
            <Bot className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">Connect an AI assistant</h1>
            <p className="text-sm text-white/55">Use NEXIOS from ChatGPT or Claude through MCP.</p>
          </div>
        </div>

        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            MCP server URL
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code
              dir="ltr"
              className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[13px] text-[#3AE8FF]"
            >
              {mcpUrl || "…"}
            </code>
            <button
              type="button"
              onClick={copy}
              disabled={!mcpUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-400/25 disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy URL"}
            </button>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">
            Paste this URL into your assistant's connector settings. Once connected, you can ask it
            to use NEXIOS tools to read incidents, KPIs, and briefings.
          </p>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#3AE8FF]" />
            <h2 className="text-lg font-bold">Connect</h2>
          </div>

          <div className="space-y-6">
            <ClientCard title="ChatGPT">
              <ol className="space-y-2 text-[14px] leading-relaxed text-white/80">
                <li>
                  1. Open{" "}
                  <ExtLink href="https://chatgpt.com/#settings/Connectors/Advanced">
                    ChatGPT → Settings → Connectors → Advanced
                  </ExtLink>{" "}
                  and enable Developer mode (read the risk notice shown there).
                </li>
                <li>2. In the chat composer, open the "+" menu and turn on Developer mode.</li>
                <li>3. Click "Add sources", then "Connect more".</li>
                <li>4. Give the connector a name and paste the MCP URL above.</li>
                <li>5. Start a new chat and ask ChatGPT to use NEXIOS.</li>
              </ol>
            </ClientCard>

            <ClientCard title="Claude">
              <ol className="space-y-2 text-[14px] leading-relaxed text-white/80">
                <li>
                  1. Open{" "}
                  <ExtLink href="https://claude.ai/customize/connectors?modal=add-custom-connector">
                    Claude → Connectors → Add custom connector
                  </ExtLink>
                  .
                </li>
                <li>2. Give the connector a name and paste the MCP URL above.</li>
                <li>3. Enable the connector from the chat composer.</li>
                <li>4. Ask Claude to use NEXIOS.</li>
              </ol>
            </ClientCard>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-[#3AE8FF]" />
            <h2 className="text-lg font-bold">Refresh after the app changes</h2>
          </div>
          <p className="mb-4 text-[13px] leading-relaxed text-white/60">
            A connected assistant caches the tool list. When we ship new tools or updates, refresh
            the connector so your assistant sees them.
          </p>

          <div className="space-y-6">
            <ClientCard title="ChatGPT">
              <ol className="space-y-2 text-[14px] leading-relaxed text-white/80">
                <li>1. Open ChatGPT app preferences and pick NEXIOS under "Enabled apps".</li>
                <li>2. Next to "Information", click "Refresh".</li>
                <li>3. If the URL changed, paste the latest URL from above.</li>
                <li>4. Start a new chat and ask ChatGPT to use NEXIOS.</li>
              </ol>
            </ClientCard>

            <ClientCard title="Claude">
              <ol className="space-y-2 text-[14px] leading-relaxed text-white/80">
                <li>1. Open the Connectors page and select the NEXIOS connector.</li>
                <li>2. Refresh or update the connector's tools.</li>
                <li>3. If the URL changed, paste the latest URL from above.</li>
                <li>4. Ask Claude to use NEXIOS.</li>
              </ol>
            </ClientCard>
          </div>
        </section>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
          Need help?{" "}
          <Link to="/contact" className="text-[#3AE8FF] underline-offset-4 hover:underline">
            Contact the NEXIOS team
          </Link>
          .
        </div>
      </main>
    </div>
  );
}

function ClientCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-3 text-base font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-[#3AE8FF] underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}
