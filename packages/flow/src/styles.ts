let stylesInjected = false

export function injectFlowStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return
  stylesInjected = true
  const style = document.createElement('style')
  style.textContent = getFlowCSS()
  document.head.appendChild(style)
}

export function resetFlowStylesInjection(): void {
  stylesInjected = false
}

function getFlowCSS(): string {
  return `
/* ---- CSS custom properties (dark defaults) ---- */
.lf-flow-root {
  --lf-flow-bg:                   #0d0d0d;
  --lf-flow-border:               #334155;
  --lf-flow-text:                 #e2e8f0;
  --lf-flow-handle-bg:            #6366f1;
  --lf-flow-handle-border:        #fff;
  --lf-flow-edge-color:           #6366f1;
  --lf-flow-edge-selected:        #f59e0b;
  --lf-flow-edge-connecting:      #888;
  --lf-flow-marquee-border:       #6366f1;
  --lf-flow-marquee-bg:           rgba(99,102,241,0.08);
  --lf-flow-bg-controls:          #1e293b;
  --lf-flow-bg-controls-hover:    #334155;
  --lf-flow-bg-minimap:           #1e293b;
  --lf-flow-minimap-node:         #475569;
  --lf-flow-minimap-node-selected:#3b82f6;
  --lf-flow-minimap-viewport:     #3b82f6;
  --lf-flow-edge-label-bg:        #1e293b;
  --lf-flow-edge-label-border:    #334155;
  --lf-flow-edge-label-color:     #e2e8f0;
  --lf-flow-edge-label-size:      11px;
  --lf-flow-ctx-menu-bg:          #1e293b;
  --lf-flow-ctx-menu-border:      #334155;
  --lf-flow-ctx-menu-text:        #e2e8f0;
  --lf-flow-ctx-menu-hover-bg:    #334155;
  --lf-flow-ctx-menu-disabled:    #64748b;
  --lf-flow-grid-color:           rgba(255,255,255,0.08);
}
/* Light mode overrides */
@media (prefers-color-scheme: light) {
  .lf-flow-root {
    --lf-flow-bg:                   #f8fafc;
    --lf-flow-border:               #cbd5e1;
    --lf-flow-text:                 #0f172a;
    --lf-flow-handle-bg:            #6366f1;
    --lf-flow-handle-border:        #fff;
    --lf-flow-edge-color:           #6366f1;
    --lf-flow-edge-selected:        #f59e0b;
    --lf-flow-edge-connecting:      #94a3b8;
    --lf-flow-marquee-border:       #6366f1;
    --lf-flow-marquee-bg:           rgba(99,102,241,0.06);
    --lf-flow-bg-controls:          #ffffff;
    --lf-flow-bg-controls-hover:    #f1f5f9;
    --lf-flow-bg-minimap:           #ffffff;
    --lf-flow-minimap-node:         #94a3b8;
    --lf-flow-minimap-node-selected:#3b82f6;
    --lf-flow-minimap-viewport:     #3b82f6;
    --lf-flow-edge-label-bg:        #ffffff;
    --lf-flow-edge-label-border:    #cbd5e1;
    --lf-flow-edge-label-color:     #0f172a;
    --lf-flow-ctx-menu-bg:          #ffffff;
    --lf-flow-ctx-menu-border:      #e2e8f0;
    --lf-flow-ctx-menu-text:        #0f172a;
    --lf-flow-ctx-menu-hover-bg:    #f1f5f9;
    --lf-flow-ctx-menu-disabled:    #94a3b8;
    --lf-flow-grid-color:           rgba(0,0,0,0.12);
  }
}
[data-theme="light"] .lf-flow-root,
.lf-flow-root[data-theme="light"] {
  --lf-flow-bg:                   #f8fafc;
  --lf-flow-border:               #cbd5e1;
  --lf-flow-text:                 #0f172a;
  --lf-flow-handle-bg:            #6366f1;
  --lf-flow-handle-border:        #fff;
  --lf-flow-edge-color:           #6366f1;
  --lf-flow-edge-selected:        #f59e0b;
  --lf-flow-edge-connecting:      #94a3b8;
  --lf-flow-marquee-border:       #6366f1;
  --lf-flow-marquee-bg:           rgba(99,102,241,0.06);
  --lf-flow-bg-controls:          #ffffff;
  --lf-flow-bg-controls-hover:    #f1f5f9;
  --lf-flow-bg-minimap:           #ffffff;
  --lf-flow-minimap-node:         #94a3b8;
  --lf-flow-minimap-node-selected:#3b82f6;
  --lf-flow-minimap-viewport:     #3b82f6;
  --lf-flow-edge-label-bg:        #ffffff;
  --lf-flow-edge-label-border:    #cbd5e1;
  --lf-flow-edge-label-color:     #0f172a;
  --lf-flow-ctx-menu-bg:          #ffffff;
  --lf-flow-ctx-menu-border:      #e2e8f0;
  --lf-flow-ctx-menu-text:        #0f172a;
  --lf-flow-ctx-menu-hover-bg:    #f1f5f9;
  --lf-flow-ctx-menu-disabled:    #94a3b8;
  --lf-flow-grid-color:           rgba(0,0,0,0.12);
}

/* ---- Layout ---- */
.lf-flow-root {
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
  background: var(--lf-flow-bg);
}
.lf-transform-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
  will-change: transform;
}
.lf-edges-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.lf-nodes-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.lf-node-wrapper {
  position: absolute;
  pointer-events: all;
}
.lf-node-group {
  z-index: 0;
}
.lf-node-group > .lf-node-wrapper {
  z-index: 1;
}
.lf-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--lf-flow-handle-bg);
  border: 2px solid var(--lf-flow-handle-border);
  cursor: crosshair;
  pointer-events: all;
  z-index: 1;
}
.lf-handle--left   { left: -6px; top: 50%; transform: translateY(-50%); }
.lf-handle--right  { right: -6px; top: 50%; transform: translateY(-50%); }
.lf-handle--top    { top: -6px; left: 50%; transform: translateX(-50%); }
.lf-handle--bottom { bottom: -6px; left: 50%; transform: translateX(-50%); }
.lf-ghost-edge {
  stroke: var(--lf-flow-edge-connecting);
  stroke-width: 2;
  fill: none;
  stroke-dasharray: 5 5;
  pointer-events: none;
}
.lf-edge {
  stroke: var(--lf-flow-edge-color);
  color: var(--lf-flow-edge-color);
  stroke-width: 2;
  fill: none;
  cursor: pointer;
  pointer-events: stroke;
  opacity: 0.7;
}
.lf-edge-selected {
  stroke: var(--lf-flow-edge-selected);
  color: var(--lf-flow-edge-selected);
  opacity: 1;
}
.lf-edge-label { pointer-events: none; }
.lf-edge-label-bg {
  fill: var(--lf-flow-edge-label-bg);
  stroke: var(--lf-flow-edge-label-border);
  stroke-width: 1;
}
.lf-edge-label-text {
  fill: var(--lf-flow-edge-label-color);
  font-size: var(--lf-flow-edge-label-size, 11px);
  font-family: inherit;
  user-select: none;
}
.lf-marquee {
  position: absolute;
  border: 1px solid var(--lf-flow-marquee-border);
  background: var(--lf-flow-marquee-bg);
  pointer-events: none;
  display: none;
}
.lf-controls {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 5;
}
.lf-controls-btn {
  width: 28px;
  height: 28px;
  background: var(--lf-flow-bg-controls);
  border: 1px solid var(--lf-flow-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lf-flow-text);
  line-height: 1;
}
.lf-controls-btn:hover { background: var(--lf-flow-bg-controls-hover); }
.lf-minimap {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 160px;
  height: 100px;
  background: var(--lf-flow-bg-minimap);
  border: 1px solid var(--lf-flow-border);
  border-radius: 6px;
  overflow: hidden;
  z-index: 5;
}
.lf-minimap-svg { width: 100%; height: 100%; }
.lf-minimap-node {
  fill: var(--lf-flow-minimap-node);
  rx: 2;
}
.lf-minimap-node-selected { fill: var(--lf-flow-minimap-node-selected); }
.lf-minimap-viewport {
  fill: none;
  stroke: var(--lf-flow-minimap-viewport);
  stroke-width: 1;
  opacity: 0.5;
}
.lf-context-menu {
  position: absolute;
  z-index: 50;
  background: var(--lf-flow-ctx-menu-bg);
  border: 1px solid var(--lf-flow-ctx-menu-border);
  border-radius: 6px;
  padding: 4px;
  min-width: 140px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.lf-context-menu-item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  background: none;
  border: none;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: var(--lf-flow-ctx-menu-text);
}
.lf-context-menu-item:hover {
  background: var(--lf-flow-ctx-menu-hover-bg);
}
.lf-context-menu-item--disabled {
  color: var(--lf-flow-ctx-menu-disabled);
  cursor: not-allowed;
  pointer-events: none;
}
/* ---- Node Toolbar ---- */
.lf-node-toolbar {
  position: absolute;
  z-index: 10;
  display: none;
  pointer-events: all;
  background: var(--lf-flow-bg-controls);
  border: 1px solid var(--lf-flow-border);
  border-radius: 6px;
  padding: 4px;
  gap: 4px;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  white-space: nowrap;
  user-select: none;
}
.lf-toolbar-btn {
  padding: 4px 8px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--lf-flow-text);
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
}
.lf-toolbar-btn:hover {
  background: var(--lf-flow-bg-controls-hover);
}
.lf-toolbar-btn--danger { color: #ef4444; }
.lf-toolbar-btn--danger:hover { background: rgba(239,68,68,0.12); }
.lf-toolbar-divider {
  width: 1px;
  height: 16px;
  background: var(--lf-flow-border);
  margin: 0 2px;
}
/* ---- Grid Background ---- */
.lf-grid-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}
.lf-grid-dot {
  fill: var(--lf-flow-grid-color);
}
/* ---- Node Resizer ---- */
.lf-node-resizer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.lf-resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--lf-flow-handle-bg);
  border: 2px solid var(--lf-flow-handle-border);
  border-radius: 2px;
  pointer-events: all;
  opacity: 0;
  transition: opacity 0.15s;
}
.lf-node-wrapper:hover .lf-resize-handle,
.lf-node-selected .lf-resize-handle {
  opacity: 1;
}
.lf-resize-handle--n  { top: -4px;    left: 50%; transform: translateX(-50%); cursor: n-resize; }
.lf-resize-handle--s  { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
.lf-resize-handle--e  { right: -4px;  top: 50%;  transform: translateY(-50%); cursor: e-resize; }
.lf-resize-handle--w  { left: -4px;   top: 50%;  transform: translateY(-50%); cursor: w-resize; }
.lf-resize-handle--ne { top: -4px;    right: -4px;   cursor: ne-resize; }
.lf-resize-handle--nw { top: -4px;    left: -4px;    cursor: nw-resize; }
.lf-resize-handle--se { bottom: -4px; right: -4px;   cursor: se-resize; }
.lf-resize-handle--sw { bottom: -4px; left: -4px;    cursor: sw-resize; }
`
}
