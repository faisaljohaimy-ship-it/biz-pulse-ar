import type { ReactNode } from "react";

export function KenBurnsImage({
  src,
  direction = 1,
  progress,
  opacity = 1,
  children,
}: {
  src: string;
  direction?: 1 | -1;
  progress: number;
  opacity?: number;
  children?: ReactNode;
}) {
  const scale = 1.15 - progress * 0.1;
  const x = direction * progress * 4;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        loading="eager"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="h-full w-full object-cover"
        style={{
          transform: `scale(${scale}) translateX(${x}%)`,
          transformOrigin: "center",
          opacity,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04070F] via-[#04070F]/70 to-[#04070F]/30" />
      {children}
    </div>
  );
}
