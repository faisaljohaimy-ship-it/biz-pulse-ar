/**
 * مدخل الذراع غير المتّصلة لسكربت `scripts/rag-measure.sh`: JSON على stdout
 * (سطرٌ للذراع الذاكرية، ثم سطرٌ لمجمِّع الخطوة ٢ غير المتّصل)، جدولان
 * مقروءان على stderr — كما تفعل ذراع Postgres. يُحزَم بـesbuild عابرًا (لا
 * ملف مبني في المستودع) ويُشغَّل بـnode، بلا قاعدة ولا شبكة.
 */
import {
  formatAggregatorMeasureAr,
  formatOfflineMeasureAr,
  runAggregatorOfflineMeasure,
  runOfflineMeasure,
} from "./offline-measure.server";

const measure = runOfflineMeasure();
process.stdout.write(`${JSON.stringify(measure)}\n`);
process.stderr.write(`${formatOfflineMeasureAr(measure)}\n`);

const aggregated = await runAggregatorOfflineMeasure();
process.stdout.write(`${JSON.stringify(aggregated)}\n`);
process.stderr.write(`${formatAggregatorMeasureAr(aggregated)}\n`);
