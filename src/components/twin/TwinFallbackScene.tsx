/**
 * البديل الذي لا يتعطّل — **المشهد المرسوم حين يسقط WebGL**.
 *
 * هذا هو مشهد `/nx-twin` المتساوي القياس نفسه، مستخرَجًا من الصفحة إلى
 * مكوّن مستقلّ حتى يصلح **بديلًا** لا نسخةً ثانية: متصفّح مقفل، جهاز
 * بلا تسريع، أو عملية GPU سقطت ⇒ لا كانفس ولا شاشة سوداء، بل الأعمدة
 * نفسها بأرقامها نفسها. طبقة الحركة والألوان كلّها من `.nx-tw-*` القائمة
 * في `styles.css` — لا صنف جديد، ولا لون مكتوب هنا.
 *
 * والمواضع من `twin-scene-model` وحده: المشهدان — المرسوم والثلاثي —
 * يضعان المنطقة في المكان نفسه، فمن سقط عنه التسريع لا تنتقل تحته الخريطة.
 */
import { REGIONS, type RegionId } from "@/lib/regions";
import { PAD_RADIUS, TWIN_PADS, padAccent, type TwinReading } from "./twin-scene-model";

const W = 760;
const H = 520;
const HUB = { x: W / 2, y: 276 };
const SPREAD_X = 236 / PAD_RADIUS;
const SPREAD_Y = 148 / PAD_RADIUS;

function screenOf(id: RegionId): { x: number; y: number } {
  const [x, z] = TWIN_PADS[id];
  return { x: HUB.x + x * SPREAD_X, y: HUB.y - z * SPREAD_Y };
}

export interface TwinFallbackSceneProps {
  readonly ar: boolean;
  readonly readings: readonly TwinReading[];
  readonly activeRegionId?: RegionId;
}

export function TwinFallbackScene({ ar, readings, activeRegionId }: TwinFallbackSceneProps) {
  const byId = new Map(readings.map((r) => [r.id, r.pct]));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="nx-tw-svg"
      data-twin-fallback=""
      aria-hidden
      focusable="false"
    >
      {/* أرضية متساوية القياس */}
      <g className="nx-tw-floor">
        {Array.from({ length: 9 }, (_, i) => {
          const t = (i - 4) * 58;
          return (
            <g key={i}>
              <line x1={HUB.x + t} y1={HUB.y - 128} x2={HUB.x + t + 150} y2={HUB.y + 22} />
              <line x1={HUB.x + t} y1={HUB.y - 128} x2={HUB.x + t - 150} y2={HUB.y + 22} />
            </g>
          );
        })}
      </g>

      {/* القلب — نبضٌ وحلقة مدارية وحلقة صدى تتسع */}
      <g className="nx-tw-hub">
        <ellipse cx={HUB.x} cy={HUB.y} rx="44" ry="17.5" className="nx-tw-orbit" />
        <ellipse cx={HUB.x} cy={HUB.y} rx="30" ry="12" className="nx-tw-hub-ping" />
        <ellipse cx={HUB.x} cy={HUB.y} rx="30" ry="12" />
        <ellipse cx={HUB.x} cy={HUB.y} rx="16" ry="6.5" className="nx-tw-hub-in" />
      </g>

      {/* أنابيب البيانات — التوجيه يسري ذهابًا والإفادة تعود إيابًا */}
      {REGIONS.map((region, i) => {
        const p = screenOf(region.id);
        return (
          <g key={`c-${region.id}`} style={{ ["--tw-accent" as string]: padAccent(region.id) }}>
            <line x1={HUB.x} y1={HUB.y} x2={p.x} y2={p.y} className="nx-tw-conduit" />
            <line
              x1={HUB.x}
              y1={HUB.y}
              x2={p.x}
              y2={p.y}
              className="nx-tw-pulse"
              style={{ ["--tw-i" as string]: i }}
            />
            <line
              x1={p.x}
              y1={p.y}
              x2={HUB.x}
              y2={HUB.y}
              className="nx-tw-pulse nx-tw-pulse--back"
              style={{ ["--tw-i" as string]: i }}
            />
          </g>
        );
      })}

      {/* الأعمدة — ارتفاع الضوء هو النسبة، ولا عمود لمنطقة لم تُقَس */}
      {REGIONS.map((region, i) => {
        const p = screenOf(region.id);
        const pct = byId.get(region.id) ?? null;
        const h = pct === null ? 0 : 24 + (pct / 100) * 118;
        return (
          <g
            key={region.id}
            className="nx-tw-node"
            data-active={region.id === activeRegionId || undefined}
            style={{
              ["--tw-accent" as string]: padAccent(region.id),
              ["--tw-i" as string]: i,
            }}
          >
            <ellipse cx={p.x} cy={p.y} rx="52" ry="21" className="nx-tw-pad" />
            <ellipse cx={p.x} cy={p.y} rx="34" ry="13" className="nx-tw-pad-in" />
            {pct !== null && (
              <>
                <rect
                  x={p.x - 15}
                  y={p.y - h}
                  width="30"
                  height={h}
                  rx="4"
                  className="nx-tw-tower"
                />
                <rect
                  x={p.x - 10}
                  y={p.y - h + 6}
                  width="7"
                  height={Math.max(h - 12, 4)}
                  rx="3.5"
                  className="nx-tw-tower-core"
                />
                <ellipse cx={p.x} cy={p.y - h} rx="15" ry="6" className="nx-tw-cap-halo" />
                <ellipse cx={p.x} cy={p.y - h} rx="15" ry="6" className="nx-tw-cap" />
              </>
            )}
            <text
              x={p.x}
              y={p.y + 42}
              textAnchor="middle"
              className="nx-tw-name"
              fill="currentColor"
            >
              {ar ? region.shortAr : region.shortEn}
            </text>
            <rect
              x={p.x - (pct === null ? 34 : 26)}
              y={(pct === null ? p.y - 34 : p.y - h - 16) - 14}
              width={pct === null ? 68 : 52}
              height="20"
              rx="10"
              className="nx-tw-chip"
            />
            <text
              x={p.x}
              y={pct === null ? p.y - 34 : p.y - h - 16}
              textAnchor="middle"
              className="nx-tw-val"
              fill="currentColor"
              data-empty={pct === null || undefined}
            >
              {pct === null ? (ar ? "لم يُقَس" : "not measured") : `${Math.round(pct)}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default TwinFallbackScene;
