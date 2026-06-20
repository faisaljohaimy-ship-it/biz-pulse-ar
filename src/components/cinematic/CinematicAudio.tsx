import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Procedural cinematic ambient layer.
 * Uses Web Audio API to synthesize a luxury futuristic pad:
 *  - 3 detuned sine oscillators (A2, E3, B3) — sub bass + open fifth
 *  - lowpass filter swept by LFO for organic motion
 *  - long reverb-like delay feedback for space
 *  - very gentle gain (0.06) — atmospheric, never intrusive
 *
 * Muted by default. No external assets, no network calls.
 */
export function CinematicAudio({ isAr }: { isAr: boolean }) {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const start = async () => {
    if (ctxRef.current) {
      await ctxRef.current.resume();
      masterRef.current?.gain.cancelScheduledValues(ctxRef.current.currentTime);
      masterRef.current?.gain.linearRampToValueAtTime(0.06, ctxRef.current.currentTime + 1.5);
      return;
    }
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    masterRef.current = master;

    // filter — warm, slow sweep
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.7;
    filter.connect(master);

    // delay for space
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.45;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(filter);

    // detuned sine pad — open fifth (A2 + E3) + air (B3) for "luxury futuristic"
    const freqs = [55, 82.41, 110, 164.81, 246.94];
    const oscs: OscillatorNode[] = [];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === freqs.length - 1 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (i - 2) * 5;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.18 : 0.12 - i * 0.015;
      o.connect(g).connect(filter);
      o.connect(g).connect(delay);
      o.start();
      oscs.push(o);
    });

    // LFO on filter cutoff — slow breathing
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 380;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    // very subtle shimmer — high sine pulsed by second LFO
    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = 1318.5; // E6
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0;
    const shimLfo = ctx.createOscillator();
    shimLfo.frequency.value = 0.13;
    const shimLfoGain = ctx.createGain();
    shimLfoGain.gain.value = 0.018;
    shimLfo.connect(shimLfoGain).connect(shimmerGain.gain);
    shimmer.connect(shimmerGain).connect(filter);
    shimmer.start();
    shimLfo.start();

    nodesRef.current = [filter, delay, fb, wet, lfo, lfoGain, shimmer, shimmerGain, shimLfo, shimLfoGain, ...oscs];

    // fade-in
    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2.2);
  };

  const stop = () => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  };

  const toggle = async () => {
    if (on) {
      stop();
      setOn(false);
    } else {
      await start();
      setOn(true);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={isAr ? "تبديل الصوت السينمائي" : "Toggle cinematic audio"}
      title={isAr ? "صوت سينمائي" : "Cinematic audio"}
      className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition ${
        on
          ? "border-amber-300/60 bg-amber-300/15 text-amber-200 shadow-[0_0_24px_-4px_rgba(245,180,84,0.7)]"
          : "border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {on ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      {on && (
        <>
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full border border-amber-300/50" />
          <span className="pointer-events-none absolute -inset-1 rounded-full border border-amber-300/20" />
        </>
      )}
    </button>
  );
}

export default CinematicAudio;
