import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  FILM_ACTION_ICONS,
  TwinFilmPlayer,
  useFullscreen,
  type TwinFilmHandle,
} from "@/components/twin/TwinFilmPlayer";
import { controlFor, type FilmControl } from "@/components/twin/twin-film-model";
import "@/styles/sadeed-cinematic.css";

/**
 * التجربة السينمائية — صفحة الفيلم كاملةً.
 *
 * **ما حُذف ولماذا (أمر المالك ٢٠٢٦/١٠/٢٣ «راجع المرفقات للتحسين»):** كان المسرح يرسم طبقاتٍ
 * فوق صورة بطلٍ خارجية مستضافة عند طرفٍ ثالث، وفي الصورة واجهةٌ مخبوزة بنصوصها وأرقامها
 * المختلَقة وشارة «بثّ» — تتراكم فوق عنوان الصفحة الحقيقي فيتداخل النصّ على الجوال (المادة ٢٧).
 * فسقطت الصورة الخارجية وكلّ طبقةٍ زخرفية كانت تحرّكها، وصار المسرح **مشغّل الفيلم المُصيَّر**
 * (`TwinFilmPlayer`) — مضمَّنًا، بإفصاحه الصادق في المشغّل نفسه.
 *
 * العنوان والوصف نصٌّ حقيقيّ **فوق** مساحة الفيديو لا عليها، في كل عرض — فلا تداخل ببنية
 * التخطيط لا بحسن الحظّ (يحرسه العقد بقياس الصناديق).
 */

export const Route = createFileRoute("/cinematic")({
  head: () => ({
    meta: [
      { title: "SADEED | التجربة السينمائية" },
      {
        name: "description",
        content: "فيلم موشن جرافيك توضيحي مُصيَّر مسبقًا عن التوأم الرقمي والأمن الصناعي",
      },
    ],
  }),
  component: SadeedCinematicExperience,
});

const COPY = {
  ar: {
    back: "العودة إلى سديد",
    title: "التوأم الرقمي للأمن الصناعي",
    tagline: "طاقة متصلة · استجابة ذكية · رؤية وطنية",
    enterFullscreen: "ملء الشاشة",
    exitFullscreen: "إنهاء ملء الشاشة",
  },
  en: {
    back: "Back to SADEED",
    title: "The industrial-security digital twin",
    tagline: "Connected energy · Smart response · National vision",
    enterFullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
  },
} as const;

function SadeedCinematicExperience() {
  const { locale } = useI18n();
  const lang = locale === "en" ? "en" : "ar";
  const ar = lang === "ar";
  const copy = COPY[lang];
  const player = useRef<TwinFilmHandle>(null);
  const [control, setControl] = useState<FilmControl>(() => controlFor("idle", null, lang));
  const fullscreen = useFullscreen();
  const BackIcon = ar ? ArrowRight : ArrowLeft;
  const ControlIcon = FILM_ACTION_ICONS[control.action];
  const FullscreenIcon = fullscreen.active ? Minimize2 : Maximize2;
  const fullscreenLabel = fullscreen.active ? copy.exitFullscreen : copy.enterFullscreen;

  return (
    <main className="sd-cinema" dir={ar ? "rtl" : "ltr"}>
      <div className="sd-cinema-toolbar">
        <Link to="/" className="twin-film-btn nx-focus-ring sd-cinema-back">
          <BackIcon aria-hidden size={18} />
          {copy.back}
        </Link>
        <span className="sd-cinema-label" dir="ltr">
          SADEED · CINEMATIC DIGITAL TWIN
        </span>
        <div className="sd-cinema-actions">
          <button
            type="button"
            className="twin-film-btn nx-focus-ring sd-cinema-control"
            data-action={control.action}
            aria-label={control.label}
            aria-disabled={control.disabled || undefined}
            title={control.label}
            onClick={() => player.current?.toggle()}
          >
            <ControlIcon aria-hidden size={18} />
            <span className="twin-film-btn-text">{control.label}</span>
          </button>
          {fullscreen.supported && (
            <button
              type="button"
              className="twin-film-btn nx-focus-ring sd-cinema-control"
              aria-label={fullscreenLabel}
              title={fullscreenLabel}
              onClick={() => player.current?.toggleFullscreen()}
            >
              <FullscreenIcon aria-hidden size={18} />
              <span className="twin-film-btn-text">{fullscreenLabel}</span>
            </button>
          )}
        </div>
      </div>
      <header className="sd-cinema-head">
        <h1>{copy.title}</h1>
        <p>{copy.tagline}</p>
      </header>
      <div className="sd-cinema-stage">
        <TwinFilmPlayer ref={player} priority onControlChange={setControl} />
      </div>
    </main>
  );
}
