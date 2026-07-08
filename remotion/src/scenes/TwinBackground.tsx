import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// A "3D" enterprise digital twin background: rotating wireframe globe of nodes + edges,
// orbital rings, drifting grid plane. Fully procedural SVG so it renders headless.

type Node = { x: number; y: number; z: number; label: string; tone: string };

const NODES: Node[] = [
  { x: 0, y: 0, z: 0, label: "CORE", tone: "#22d3ee" },
  { x: 1, y: 0.2, z: 0.3, label: "FINANCE", tone: "#7dd3fc" },
  { x: -1, y: 0.1, z: 0.2, label: "OPS", tone: "#a78bfa" },
  { x: 0.3, y: 1, z: -0.4, label: "AI OPS", tone: "#34d399" },
  { x: -0.4, y: -1, z: 0.5, label: "RISK", tone: "#f59e0b" },
  { x: 0.8, y: -0.7, z: 0.6, label: "DATA", tone: "#22d3ee" },
  { x: -0.9, y: 0.7, z: -0.5, label: "HR", tone: "#a78bfa" },
  { x: 0.6, y: 0.5, z: 0.9, label: "SALES", tone: "#34d399" },
  { x: -0.6, y: -0.5, z: -0.9, label: "SECURITY", tone: "#f43f5e" },
  { x: 0.2, y: -0.9, z: -0.6, label: "BOARD", tone: "#fbbf24" },
];

const EDGES: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [0, 7],
  [0, 8],
  [0, 9],
  [1, 5],
  [2, 4],
  [3, 7],
  [6, 8],
  [5, 9],
  [4, 9],
  [2, 6],
  [1, 7],
];

function project(n: Node, angleY: number, angleX: number, scale: number, cx: number, cy: number) {
  // rotate around Y then X
  const cosY = Math.cos(angleY),
    sinY = Math.sin(angleY);
  const x1 = n.x * cosY + n.z * sinY;
  const z1 = -n.x * sinY + n.z * cosY;
  const cosX = Math.cos(angleX),
    sinX = Math.sin(angleX);
  const y2 = n.y * cosX - z1 * sinX;
  const z2 = n.y * sinX + z1 * cosX;
  // perspective
  const persp = 2.4 / (2.4 + z2);
  return { x: cx + x1 * scale * persp, y: cy + y2 * scale * persp, depth: z2, persp };
}

export const TwinBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const angleY = (frame / 240) * Math.PI * 2; // full rotation every ~8s
  const angleX = Math.sin(frame / 180) * 0.35;
  const cx = width / 2;
  const cy = height / 2 + 30;
  const scale = 360;

  const projected = NODES.map((n) => ({ n, p: project(n, angleY, angleX, scale, cx, cy) }));

  // Grid plane (perspective floor)
  const gridLines: JSX.Element[] = [];
  const horizon = height * 0.62;
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const y = horizon + Math.pow(t, 2) * (height - horizon);
    const opacity = 0.06 + (1 - t) * 0.14;
    gridLines.push(
      <line
        key={`h${i}`}
        x1={0}
        x2={width}
        y1={y}
        y2={y}
        stroke="#22d3ee"
        strokeWidth={1}
        opacity={opacity}
      />,
    );
  }
  for (let i = -20; i <= 20; i++) {
    const driftedI = i + ((frame / 4) % 1) * 0;
    const xTop = cx + driftedI * 90;
    const xBot = cx + driftedI * 360;
    gridLines.push(
      <line
        key={`v${i}`}
        x1={xTop}
        y1={horizon}
        x2={xBot}
        y2={height}
        stroke="#22d3ee"
        strokeWidth={1}
        opacity={0.12}
      />,
    );
  }

  return (
    <AbsoluteFill>
      {/* Deep gradient sky */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 30%, #0b2046 0%, #050816 55%, #02030a 100%)",
        }}
      />

      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {/* Floor grid */}
        <g>{gridLines}</g>

        {/* Orbital rings */}
        {[1, 1.35, 1.7].map((r, i) => {
          const rx = scale * r;
          const ry = scale * r * Math.abs(Math.cos(angleX)) * 0.5 + 8;
          return (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill="none"
              stroke="#22d3ee"
              strokeOpacity={0.18 - i * 0.04}
              strokeWidth={1.2}
              strokeDasharray="2 8"
            />
          );
        })}

        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const pa = projected[a].p,
            pb = projected[b].p;
          const avgDepth = (pa.depth + pb.depth) / 2;
          const op = interp(avgDepth, -1.2, 1.2, 0.85, 0.18);
          return (
            <line
              key={i}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="#22d3ee"
              strokeOpacity={op}
              strokeWidth={1.4}
            />
          );
        })}

        {/* Nodes */}
        {projected
          .slice()
          .sort((a, b) => a.p.depth - b.p.depth)
          .map(({ n, p }, i) => {
            const r = 6 + p.persp * 8;
            const glow = 0.5 + p.persp * 0.5;
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={r * 2.8} fill={n.tone} opacity={0.08 * glow} />
                <circle cx={p.x} cy={p.y} r={r} fill={n.tone} opacity={0.95} />
                <circle cx={p.x} cy={p.y} r={r * 0.5} fill="#fff" opacity={0.9} />
                <text
                  x={p.x + r + 8}
                  y={p.y + 4}
                  fill="#cfe7ff"
                  opacity={0.55 + p.persp * 0.35}
                  fontSize={11}
                  fontFamily="Inter, sans-serif"
                  fontWeight={700}
                  letterSpacing={1.5}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
      </svg>

      {/* Soft scan line sweep */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, transparent ${(frame * 1.5) % 100}%, rgba(34,211,238,0.05) ${((frame * 1.5) % 100) + 2}%, transparent ${((frame * 1.5) % 100) + 4}%)`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

function interp(v: number, a: number, b: number, oa: number, ob: number) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return oa + (ob - oa) * t;
}
