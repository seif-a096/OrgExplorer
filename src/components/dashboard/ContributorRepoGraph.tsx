import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";

/* ─── types ──────────────────────────────────────────────────────── */
export type GraphNode = {
  id: string;
  type: "repo" | "contributor";
  label: string;
  value: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  avatarUrl?: string;
  profileUrl?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  reposTouched?: number;
  daysSinceActive?: number;
};

export type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
};

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
}

/* ─── constants ──────────────────────────────────────────────────── */
const CANVAS_H = 720;

/* card dimensions in graph‑space units */
const CONTRIB_W = 120;
const CONTRIB_H = 150;
const REPO_W = 140;
const REPO_H = 90;

const ACCENT = "#8CC63F";     // aossie-green
const ACCENT2 = "#F7D100";    // aossie-yellow
const BG_CARD = "#0d1117";
const BG_CARD_HOVER = "#161b22";
const BORDER = "#30363d";
const TEXT_PRIMARY = "#e6edf3";
const TEXT_MUTED = "#8b949e";

/* ─── helpers ────────────────────────────────────────────────────── */

/** draw a rounded rect on canvas */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function formatNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

/* ─── component ──────────────────────────────────────────────────── */
export function ContributorRepoGraph({ nodes, links }: Props) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [graphWidth, setGraphWidth] = useState(980);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());

  /* which node ids are connected to hovered node */
  const hoverNeighbors = useMemo(() => {
    if (!hoverNodeId) return null;
    const set = new Set<string>();
    set.add(hoverNodeId);
    links.forEach((l) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (s === hoverNodeId) set.add(t);
      if (t === hoverNodeId) set.add(s);
    });
    return set;
  }, [hoverNodeId, links]);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  /* responsive width */
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setGraphWidth(Math.max(520, Math.floor(w)));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  /* configure forces */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    fg.d3Force("charge")?.strength(-450);

    fg.d3Force("link")
      ?.distance((link: any) => {
        const w = link.weight || 1;
        return Math.max(200, 400 - Math.log2(w + 1) * 25);
      })
      .strength(0.12);

    fg.d3Force("x")
      ?.x((n: GraphNode) => (n.type === "contributor" ? -480 : 480))
      .strength(0.85);

    fg.d3Force("y")
      ?.y((n: GraphNode) => {
        const days = Math.max(0, Math.min(180, n.daysSinceActive || 0));
        return -300 + (days / 180) * 600;
      })
      .strength(0.4);

    fg.d3ReheatSimulation();

    const t = setTimeout(() => fg.zoomToFit?.(600, 80), 500);
    return () => clearTimeout(t);
  }, [graphData]);

  /* preload all contributor avatars */
  useEffect(() => {
    nodes.forEach((n) => {
      if (n.type === "contributor" && n.avatarUrl && !imgCache.current.has(n.avatarUrl)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = n.avatarUrl;
        imgCache.current.set(n.avatarUrl, img);
      }
    });
  }, [nodes]);

  /* ─── canvas draw: node ──────────────────────────────────────── */
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const isHovered = n.id === hoverNodeId;
      const dimmed = hoverNeighbors && !hoverNeighbors.has(n.id);

      ctx.save();
      if (dimmed) ctx.globalAlpha = 0.15;

      if (n.type === "contributor") {
        drawContributorCard(ctx, n, x, y, isHovered, globalScale);
      } else {
        drawRepoCard(ctx, n, x, y, isHovered, globalScale);
      }

      ctx.restore();
    },
    [hoverNodeId, hoverNeighbors],
  );

  /* ─── contributor card ─────────────────────────────────────────── */
  function drawContributorCard(
    ctx: CanvasRenderingContext2D,
    n: GraphNode,
    cx: number,
    cy: number,
    hover: boolean,
    _gs: number,
  ) {
    const w = CONTRIB_W;
    const h = CONTRIB_H;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const r = 8;

    /* card bg */
    roundRect(ctx, left, top, w, h, r);
    ctx.fillStyle = hover ? BG_CARD_HOVER : BG_CARD;
    ctx.fill();

    /* border — accent if hovered */
    ctx.lineWidth = hover ? 2 : 1;
    ctx.strokeStyle = hover ? ACCENT : BORDER;
    ctx.stroke();

    /* avatar */
    const avatarSize = 48;
    const ax = cx - avatarSize / 2;
    const ay = top + 14;

    const img = n.avatarUrl ? imgCache.current.get(n.avatarUrl) : undefined;
    if (img && img.complete && img.naturalWidth > 0) {
      /* clip to rounded square */
      ctx.save();
      roundRect(ctx, ax, ay, avatarSize, avatarSize, 6);
      ctx.clip();
      ctx.drawImage(img, ax, ay, avatarSize, avatarSize);
      ctx.restore();

      /* avatar border */
      roundRect(ctx, ax, ay, avatarSize, avatarSize, 6);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = ACCENT;
      ctx.stroke();
    } else {
      /* fallback circle with initial */
      roundRect(ctx, ax, ay, avatarSize, avatarSize, 6);
      ctx.fillStyle = "#21262d";
      ctx.fill();
      ctx.strokeStyle = BORDER;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = ACCENT;
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        (n.label || "?")[0].toUpperCase(),
        cx,
        ay + avatarSize / 2,
      );
    }

    /* username */
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = "bold 11px 'Montserrat', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(truncate(n.label, 14), cx, ay + avatarSize + 8);

    /* commits badge */
    const badgeY = ay + avatarSize + 26;
    const badgeText = `${formatNum(n.value)} commits`;
    const badgeW = ctx.measureText(badgeText).width + 16;
    const badgeH = 18;
    const bx = cx - badgeW / 2;

    roundRect(ctx, bx, badgeY, badgeW, badgeH, 4);
    ctx.fillStyle = "rgba(140, 198, 63, 0.12)";
    ctx.fill();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = ACCENT;
    ctx.font = "600 9px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, cx, badgeY + badgeH / 2);
  }

  /* ─── repo card ────────────────────────────────────────────────── */
  function drawRepoCard(
    ctx: CanvasRenderingContext2D,
    n: GraphNode,
    cx: number,
    cy: number,
    hover: boolean,
    _gs: number,
  ) {
    const w = REPO_W;
    const h = REPO_H;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const r = 8;

    /* card bg */
    roundRect(ctx, left, top, w, h, r);
    ctx.fillStyle = hover ? BG_CARD_HOVER : BG_CARD;
    ctx.fill();

    ctx.lineWidth = hover ? 2 : 1;
    ctx.strokeStyle = hover ? ACCENT2 : BORDER;
    ctx.stroke();

    /* repo icon (small book icon) */
    const iconSize = 22;
    const ix = cx - iconSize / 2;
    const iy = top + 10;

    /* draw a simple repo/code icon */
    ctx.save();
    ctx.translate(ix, iy);
    ctx.fillStyle = ACCENT2;
    /* book shape */
    roundRect(ctx, 0, 0, iconSize, iconSize, 4);
    ctx.fillStyle = "rgba(247, 209, 0, 0.15)";
    ctx.fill();
    ctx.strokeStyle = ACCENT2;
    ctx.lineWidth = 1;
    ctx.stroke();

    /* code brackets < > inside */
    ctx.fillStyle = ACCENT2;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("</>", iconSize / 2, iconSize / 2);
    ctx.restore();

    /* repo name */
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = "bold 11px 'Montserrat', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(truncate(n.label, 18), cx, iy + iconSize + 6);

    /* stats row:  ★ 12  ⑂ 3  ⚠ 5 */
    const statsY = iy + iconSize + 24;
    ctx.font = "500 9px 'Space Mono', monospace";
    ctx.textBaseline = "middle";

    const statsStr = `★${formatNum(n.stars || 0)}  ⑂${formatNum(n.forks || 0)}  !${formatNum(n.openIssues || 0)}`;
    ctx.fillStyle = TEXT_MUTED;
    ctx.textAlign = "center";
    ctx.fillText(statsStr, cx, statsY);
  }

  /* ─── canvas draw: link ──────────────────────────────────────── */
  const drawLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, _gs: number) => {
      const src = link.source;
      const tgt = link.target;
      if (!src || !tgt || src.x == null || tgt.x == null) return;

      const w = link.weight || 1;
      const dimmed =
        hoverNeighbors &&
        !hoverNeighbors.has(
          typeof src === "object" ? src.id : src,
        ) &&
        !hoverNeighbors.has(
          typeof tgt === "object" ? tgt.id : tgt,
        );

      ctx.save();
      if (dimmed) ctx.globalAlpha = 0.04;

      /* thickness: log-scaled */
      const thickness = Math.max(0.8, Math.min(6, Math.log2(w + 1) * 1.2));
      /* alpha: scaled by thickness for visual consistency */
      const alpha = Math.max(0.1, Math.min(0.9, thickness / 6));

      ctx.beginPath();

      /* bezier curve for a smoother look */
      const midX = (src.x + tgt.x) / 2;
      ctx.moveTo(src.x, src.y);
      ctx.quadraticCurveTo(midX, (src.y + tgt.y) / 2 + (src.y - tgt.y) * 0.1, tgt.x, tgt.y);

      // Interpolate from a dim green to a bright vibrant green
      ctx.strokeStyle = `rgba(140, 198, 63, ${alpha})`;
      ctx.lineWidth = thickness;
      ctx.stroke();

      ctx.restore();
    },
    [hoverNeighbors],
  );

  /* ─── node hit area ──────────────────────────────────────────── */
  const nodePointerArea = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as GraphNode;
    const w = n.type === "contributor" ? CONTRIB_W : REPO_W;
    const h = n.type === "contributor" ? CONTRIB_H : REPO_H;
    const left = (n.x ?? 0) - w / 2;
    const top = (n.y ?? 0) - h / 2;

    ctx.fillStyle = color;
    ctx.fillRect(left, top, w, h);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height: CANVAS_H }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={graphWidth}
        height={CANVAS_H}
        backgroundColor="transparent"
        cooldownTicks={200}
        warmupTicks={80}
        minZoom={0.25}
        maxZoom={5}
        nodeRelSize={1}
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={nodePointerArea}
        linkCanvasObject={drawLink}
        onNodeHover={(node: any) => setHoverNodeId(node ? (node as GraphNode).id : null)}
        onNodeClick={(node: any) => {
          const n = node as GraphNode;
          setSelectedNode((prev) => (prev?.id === n.id ? null : n));
        }}
        onBackgroundClick={() => setSelectedNode(null)}
        enableNodeDrag={true}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      {/* ── detail panel ──────────────────────────────────────── */}
      {selectedNode && (
        <div
          className="absolute top-4 right-4 z-50 w-80 border border-[#30363d] bg-[#0d1117]/95 backdrop-blur-md p-5 animate-in slide-in-from-right-4 duration-300"
          style={{ borderRadius: 8 }}
        >
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-3 right-3 text-[#8b949e] hover:text-white text-sm font-mono"
          >
            ✕
          </button>

          {selectedNode.type === "contributor" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {selectedNode.avatarUrl ? (
                  <img
                    src={selectedNode.avatarUrl}
                    alt={selectedNode.label}
                    className="w-16 h-16 border border-[#8CC63F] object-cover"
                    style={{ borderRadius: 6 }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#8CC63F] text-2xl font-bold"
                    style={{ borderRadius: 6 }}
                  >
                    {(selectedNode.label || "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-base uppercase tracking-wide">
                    {selectedNode.label}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[#8b949e] mt-0.5">
                    Contributor
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Stat label="Commits" value={formatNum(selectedNode.value)} accent />
                <Stat label="Repos Touched" value={String(selectedNode.reposTouched || 0)} />
                <Stat
                  label="Last Active"
                  value={
                    selectedNode.daysSinceActive != null
                      ? `${selectedNode.daysSinceActive}d ago`
                      : "N/A"
                  }
                />
              </div>

              {selectedNode.profileUrl && (
                <a
                  href={selectedNode.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-xs font-mono uppercase tracking-widest border border-[#30363d] bg-[#010409] py-2.5 text-white hover:text-[#8CC63F] hover:border-[#8CC63F] transition-colors"
                >
                  Open GitHub Profile →
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 bg-[#21262d] border border-[#F7D100] flex items-center justify-center text-[#F7D100] text-lg font-mono font-bold"
                  style={{ borderRadius: 6 }}
                >
                  {"</>"}
                </div>
                <div>
                  <p className="text-white font-bold text-base uppercase tracking-wide">
                    {selectedNode.label}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[#8b949e] mt-0.5">
                    Repository
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat label="Stars" value={formatNum(selectedNode.stars || 0)} accent />
                <Stat label="Forks" value={formatNum(selectedNode.forks || 0)} />
                <Stat label="Issues" value={formatNum(selectedNode.openIssues || 0)} />
              </div>

              <Stat
                label="Last Active"
                value={
                  selectedNode.daysSinceActive != null
                    ? `${selectedNode.daysSinceActive} days ago`
                    : "N/A"
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ── legend ────────────────────────────────────────────── */}
      <div
        className="absolute bottom-3 left-3 z-40 flex items-center gap-4 bg-[#0d1117]/90 border border-[#30363d] backdrop-blur px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[#8b949e]"
        style={{ borderRadius: 6 }}
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border border-[#8CC63F] bg-[#0d1117]" style={{ borderRadius: 3 }} />
          Contributor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border border-[#F7D100] bg-[#0d1117]" style={{ borderRadius: 3 }} />
          Repository
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-[2px] bg-[#8CC63F]/60" />
          Contribution
        </span>
      </div>
    </div>
  );
}

/* ── tiny stat block ─────────────────────────────────────────────── */
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#010409] border border-[#30363d] p-2" style={{ borderRadius: 4 }}>
      <div className="text-[10px] uppercase tracking-widest text-[#8b949e]">{label}</div>
      <div className={`text-sm font-mono mt-1 ${accent ? "text-[#8CC63F]" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}
