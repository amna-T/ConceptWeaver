import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';

const COLORS = {
    0: { bg: '#4f46e5', border: '#a5b4fc', text: '#ffff', glow: 'rgba(79,70,229,0.5)' }, // Root
    1: { bg: '#1e1b4b', border: '#6366f1', text: '#e0e7ff', glow: null }, // Chapter (Obsidian)
    2: { bg: '#0f172a', border: 'rgba(99,102,241,0.3)', text: '#cbd5e1', glow: null }, // Topic
    3: { bg: 'rgba(15,23,42,0.6)', border: 'rgba(255,255,255,0.08)', text: '#94a3b8', glow: null }, // Detail
};

const truncate = (s, n = 30) => {
    if (!s || typeof s !== 'string') return '?';
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

const drawPill = (ctx, cx, cy, label, lv) => {
    // Phase 16: Superior Visual Hierarchy
    const FONT_SIZE = [20, 17, 13, 11][lv] ?? 11;
    const HP = [26, 22, 16, 12][lv] ?? 12;
    const VP = [15, 12, 8, 6][lv] ?? 6;
    const col = COLORS[lv] ?? COLORS[3];

    ctx.font = `${lv < 2 ? '700' : '500'} ${FONT_SIZE}px "Outfit","Inter",sans-serif`;
    const tw = ctx.measureText(label).width;
    const bw = tw + HP * 2;
    const bh = FONT_SIZE + VP * 2;
    const r = bh / 2;

    // Glow for root and chapters
    if (col.glow || lv === 1) { 
        ctx.shadowColor = col.glow || 'rgba(99,102,241,0.2)'; 
        ctx.shadowBlur = lv === 0 ? 22 : 12; 
    }

    // Pill
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, r);
    ctx.fillStyle = col.bg;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    if (lv < 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fill();
    }

    ctx.strokeStyle = col.border;
    ctx.lineWidth = lv === 0 ? 3 : 1.1;
    ctx.stroke();

    ctx.fillStyle = col.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);

    return { bw, bh };
};

