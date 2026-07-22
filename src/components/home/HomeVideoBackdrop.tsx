/**
 * HomeVideoBackdrop — fullscreen static backdrop for the homepage.
 *
 * The permanent cinematic NEXIOS toroid over the Saudi command plateau.
 * The former gesture-gated ARIA greeting film (home-bg.mp4) and its button
 * were retired per directive; nothing here plays audio or motion.
 */
import homeToroid from "@/assets/nexios-home-toroid.png.asset.json";

export function HomeVideoBackdrop() {
  return (
    <div
      aria-hidden="true"
      dir="ltr"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#04070F]"
    >
      {/* Permanent homepage backdrop: the cinematic NEXIOS toroid over the
          Saudi command plateau. Object-cover keeps the toroid centred from
          360px phones through 4K wall displays. */}
      <img
        src={homeToroid.url}
        alt=""
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,18,0.34)_0%,rgba(2,8,18,0.12)_34%,rgba(2,8,18,0.5)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(0,212,255,0.08),transparent_42%)]" />
      {/* Readability scrims */}
      <div
        className="absolute inset-x-0 top-0 h-[18%] md:h-[10%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,15,0.55) 0%, rgba(4,7,15,0.1) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[46%] md:h-[24%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(4,7,15,0.45) 55%, rgba(4,7,15,0.88) 100%)",
        }}
      />
    </div>
  );
}

export default HomeVideoBackdrop;
