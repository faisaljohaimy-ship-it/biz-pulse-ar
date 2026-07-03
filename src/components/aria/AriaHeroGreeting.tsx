import { useEffect, useRef, useState } from 'react';

export function AriaHeroGreeting() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'video' | 'still'>('video');
  const [soundOn, setSoundOn] = useState(false);

  // FORCED greeting: plays muted on every load (autoplay-safe).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setMode('still'); return; }
    const v = videoRef.current;
    if (!v) return;
    const settle = () => setMode('still');
    v.addEventListener('ended', settle);
    v.addEventListener('error', settle);
    const guard = setTimeout(() => { if (v.readyState < 2) settle(); }, 3000);
    v.play().catch(settle);

    // First user tap anywhere unlocks her voice for the remainder of the greeting.
    const unlock = () => {
      if (videoRef.current && !videoRef.current.ended) {
        videoRef.current.muted = false;
        setSoundOn(true);
      }
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });

    return () => {
      v.removeEventListener('ended', settle);
      v.removeEventListener('error', settle);
      clearTimeout(guard);
      window.removeEventListener('pointerdown', unlock);
    };
  }, []);

  const media =
    'absolute left-1/2 top-[6%] h-[94%] w-auto max-w-none -translate-x-1/2 ' +
    'object-contain object-top';

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute left-1/2 top-[40%] h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,225,255,0.16),rgba(16,185,129,0.07)_45%,transparent_72%)]" />
      {mode === 'video' ? (
        <video ref={videoRef} src="/aria-greeting.mp4" muted playsInline preload="auto"
               className={media + ' opacity-[0.45]'} />
      ) : (
        <img src="/aria.png" alt="" className={media + ' opacity-[0.36] animate-aria-sys-breathe'} />
      )}
      {/* Scrims: «بدء العملية» and all hero text stay perfectly readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#04070F]/85 via-[#04070F]/30 to-[#04070F]/90" />
      {mode === 'video' && !soundOn && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[#04070F]/70 px-4 py-1.5 text-xs text-cyan-200 backdrop-blur">
          🔊 المس الشاشة لسماع آريا
        </div>
      )}
    </div>
  );
}
