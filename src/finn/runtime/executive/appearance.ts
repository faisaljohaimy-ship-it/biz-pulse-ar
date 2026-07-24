/**
 * Executive Shell — Theme Engine · Localization Engine · Accessibility Layer ·
 * Feature Flag Manager.
 *
 * Pure runtime models (no UI redesign): themes are named token sets, locales
 * are dictionaries with fallback, accessibility is a bounded preference set
 * plus a screen-reader announcement queue, and flags evaluate with overrides
 * and a kill switch. Theme/locale/a11y/flags all persist and restore.
 */
import { ShellError } from "../types";
import type { PersistenceManager } from "./persistence";

// ── Theme Engine ────────────────────────────────────────────────────────────

export interface ThemeDefinition {
  readonly id: string;
  readonly nameAr: string;
  readonly tokens: Readonly<Record<string, string>>;
}

export class ThemeEngine {
  private readonly themes = new Map<string, ThemeDefinition>();
  private activeId: string;

  constructor(
    private readonly persistence: PersistenceManager,
    defaults: readonly ThemeDefinition[],
  ) {
    if (defaults.length === 0) throw new ShellError("theme", "at least one theme is required");
    for (const t of defaults) this.themes.set(t.id, t);
    const saved = this.persistence.load<string>("theme", defaults[0].id);
    this.activeId = this.themes.has(saved) ? saved : defaults[0].id;
  }

  register(theme: ThemeDefinition): void {
    if (this.themes.has(theme.id)) throw new ShellError("theme", `duplicate theme "${theme.id}"`);
    this.themes.set(theme.id, theme);
  }

  setActive(id: string): ThemeDefinition {
    const theme = this.themes.get(id);
    if (!theme) throw new ShellError("theme", `unknown theme "${id}"`);
    this.activeId = id;
    this.persistence.save("theme", id);
    return theme;
  }

  active(): ThemeDefinition {
    return this.themes.get(this.activeId)!;
  }

  token(name: string): string | undefined {
    return this.active().tokens[name];
  }
}

// ── Localization Engine ─────────────────────────────────────────────────────

export type Locale = "ar" | "en";

export class LocalizationEngine {
  private readonly dictionaries: Record<Locale, Map<string, string>> = {
    ar: new Map(),
    en: new Map(),
  };
  private activeLocale: Locale;

  constructor(private readonly persistence: PersistenceManager) {
    const saved = this.persistence.load<Locale>("locale", "ar");
    this.activeLocale = saved === "en" ? "en" : "ar";
  }

  addBundle(locale: Locale, entries: Record<string, string>): void {
    for (const [key, value] of Object.entries(entries)) {
      this.dictionaries[locale].set(key, value);
    }
  }

  setLocale(locale: Locale): void {
    this.activeLocale = locale;
    this.persistence.save("locale", locale);
  }

  locale(): Locale {
    return this.activeLocale;
  }

  /** Arabic-first: rtl for ar, ltr for en. */
  direction(): "rtl" | "ltr" {
    return this.activeLocale === "ar" ? "rtl" : "ltr";
  }

  /** Lookup with cross-locale fallback, then the key itself (never undefined). */
  t(key: string): string {
    return (
      this.dictionaries[this.activeLocale].get(key) ??
      this.dictionaries[this.activeLocale === "ar" ? "en" : "ar"].get(key) ??
      key
    );
  }
}

// ── Accessibility Layer ─────────────────────────────────────────────────────

export interface A11yPreferences {
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  /** Bounded 0.8 .. 1.6 — the layer clamps every write. */
  readonly fontScale: number;
}

const A11Y_DEFAULT: A11yPreferences = { reducedMotion: false, highContrast: false, fontScale: 1 };

export class AccessibilityLayer {
  private prefs: A11yPreferences;
  private readonly announcements: string[] = [];

  constructor(private readonly persistence: PersistenceManager) {
    this.prefs = this.persistence.load<A11yPreferences>(
      "a11y",
      A11Y_DEFAULT,
      (p) => typeof p?.fontScale === "number",
    );
  }

  preferences(): A11yPreferences {
    return this.prefs;
  }

  update(patch: Partial<A11yPreferences>): A11yPreferences {
    const fontScale = Math.max(0.8, Math.min(1.6, patch.fontScale ?? this.prefs.fontScale));
    this.prefs = { ...this.prefs, ...patch, fontScale };
    this.persistence.save("a11y", this.prefs);
    return this.prefs;
  }

  /** Screen-reader announcement queue — the UI drains it politely. */
  announce(message: string): void {
    this.announcements.push(message);
    while (this.announcements.length > 50) this.announcements.shift();
  }

  drainAnnouncements(): readonly string[] {
    return this.announcements.splice(0, this.announcements.length);
  }
}

// ── Feature Flag Manager ────────────────────────────────────────────────────

export interface FlagDefinition {
  readonly id: string;
  readonly defaultValue: boolean;
  readonly description: string;
}

export class FeatureFlagManager {
  private readonly flags = new Map<string, FlagDefinition>();
  private overrides: Record<string, boolean>;
  private killSwitch = false;

  constructor(private readonly persistence: PersistenceManager) {
    this.overrides = this.persistence.load<Record<string, boolean>>("flags", {});
  }

  define(flag: FlagDefinition): void {
    if (this.flags.has(flag.id)) throw new ShellError("flags", `duplicate flag "${flag.id}"`);
    this.flags.set(flag.id, flag);
  }

  /** Kill switch: every flag evaluates FALSE until lifted (incident brake). */
  setKillSwitch(on: boolean): void {
    this.killSwitch = on;
  }

  override(id: string, value: boolean): void {
    if (!this.flags.has(id)) throw new ShellError("flags", `unknown flag "${id}"`);
    this.overrides = { ...this.overrides, [id]: value };
    this.persistence.save("flags", this.overrides);
  }

  clearOverride(id: string): void {
    const { [id]: _dropped, ...rest } = this.overrides;
    this.overrides = rest;
    this.persistence.save("flags", this.overrides);
  }

  isEnabled(id: string): boolean {
    if (this.killSwitch) return false;
    const flag = this.flags.get(id);
    if (!flag) return false; // unknown flags are OFF — fail closed
    return this.overrides[id] ?? flag.defaultValue;
  }

  list(): readonly { flag: FlagDefinition; enabled: boolean }[] {
    return [...this.flags.values()].map((flag) => ({ flag, enabled: this.isEnabled(flag.id) }));
  }
}
