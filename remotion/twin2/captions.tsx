/**
 * العناوين: HTML داخل الإطار (RTL، خطّ عربي) بكشفٍ بمؤشّر. الكشف بقصٍّ مستطيل
 * (clip-path: inset) لا بتجزئة الحروف — فلا يُكسر ربط الحروف العربية.
 * الدخول من اليمين إلى اليسار كاتجاه القراءة؛ والمؤشّر عند الحافة اليسرى للمكشوف.
 */
import React from "react";
import { CAPTIONS, type CaptionDef } from "./timeline";
import { easeInOut, easeOut, prog } from "./kit/ease";
import { C, FONT } from "./palette";

const IN = 0.55;
const OUT = 0.4;

const One: React.FC<{ c: CaptionDef; t: number }> = ({ c, t }) => {
  if (t < c.from - 0.02 || t > c.to + 0.02) return null;
  const pin = easeOut(prog(t, c.from, c.from + IN));
  const pout = easeInOut(prog(t, c.to - OUT, c.to));
  const hero = c.style === "hero";
  const size = hero ? 54 : 40;
  const caretOn = pin < 0.999 ? 1 : 1 - prog(t, c.from + IN, c.from + IN + 0.35);
  const rise = (1 - pin) * 10 - pout * 8;
  const clipL = (1 - pin) * 100;
  const clipR = pout * 100;
  const parts = hero ? c.text.split("... ") : [c.text];
  return (
    <div
      style={{
        position: "absolute",
        right: hero ? 96 : 72,
        top: hero ? 92 : 64,
        direction: "rtl",
        fontFamily: FONT,
        transform: `translateY(${rise}px)`,
        opacity: 1 - pout * 0.35,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "inline-block",
          padding: hero ? "4px 2px 12px" : "12px 26px 14px 30px",
          borderRadius: hero ? 0 : 18,
          background: hero
            ? "transparent"
            : "linear-gradient(135deg, rgba(5,13,30,0.78), rgba(10,26,52,0.62))",
          border: hero ? "none" : "1px solid rgba(122,232,247,0.28)",
          boxShadow: hero
            ? "none"
            : "0 10px 40px rgba(0,6,18,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
          clipPath: `inset(-30px ${clipR}% -30px ${clipL}%)`,
          color: "#fff",
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.25,
          letterSpacing: 0,
          whiteSpace: "nowrap",
          textShadow: "0 2px 22px rgba(2,8,20,0.75), 0 0 2px rgba(2,8,20,0.6)",
        }}
      >
        {!hero && (
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 3,
              transform: "rotate(45deg)",
              background: C.cyan,
              boxShadow: `0 0 14px ${C.cyan}`,
              marginLeft: 16,
              verticalAlign: "middle",
            }}
          />
        )}
        {parts.length === 2 ? (
          <>
            <span>{parts[0]}</span>
            <span style={{ letterSpacing: 2 }}>... </span>
            <span style={{ color: C.cyanSoft }}>{parts[1]}</span>
          </>
        ) : (
          <span>{c.text}</span>
        )}
        {hero && (
          <span
            style={{
              position: "absolute",
              right: 0,
              bottom: 2,
              height: 4,
              width: `${easeInOut(prog(t, c.from + 0.3, c.from + 1.1)) * 46}%`,
              borderRadius: 2,
              background: `linear-gradient(270deg, ${C.cyan}, rgba(34,211,238,0))`,
              boxShadow: `0 0 16px ${C.cyan}`,
            }}
          />
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: hero ? 6 : 8,
          bottom: hero ? 10 : 8,
          left: `${clipL}%`,
          width: 3,
          marginLeft: -2,
          borderRadius: 2,
          background: C.cyanSoft,
          boxShadow: `0 0 18px ${C.cyan}, 0 0 4px #fff`,
          opacity: caretOn * (1 - pout),
        }}
      />
    </div>
  );
};

export const Captions: React.FC<{ t: number; only?: string[] }> = ({ t, only }) => (
  <>
    {CAPTIONS.filter((c) => !only || only.includes(c.id)).map((c) => (
      <One key={c.id} c={c} t={t} />
    ))}
  </>
);
