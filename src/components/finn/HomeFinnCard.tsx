/**
 * Owner-only FNN home chat. Reuses FinnChat and the existing server access guard.
 * Chat state stays separate from SADEED; no second agent or provider is created.
 * The user-supplied portrait is served through the existing HOME_IMAGES entry.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronDown, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useId, useState } from "react";
import { HOME_IMAGES } from "@/components/home/home-images";
import { useAuth } from "@/lib/auth-context";
import { getFinnAccess } from "@/lib/finn-agent/access.functions";
import { FINN_BANNER_AR, FINN_COPY } from "@/lib/finn-agent/copy";
import type { FinnEngineStatus } from "@/lib/finn-agent/status";
import { useI18n } from "@/lib/i18n";
import "@/styles/home/home-finn.css";
import "@/styles/home/home-finn-identity.css";

// No chat code is loaded for visitors or users denied by the server guard.
const FinnChat = lazy(() => import("@/components/finn/FinnChat"));

const OPEN_AR = "افتح محادثة فِن";
const OPEN_EN = "Open the Finn chat";
const SUBTITLE_EN = "Owner's coding and automation assistant";
const HIDE_AR = "إخفاء المحادثة";
const SHOW_AR = "إظهار المحادثة";
const HIDE_EN = "Hide the chat";
const SHOW_EN = "Show the chat";

function InlineChat({ engine, ar }: { engine: FinnEngineStatus; ar: boolean }) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  return (
    <div className="nx-fn-chat">
      <button
        type="button"
        className="nx-fn-fold min-h-11!"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? (ar ? HIDE_AR : HIDE_EN) : ar ? SHOW_AR : SHOW_EN}</span>
        <ChevronDown aria-hidden className="nx-fn-fold-ico" data-open={open || undefined} />
      </button>
      {/* Folding preserves this user's draft; a different user remounts the card. */}
      <div id={panelId} hidden={!open}>
        <Suspense
          fallback={
            <p dir="rtl" role="status" className="nx-fn-chat-loading">
              {FINN_COPY.loadingPage}
            </p>
          }
        >
          <FinnChat engine={engine} variant="inline" />
        </Suspense>
      </div>
    </div>
  );
}

function FinnCard({ userId }: { userId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data } = useQuery({
    queryKey: ["finn-access", userId],
    queryFn: () => getFinnAccess(),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (!data?.allowed) return null;

  const img = HOME_IMAGES.finn;
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <section
      aria-labelledby="nx-home-finn-title"
      aria-describedby="nx-home-finn-separation"
      dir={ar ? "rtl" : "ltr"}
      className="nx-home-panel nx-home-finn"
      data-finn-home-card
      data-agent="fnn"
    >
      <div className="nx-fn-head">
        <img
          src={img.src}
          width={img.width}
          height={img.height}
          alt={img.alt}
          loading={img.loading}
          decoding="async"
          className="nx-fn-portrait"
        />
        <div className="nx-fn-id">
          <span className="nx-fn-agent-badge" dir="ltr">
            FNN
          </span>
          <h2 id="nx-home-finn-title" className="nx-fn-title">
            {ar ? FINN_COPY.title : "Finn"}
          </h2>
          <p className="nx-fn-sub">{ar ? FINN_COPY.subtitle : SUBTITLE_EN}</p>
          <p id="nx-home-finn-separation" className="nx-fn-separation">
            {ar ? "محادثة مستقلة عن سديد · للمالك فقط" : "Separate from SADEED · Owner only"}
          </p>
        </div>
      </div>

      <p role="note" className="nx-fn-banner">
        <TriangleAlert aria-hidden className="nx-fn-banner-ico" />
        <span dir="rtl">{FINN_BANNER_AR}</span>
      </p>

      <InlineChat engine={data.engine} ar={ar} />

      <Link to="/finn" className="nx-fn-open min-h-11!">
        <span>{ar ? OPEN_AR : OPEN_EN}</span>
        <Arrow aria-hidden className="nx-fn-open-ico" />
      </Link>
    </section>
  );
}

export function HomeFinnCard() {
  const { user } = useAuth();
  if (!user) return null;
  // Never retain a previous signed-in user's draft in a reused component tree.
  return <FinnCard key={user.id} userId={user.id} />;
}