const GraphViewer = ({ fullScreen = false, concepts = [], rootName = 'Analysis Result', onNodeClick }) => {
    const canvasRef = useRef();
    const containerRef = useRef();
    // Store the draw function in a ref so zoom always calls the latest version
    const drawRef = useRef(null);
    const zoomRef = useRef(null);
    const layoutRef = useRef(null);
    const clickHandlerRef = useRef(onNodeClick);
    const [dims, setDims] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const update = () => {
            if (containerRef.current)
                setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
        };
        window.addEventListener('resize', update);
        update();
        return () => window.removeEventListener('resize', update);
    }, []);

    // Build the d3 tree hierarchy
    const layoutData = useMemo(() => {
        let rootObj;

        // NEW: Hierarchical JSON Format (Professional v2)
        if (concepts && typeof concepts === 'object' && concepts.main_topic) {
            rootObj = {
                name: truncate(concepts.main_topic, 40),
                level: 0,
                children: (concepts.subtopics || []).map(sub => ({
                    name: truncate(sub.topic, 35),
                    level: 1,
                    children: (sub.concepts || []).map(c => ({
                        name: truncate(c, 25),
                        level: 2,
                        children: [] // Details can go here in future v3
                    }))
                }))
            };
        } 
        // LEGACY: Flat Triple/Quadruple Array
        else {
            const data = Array.isArray(concepts) ? concepts : [];
            const structure = new Map();

            data.forEach(item => {
                let chapter, subject, relation, obj;
                if (Array.isArray(item) && item.length === 4) [chapter, subject, relation, obj] = item;
                else if (Array.isArray(item) && item.length === 3) { [subject, relation, obj] = item; chapter = "General"; }
                else return;

                if (!chapter || !subject || !obj) return;
                if (!structure.has(chapter)) structure.set(chapter, new Map());
                const chapterMap = structure.get(chapter);
                if (!chapterMap.has(subject)) chapterMap.set(subject, []);
                chapterMap.get(subject).push({ name: obj, relation });
            });

            rootObj = {
                name: truncate(rootName, 40),
                level: 0,
                children: [...structure.entries()].map(([chapter, subjects]) => ({
                    name: truncate(chapter, 35),
                    level: 1,
                    children: [...subjects.entries()].slice(0, 8).map(([subject, details]) => ({
                        name: truncate(subject, 25),
                        level: 2,
                        children: details.slice(0, 5).map(d => ({ 
                            name: truncate(d.name, 25), 
                            relation: d.relation,
                            level: 3 
                        })),
                    })),
                })),
            };
        }

        const root = hierarchy(rootObj);
        // Phase 16: Maximum logical breathing room
        tree().nodeSize([70, 400])(root);

        // Bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        root.each(n => {
            minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
            minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
        });

        return { root, treeW: maxY - minY, treeH: maxX - minX, minX, minY };
    }, [concepts, rootName]);

    // Update refs on every render to avoid stale closures in event listeners
    useEffect(() => {
        layoutRef.current = layoutData;
    }, [layoutData]);

    useEffect(() => {
        clickHandlerRef.current = onNodeClick;
    }, [onNodeClick]);

    // Main draw function — stored in ref so zoom always has the latest
    useEffect(() => {
        if (!canvasRef.current || dims.w === 0 || !layoutData) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Only resize canvas when dimensions actually change
        if (canvas.width !== dims.w) canvas.width = dims.w;
        if (canvas.height !== dims.h) canvas.height = dims.h;

        const { root, treeW, treeH, minX, minY } = layoutData;
        const offsetX = -minY;
        const offsetY = -minX;

        const draw = (transform) => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(transform.x, transform.y);
            ctx.scale(transform.k, transform.k);
            ctx.translate(offsetX, offsetY);

            // Organic Bezier Connections (Phase 16: Refined Flow)
            root.links().forEach(({ source: s, target: t }) => {
                const mx = (s.y + t.y) / 2;
                ctx.beginPath();
                ctx.moveTo(s.y, s.x);
                // Sophisticated S-Curve with increased offset
                ctx.bezierCurveTo(mx + 45, s.x, mx - 45, t.x, t.y, t.x);
                ctx.strokeStyle = s.depth === 0 ? 'rgba(99,102,241,0.5)' : 'rgba(148,163,184,0.18)';
                ctx.lineWidth = s.depth === 0 ? 3 : 1.3;
                ctx.stroke();

                // Professional Relation Labels
                const rel = t.data.relation;
                if (rel) {
                    ctx.save();
                    const lx = mx; 
                    const ly = (s.x + t.x) / 2;
                    ctx.font = '500 italic 10px "Outfit",sans-serif';
                    const tw = ctx.measureText(rel).width;
                    
                    // Pill-style label bg
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(lx - (tw/2 + 6), ly - 9, tw + 12, 18, 5);
                    ctx.fill();
                    
                    ctx.fillStyle = '#6366f1'; 
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(rel, lx, ly);
                    ctx.restore();
                }
            });

            // Nodes
            root.each(node => {
                drawPill(ctx, node.y, node.x, node.data.name || '?', node.depth);
            });

            ctx.restore();
        };

        drawRef.current = draw;
        const sel = select(canvas);

        // Always ensure zoom behavior exists
        if (!zoomRef.current) {
            zoomRef.current = d3zoom()
                .scaleExtent([0.15, 6])
                .on('zoom', (event) => {
                    const currentSel = select(canvasRef.current);
                    currentSel.datum({ transform: event.transform });
                    if (drawRef.current) drawRef.current(event.transform);
                });
        }

        // Always re-bind listeners to ensure fresh selection state
        sel.call(zoomRef.current);

        sel.on('click', (event) => {
            if (event.defaultPrevented) return;
            if (!clickHandlerRef.current || !layoutRef.current) return;
            
            const lData = layoutRef.current;
            const t = select(canvasRef.current).datum()?.transform ?? zoomIdentity;
            const offX = -lData.minY;
            const offY = -lData.minX;

            const tx = (event.offsetX - t.x) / t.k - offX;
            const ty = (event.offsetY - t.y) / t.k - offY;

            let clicked = null;
            lData.root.each(node => {
                const dx = Math.abs(node.y - tx);
                const dy = Math.abs(node.x - ty);
                if (dx < 100 && dy < 25) clicked = node;
            });

            if (clicked) {
                clickHandlerRef.current({ name: clicked.data.name, level: clicked.depth });
            }
        });

        // Compute fit transform
        const padding = 120;
        const scaleX = (dims.w - padding * 2) / (treeW || 1);
        const scaleY = (dims.h - padding * 2) / (treeH || 1);
        const scale = Math.min(scaleX, scaleY, 1);

        const initTransform = zoomIdentity
            .translate(dims.w / 2, dims.h / 2)
            .scale(scale)
            .translate(-(treeW / 2 + minY + offsetX), -(treeH / 2 + minX + offsetY));

        sel.datum({ transform: initTransform });
        sel.call(zoomRef.current.transform, initTransform);
        draw(initTransform);

    }, [dims, layoutData]);

    // Handlers for manual controls
    const triggerZoom = (factor) => {
        if (!zoomRef.current || !canvasRef.current) return;
        const sel = select(canvasRef.current);
        sel.transition().duration(250).call(zoomRef.current.scaleBy, factor);
    };

    const triggerFit = () => {
        if (!layoutData || !zoomRef.current || !canvasRef.current) return;
        const { root, treeW, treeH, minX, minY } = layoutData;
        const offsetX = -minY;
        const offsetY = -minX;
        const canvas = canvasRef.current;
        const sel = select(canvas);

        const padding = 120;
        const scaleX = (dims.w - padding * 2) / (treeW || 1);
        const scaleY = (dims.h - padding * 2) / (treeH || 1);
        const scale = Math.min(scaleX, scaleY, 1);

        const fitTransform = zoomIdentity
            .translate(dims.w / 2, dims.h / 2)
            .scale(scale)
            .translate(-(treeW / 2 + minY + offsetX), -(treeH / 2 + minX + offsetY));

        sel.transition().duration(400).call(zoomRef.current.transform, fitTransform);
    };

    const height = fullScreen ? '100vh' : '500px';

    return (
        <div ref={containerRef} style={{ width: '100%', height, background: '#020617', position: 'relative', overflow: 'hidden' }}>
            {/* Dot grid */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: 'radial-gradient(rgba(99,102,241,0.1) 1.5px, transparent 1.5px)',
                backgroundSize: '38px 38px',
            }} />

            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />

            {/* Premium Navigation Controls */}
            <div style={{
                position: 'absolute', top: 26, right: 26,
                display: 'flex', flexDirection: 'column', gap: 10,
                background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
                padding: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 10,
            }}>
                <button onClick={() => triggerZoom(1.4)} title="Zoom In" style={{ 
                    width: 38, height: 38, borderRadius: 10, border: 'none', 
                    background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    transition: 'all 0.2s'
                }} onMouseOver={(e) => { e.target.style.background = '#6366f1'; }} 
                   onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; }}>
                    +
                </button>
                <button onClick={() => triggerZoom(0.7)} title="Zoom Out" style={{ 
                    width: 38, height: 38, borderRadius: 10, border: 'none', 
                    background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    transition: 'all 0.2s'
                }} onMouseOver={(e) => { e.target.style.background = '#6366f1'; }} 
                   onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; }}>
                    −
                </button>
                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.05)' }} />
                <button onClick={triggerFit} title="Fit to Screen" style={{ 
                    width: 38, height: 38, borderRadius: 10, border: 'none', 
                    background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    transition: 'all 0.2s'
                }} onMouseOver={(e) => { e.target.style.background = '#6366f1'; }} 
                   onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; }}>
                    ⟲
                </button>
            </div>

            {/* Legend */}
            <div style={{
                position: 'absolute', bottom: 26, right: 26,
                background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18,
                padding: '13px 18px', color: '#fff', fontSize: 12,
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            }}>
                <div style={{ fontWeight: 900, color: '#6366f1', letterSpacing: 2, marginBottom: 10 }}>LAYERS</div>
                {[
                    ['#6366f1', 'Document'], 
                    ['#4338ca', 'Chapter', 'rgba(129,140,248,0.7)'],
                    ['#1e1b4b', 'Topic', 'rgba(129,140,248,0.4)'], 
                    ['#0f172a', 'Detail', 'rgba(255,255,255,0.15)']
                ].map(([bg, label, brd]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                        <div style={{ width: 10, height: 10, background: bg, borderRadius: 3, border: brd ? `1px solid ${brd}` : 'none' }} />
                        <span style={{ opacity: 0.82 }}>{label}</span>
                    </div>
                ))}
                <div style={{ marginTop: 8, opacity: 0.38, fontSize: 11 }}>Scroll/Buttons · Drag to pan</div>
            </div>
        </div>
    );
};

export default GraphViewer;
