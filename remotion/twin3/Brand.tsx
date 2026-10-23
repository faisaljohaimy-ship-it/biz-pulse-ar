/**
 * كتلة العلامة والإفصاح (HTML، RTL، الخط المحلّي): «SADEED | سَدِيد» + «الأمن الصناعي» + سطر الإفصاح.
 * منسوخةٌ من `../twin2/scenes/S5.tsx` (التوقيت نفسه: 52.0 ← 53.5 ثبات)، وفوقها **رمز العلامة الحقيقي**
 * (`sadeed-emblem.webp` من `remotion/brand/assets/` — يُنسخ إلى مجلّد public عند التصيير) لا الرمز المسدَّس
 * الذي ولّده الذكاء الاصطناعي في الصورة 05 (لم تُستعمل الصورة 05 أصلًا).
 */
import React from "react";
import { Img, staticFile } from "remotion";
import { easeInOut, easeOut, lerp, prog, ramp } from "./kit/ease";
import { C, FONT } from "./palette";
import { DISCLOSURE } from "./timeline";

/** كتلة العلامة: HTML. تُستدعى بزمن مجمَّد بعد 53.5. */
export const Brand: React.FC<{ t: number }> = ({ t }) => {
  const a = 52.0;
  if (t < a - 0.02) return null;
  const arP = easeOut(prog(t, a + 0.0, a + 0.75));
  const laP = easeOut(prog(t, a + 0.25, a + 0.95));
  const divP = easeInOut(prog(t, a + 0.1, a + 0.7));
  const subP = easeOut(prog(t, a + 0.7, a + 1.3));
  const lineP = easeInOut(prog(t, a + 0.75, a + 1.4));
  const shine = easeInOut(prog(t, a + 0.8, a + 1.4));
  const discl = ramp(t, a + 0.6, a + 1.2);
  const glow = 0.5 + 0.12 * Math.sin(Math.min(t, 53.5) * 2.4);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        direction: "rtl",
        fontFamily: FONT,
        pointerEvents: "none",
      }}
    >
      {/* رمز العلامة الحقيقي */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 58,
          display: "flex",
          justifyContent: "center",
          opacity: arP,
          transform: `scale(${0.86 + 0.14 * arP})`,
          filter: `drop-shadow(0 0 ${22 * glow}px rgba(34,211,238,0.55))`,
        }}
      >
        <Img
          src={staticFile("sadeed-emblem.webp")}
          style={{ width: 150, height: 150, display: "block" }}
        />
      </div>
      {/* هالة خلف العلامة */}
      <div
        style={{
          position: "absolute",
          left: 240,
          top: 140,
          width: 800,
          height: 340,
          background: `radial-gradient(closest-side, rgba(34,211,238,${0.2 * glow * arP}), rgba(34,211,238,0))`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 232,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 38,
          direction: "ltr",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 92,
            letterSpacing: `${lerp(0.5, 0.14, laP)}em`,
            color: "#fff",
            opacity: laP,
            textShadow: "0 0 28px rgba(34,211,238,0.55), 0 2px 18px rgba(2,8,20,0.7)",
            transform: `translateX(${(1 - laP) * -26}px)`,
            paddingLeft: "0.14em",
          }}
        >
          SADEED
        </div>
        <div
          style={{
            width: 4,
            height: 118 * divP,
            borderRadius: 2,
            background: `linear-gradient(180deg, ${C.cyanSoft}, ${C.cyan})`,
            boxShadow: `0 0 20px ${C.cyan}`,
          }}
        />
        <div style={{ position: "relative", direction: "rtl" }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 138,
              lineHeight: 1.1,
              color: "#fff",
              textShadow: "0 0 34px rgba(34,211,238,0.6), 0 2px 18px rgba(2,8,20,0.7)",
              clipPath: `inset(-30px ${0}% -30px ${(1 - arP) * 100}%)`,
            }}
          >
            سَدِيد
          </div>
          <div
            style={{
              position: "absolute",
              top: 14,
              bottom: 14,
              left: `${(1 - arP) * 100}%`,
              width: 3,
              background: C.cyanSoft,
              boxShadow: `0 0 20px ${C.cyan}`,
              opacity: arP < 0.999 ? 1 : 0,
            }}
          />
        </div>
      </div>
      {/* لمعة تعبر العلامة */}
      <div
        style={{
          position: "absolute",
          left: 250 + shine * 780,
          top: 222,
          width: 90,
          height: 160,
          transform: "skewX(-18deg)",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.4), rgba(255,255,255,0))",
          mixBlendMode: "screen",
          opacity: shine > 0 && shine < 1 ? 1 : 0,
        }}
      />
      {/* السطر الفرعيّ */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 400,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 22,
          opacity: subP,
          transform: `translateY(${(1 - subP) * 12}px)`,
        }}
      >
        <div
          style={{
            height: 2,
            width: 120 * lineP,
            background: `linear-gradient(270deg, ${C.cyan}, rgba(34,211,238,0))`,
            boxShadow: `0 0 10px ${C.cyan}`,
          }}
        />
        <div
          style={{
            fontWeight: 400,
            fontSize: 40,
            color: C.cyanSoft,
            textShadow: "0 2px 16px rgba(2,8,20,0.7)",
          }}
        >
          الأمن الصناعي
        </div>
        <div
          style={{
            height: 2,
            width: 120 * lineP,
            background: `linear-gradient(90deg, ${C.cyan}, rgba(34,211,238,0))`,
            boxShadow: `0 0 10px ${C.cyan}`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 90,
          background: "linear-gradient(180deg, rgba(3,10,24,0), rgba(3,10,24,0.65))",
          opacity: discl,
        }}
      />
      {/* سطر الإفصاح */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 26,
          textAlign: "center",
          fontSize: 16,
          color: "rgba(214,232,246,0.78)",
          opacity: discl,
          textShadow: "0 1px 8px rgba(2,8,20,0.9)",
        }}
      >
        {DISCLOSURE}
      </div>
    </div>
  );
};
