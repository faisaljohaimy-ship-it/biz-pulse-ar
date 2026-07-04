import { useEffect, useRef, useState } from 'react';

export const INTRO_KEY = 'nexios-intro-seen';

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showLogo, setShowLogo] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* noop */ }
      setLeaving(true);
      setTimeout(onDone, 500);
    };

    const guard = setTimeout(() => { if (v.readyState < 2) finish(); }, 3000);
    const hardCap = setTimeout(finish, 16000);
    const onTime = () => { if (v.currentTime >= 11) setShowLogo(true); };

    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', finish);
    v.addEventListener('error', finish);
    v.play().catch(finish);

    return () => {
      clearTimeout(guard);
      clearTimeout(hardCap);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', finish);
      v.removeEventListener('error', finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* noop */ }
    setLeaving(true);
    setTimeout(onDone, 500);
  };

  return (
    <div
      className={
        'fixed inset-0 z-[200] bg-[#04070F] transition-opacity duration-500 ' +
        (leaving ? 'opacity-0 pointer-events-none' : 'opacity-100')
      }
    >
      <video
        ref={videoRef}
        src="/nexios-intro.mp4"
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
      />
      <div
        className={
          'absolute inset-0 flex flex-col items-center justify-center bg-[#04070F]/70 transition-opacity duration-700 ' +
          (showLogo ? 'opacity-100' : 'opacity-0')
        }
      >
        <div className="text-4xl font-bold tracking-[0.35em] text-white drop-shadow-[0_0_28px_rgba(16,185,129,0.6)]">
          NEXIOS<span className="text-emerald-400"> AI</span>
        </div>
        <div className="mt-3 text-sm tracking-[0.2em] text-cyan-200/80">
          مَنْصَةُ إِنْجَازِ الأَعْمَالِ التَّنْفِيذِيَّة
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/40">
          Executive Delivery Platform · Vision 2030
        </div>
      </div>
      <button
        type="button"
        onClick={skip}
        aria-label="تخطي المقدمة"
        className="absolute top-[calc(1rem+env(safe-area-inset-top))] start-4 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/80 backdrop-blur hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        تخطي ⏭
      </button>
    </div>
  );
}

export default IntroSplash;
