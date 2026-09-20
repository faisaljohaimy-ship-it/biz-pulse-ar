/**
 * Region context — a lightweight, client-only store for the active
 * Industrial Security region. Every screen reads the same context so
 * one system serves all four administrations (no forked routes).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_REGION_ID,
  REGION_ACCENT_HEX,
  REGION_ACCENT_RGB,
  REGIONS,
  getRegion,
  type Region,
  type RegionId,
} from "./regions";
import { REGION_PARAM, resolveRegionScope } from "./regions/region-scope";

// Semantic accent tokens driven by the active region. Setting these inline on
// :root overrides both the light and dark stylesheet values, so every
// Tailwind primary/accent/ring utility across the whole system — nav, icons,
// buttons, borders, rings, glows — repaints in the active region's colour for
// instant regional distinction.
const REGION_ACCENT_TOKENS = [
  "--primary",
  "--accent",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--sidebar-accent",
] as const;

interface RegionContextValue {
  region: Region;
  regionId: RegionId;
  setRegion: (id: RegionId) => void;
  regions: readonly Region[];
}

const RegionContext = createContext<RegionContextValue | null>(null);
const STORAGE_KEY = "nexios.region";

export function RegionProvider({ children }: { children: ReactNode }) {
  const [regionId, setRegionState] = useState<RegionId>(DEFAULT_REGION_ID);

  /**
   * الاستئناف: **العنوان أوّلًا ثمّ التفضيل المحفوظ.**
   *
   * كان التخزين وحده هو المرجع، فرابطٌ يُرسَل من مديرٍ في الشرقية إلى
   * زميلٍ في الجنوبية يفتح عند كلٍّ منهما على منطقةٍ مختلفة — **نفس
   * الرابط يعطي رقمين**، فتستحيل الإحالة إلى شاشةٍ بعينها.
   *
   * ويُتحقَّق من وسيط العنوان قبل قبوله (`resolveRegionScope`): نصٌّ
   * مجهول يسقط إلى التفضيل ثمّ الافتراضي، ولا يُمرَّر إلى استعلام.
   */
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get(REGION_PARAM);
      const fromStorage = window.localStorage.getItem(STORAGE_KEY);
      setRegionState(resolveRegionScope({ fromUrl, fromStorage }));
    } catch {
      /* نافذة محظورة أو تخزين معطّل — يبقى الافتراضي */
    }
  }, []);

  /**
   * ومزامنة العنوان مع المنطقة الفاعلة — بـ`replaceState` لا `push`.
   *
   * `push` يُكدّس مدخلًا في تاريخ التصفّح عند كل تبديل، فيصير زرّ الرجوع
   * يتنقّل بين المناطق بدل أن يرجع إلى الصفحة السابقة — وهو سلوكٌ يكسر
   * توقّع المستخدم ويكسر زرّ الرجوع في الشريط العلوي معه.
   */
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get(REGION_PARAM) === regionId) return;
      url.searchParams.set(REGION_PARAM, regionId);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
      /* noop */
    }
  }, [regionId]);

  // Drive the whole system's colour from the active region: the pulse halo
  // (--nx-region-rgb) AND every semantic accent token, so all system chrome and
  // icons repaint in the active region's colour — clear visual distinction
  // between the four regions/sectors. Updates live on region switch.
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.style.setProperty("--nx-region-rgb", REGION_ACCENT_RGB[regionId]);
      const hex = REGION_ACCENT_HEX[regionId];
      for (const token of REGION_ACCENT_TOKENS) {
        root.style.setProperty(token, hex);
      }
      root.setAttribute("data-region", regionId);
    } catch {
      /* noop */
    }
  }, [regionId]);

  const setRegion = useCallback((id: RegionId) => {
    setRegionState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* noop */
    }
    try {
      window.dispatchEvent(new CustomEvent("nexios:region-change", { detail: { id } }));
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo<RegionContextValue>(
    () => ({ region: getRegion(regionId), regionId, setRegion, regions: REGIONS }),
    [regionId, setRegion],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) {
    // Defensive fallback — never crash if a component is rendered outside
    // the provider (e.g. during Storybook / isolated tests).
    return {
      region: getRegion(DEFAULT_REGION_ID),
      regionId: DEFAULT_REGION_ID,
      setRegion: () => {},
      regions: REGIONS,
    };
  }
  return ctx;
}
