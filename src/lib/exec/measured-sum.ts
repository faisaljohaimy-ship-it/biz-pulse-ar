/**
 * جمعٌ يحفظ الفرق بين الصفر والغياب (المادة ٢٧).
 *
 * `[].reduce((s, x) => s + x, 0)` يعيد صفرًا لقائمة فارغة ولقائمة كلّها
 * أصفار على حدٍّ سواء — وهذا بالضبط ما جعل «منجز اليوم» يعرض `0` على
 * الرئيسية: لا عمود في القاعدة يحمل العدد، فكُتب صفرٌ لكل وكيل ثم جُمعت
 * الأصفار فخرج «قياسٌ» لم يقع. الصفر قياسٌ، والغياب ليس صفرًا.
 *
 * القاعدة هنا: يُجمع **المقيس وحده**؛ فإن لم يُقَس شيء عاد `null`.
 * صفرٌ حقيقي (وكلاء قِيسوا وكلّهم صفر) يبقى صفرًا — وهو الفرق الذي تحفظه
 * الدالة ولا يحفظه `reduce` المباشر.
 *
 * وحدة منفصلة عن `showcase-simulation.server.ts` عمدًا: يستهلكها المسار
 * الحيّ والمحاكاة معًا، ووضعها في وحدة خادم يجرّ تلك الوحدة إلى حيث لا
 * تلزم.
 */
export function sumMeasured(values: ReadonlyArray<number | null | undefined>): number | null {
  let total = 0;
  let sawMeasurement = false;
  for (const v of values) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    total += v;
    sawMeasurement = true;
  }
  return sawMeasurement ? total : null;
}
