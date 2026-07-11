/**
 * KB seed articles — public API. The large article list is split across
 * kb-seed.articles.a/b.ts (pure data) to keep each file focused; this module
 * remains the single import surface (`ARTICLES`, `ARTICLE_COUNT`, the type).
 */
export type { KbSeedArticle } from "./kb-seed.base";
import { ARTICLES_A } from "./kb-seed.articles.a";
import { ARTICLES_B } from "./kb-seed.articles.b";
import type { KbSeedArticle } from "./kb-seed.base";

export const ARTICLES: KbSeedArticle[] = [...ARTICLES_A, ...ARTICLES_B];
export const ARTICLE_COUNT = ARTICLES.length;
