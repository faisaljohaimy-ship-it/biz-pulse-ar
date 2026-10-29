/**
 * مدخل الذراع غير المتّصلة لسكربت `scripts/rag-measure.sh`: JSON على stdout،
 * جدول مقروء على stderr — كما تفعل ذراع Postgres. يُحزَم بـesbuild عابرًا
 * (لا ملف مبني في المستودع) ويُشغَّل بـnode، بلا قاعدة ولا شبكة.
 */
import { formatOfflineMeasureAr, runOfflineMeasure } from "./offline-measure.server";

const measure = runOfflineMeasure();
process.stdout.write(`${JSON.stringify(measure)}\n`);
process.stderr.write(`${formatOfflineMeasureAr(measure)}\n`);
