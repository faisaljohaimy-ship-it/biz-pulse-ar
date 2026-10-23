/**
 * S1 — الافتتاح (0–8 ث): حارسٌ يطلّ على المحطة عند الغروب (01) بدفعٍ بطيء، ثم حارسٌ بجهازه اللاسلكي
 * عند السياج (18). الصور مولَّدة بالذكاء الاصطناعي؛ الإضافة الرسومية الوحيدة وهجُ شمسٍ يتنفّس
 * وحلقاتٌ رقيقة حول اللاسلكي (تتزامن مع نقرته الصوتية عند 5.5 ث).
 */
import React from "react";
import { camAt, Over, PlateImg, Ring, view, World, type CamKey } from "../kit";

export const S1_HERO_KEYS: ReadonlyArray<CamKey> = [
  [-0.5, 836, 470, 1.0],
  [6.0, 960, 440, 1.17],
];
export const S1Hero: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S1_HERO_KEYS, t));
  const breathe = 0.5 + 0.18 * Math.sin(t * 1.7);
  return (
    <World v={v}>
      <PlateImg file="p01.jpg" />
      <PlateImg file="p01-glow.jpg" blend="screen" opacity={0.3 * breathe} />
      <Over blend="screen">
        <defs>
          <radialGradient id="sunBloom">
            <stop offset="0" stopColor="#fff2c8" stopOpacity="0.9" />
            <stop offset="0.3" stopColor="#ffc070" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={1174} cy={343} r={150} fill="url(#sunBloom)" opacity={0.42 * breathe} />
      </Over>
    </World>
  );
};

export const S1_RADIO_KEYS: ReadonlyArray<CamKey> = [
  [5.0, 700, 560, 1.0],
  [8.8, 650, 560, 1.15],
];
export const S1Radio: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S1_RADIO_KEYS, t));
  return (
    <World v={v}>
      <PlateImg file="p18.jpg" />
      <PlateImg file="p18-glow.jpg" blend="screen" opacity={0.28 + 0.06 * Math.sin(t * 2.1)} />
      <Over>
        {/* موجات اللاسلكي: ثلاث حلقاتٍ رقيقة من الجهاز على الخصر تبدأ مع نقرة 5.5 ث */}
        {[0, 1, 2].map((i) => (
          <Ring
            key={i}
            x={642}
            y={606}
            r0={8}
            r1={64}
            p={(t - (5.5 + i * 0.5)) / 1.3}
            px={1.5}
            k={v.k}
            color="#bff7ff"
            a={0.55}
          />
        ))}
      </Over>
    </World>
  );
};
