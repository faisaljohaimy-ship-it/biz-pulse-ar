import type { ExecutiveProfile, VoiceCue } from "./types";
import { assertVoiceCue } from "./contracts";

export function composeWelcome(profile: ExecutiveProfile): VoiceCue {
  const nameAr = profile.nameAr?.trim();
  const nameEn = profile.nameEn?.trim();
  const org = profile.organization?.trim();
  const isAr = profile.language === "ar";
  let text: string;
  if (isAr) {
    const salutation = nameAr ? `مرحباً ${nameAr}` : "مرحباً بكم";
    const orgPart = org ? ` من ${org}` : "";
    text = `${salutation}${orgPart}. أنا FINN، مساعدكم التنفيذي لمنصة إدارة الأمن الصناعي.`;
  } else {
    const salutation = nameEn ? `Welcome, ${nameEn}` : "Welcome";
    const orgPart = org ? ` from ${org}` : "";
    text = `${salutation}${orgPart}. I'm FINN, your executive assistant for the Industrial Security Platform.`;
  }
  const cue: VoiceCue = {
    text,
    language: profile.language,
    pace: "normal",
    emphasis: "warm",
  };
  assertVoiceCue(cue);
  return cue;
}
