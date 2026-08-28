/**
 * مِغلاف الصوت — الدوالّ الخالصة تُقاس بمصفوفاتٍ مصنوعة، بلا متصفّح.
 *
 * البند الحاسم هو **السكون**: بايت المجال الزمني مركزه 128 لا صفر، والقراءة
 * الساذجة (`v / 255`) تعطي ~0.5 على السكون التام — أي فمٌ يبقى نصف مفتوح
 * أبدًا، وهو عطلٌ يُرى ولا يرميه شيء.
 */
import { describe, expect, it } from "vitest";
import { mouthOpennessFromRms, rmsFromTimeDomain, smoothEnvelope } from "./voice-envelope";

const filled = (v: number, n = 256) => new Uint8Array(new ArrayBuffer(n)).fill(v);

describe("rmsFromTimeDomain — 128 هو الصفر الصوتي", () => {
  it("السكون التام يعطي صفرًا لا نصفًا", () => {
    expect(rmsFromTimeDomain(filled(128))).toBe(0);
  });

  it("والانحراف الكامل يعطي واحدًا", () => {
    expect(rmsFromTimeDomain(filled(0))).toBeCloseTo(1, 5);
    expect(rmsFromTimeDomain(filled(255))).toBeCloseTo(0.9922, 3);
  });

  it("والمصفوفة الفارغة صفرٌ لا NaN", () => {
    expect(rmsFromTimeDomain(new Uint8Array(new ArrayBuffer(0)))).toBe(0);
  });

  it("والإشارة الأعلى تعطي قيمةً أعلى — رتابةٌ مطلوبة", () => {
    const quiet = rmsFromTimeDomain(filled(136));
    const loud = rmsFromTimeDomain(filled(190));
    expect(loud).toBeGreaterThan(quiet);
  });
});

describe("mouthOpennessFromRms — الفم يُغلق على السكون", () => {
  it("السكون يُغلق الفم تمامًا", () => {
    expect(mouthOpennessFromRms(0)).toBe(0);
  });

  it("وما دون أرضية الضجيج يُغلق كذلك — لا رجفة على همسٍ لا كلام", () => {
    expect(mouthOpennessFromRms(0.005)).toBe(0);
  });

  it("والصياح لا يتجاوز الواحد فلا يخرج الفكّ عن القناع", () => {
    expect(mouthOpennessFromRms(1)).toBe(1);
    expect(mouthOpennessFromRms(50)).toBe(1);
  });

  it("والكلام المعتاد يعطي فتحةً تُرى", () => {
    // نطاق الكلام العادي ~0.05–0.2 RMS؛ يجب أن يخرج منه فتحة محسوسة.
    const v = mouthOpennessFromRms(0.08);
    expect(v).toBeGreaterThan(0.35);
    expect(v).toBeLessThan(1);
  });
});

describe("smoothEnvelope — الفتح أسرع من الإغلاق", () => {
  it("يتحرّك نحو الهدف لا إليه دفعةً واحدة", () => {
    const next = smoothEnvelope(0, 1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it("والفتح أسرع من الإغلاق بنفس المسافة", () => {
    const opening = smoothEnvelope(0, 0.5) - 0;
    const closing = 0.5 - smoothEnvelope(0.5, 0);
    expect(opening).toBeGreaterThan(closing);
  });

  it("ويستقرّ على الهدف بالتكرار", () => {
    let v = 0;
    for (let i = 0; i < 60; i += 1) v = smoothEnvelope(v, 0.7);
    expect(v).toBeCloseTo(0.7, 3);
  });

  it("ولا يتجاوز الهدف — تجاوزه يعطي فكًّا يرتدّ", () => {
    let v = 0;
    for (let i = 0; i < 200; i += 1) {
      v = smoothEnvelope(v, 1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
