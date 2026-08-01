/**
 * /rag-search · البحث المعرفي بالاستشهاد — route definition only. The page
 * lives in the colocated non-route helper (-rag-search-page.tsx) so the
 * router code-splits it out of the entry bundle. Ships dark behind
 * VITE_RAG_RETRIEVAL_ENABLED (default OFF).
 */
import { createFileRoute } from "@tanstack/react-router";
import { DOMAIN_URL } from "@/lib/domain";
import { RagSearchPage } from "./-rag-search-page";

export const Route = createFileRoute("/rag-search")({
  head: () => ({
    meta: [
      { title: "البحث المعرفي بالاستشهاد · RAG — سَدِيد" },
      {
        name: "description",
        content: "استرجاع هجين معزول لكل مؤسسة — مقاطع واستشهادات فقط.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/rag-search` }],
  }),
  component: RagSearchPage,
});
