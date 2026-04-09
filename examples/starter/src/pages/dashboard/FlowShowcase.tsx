/**
 * Flow Showcase — @liteforge/flow 0.3.0 Feature Demo
 *
 * Demonstrates every new feature from the 0.3.0 release in one interactive page:
 *
 *  COMPOSABLES
 *  - createFlowClipboard   — Ctrl+C / Ctrl+V with visual feedback
 *  - createNodeResizer     — 8-direction resize on the "Resizable" node
 *  - createNodeToolbar     — floating toolbar above selected nodes
 *  - createViewportPersistence — viewport survives page reload
 *
 *  EDGE FEATURES
 *  - animated: true        — animated edges on the "live" path
 *  - markerEnd: 'arrowclosed' — filled arrowheads
 *  - Edge reconnect        — drag endpoint to rewire (hint in footer)
 *
 *  INTERACTIONS
 *  - Delete key            — shown in shortcuts bar
 *  - fitView prop          — canvas starts perfectly fitted
 *  - Mouse events          — hover highlight via onNodeMouseEnter/Leave
 *
 *  PERFORMANCE
 *  - "Stress Test" button  — generates 200 nodes + 150 edges to show batching
 */

import { createComponent, signal, effect } from 'liteforge';
import {
  createFlow,
  FlowCanvas,
  createHandle,
  getFlowContext,
  createFlowHistory,
  createFlowClipboard,
  createNodeResizer,
  createNodeToolbar,
  createViewportPersistence,
} from '@liteforge/flow';
import type {
  FlowNode,
  FlowEdge,
  NodeComponentFn,
  NodeContextMenuItem,
  PaneContextMenuItem,
  Point,
} from '@liteforge/flow';

// =============================================================================
// Types
// =============================================================================

interface ShowcaseNodeData {
  label: string;
  sub?: string;
}

// =============================================================================
// Toolbar helpers
// =============================================================================

function tbBtn(toolbar: { el: HTMLDivElement }, label: string, onClick: () => void, danger = false): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.className = 'sc-tb-btn' + (danger ? ' sc-tb-btn--danger' : '');
  btn.addEventListener('click', onClick);
  toolbar.el.appendChild(btn);
}

function tbDivider(toolbar: { el: HTMLDivElement }): void {
  const sep = document.createElement('span');
  sep.className = 'sc-tb-sep';
  toolbar.el.appendChild(sep);
}

// =============================================================================
// Node Renderers
// =============================================================================

/**
 * Standard node — has NodeToolbar (shown when selected) + handles.
 * Demonstrates: createNodeToolbar, onNodeMouseEnter/Leave hover highlight.
 */
function StandardNode(node: FlowNode<ShowcaseNodeData>): HTMLElement {
  const ctx = getFlowContext();

  const wrap = document.createElement('div');
  wrap.className = 'sc-node sc-node--standard';

  const label = document.createElement('div');
  label.className = 'sc-node-label';
  label.textContent = node.data.label;
  wrap.appendChild(label);

  if (node.data.sub) {
    const sub = document.createElement('div');
    sub.className = 'sc-node-sub';
    sub.textContent = node.data.sub;
    wrap.appendChild(sub);
  }

  // ── NodeToolbar — appears above the node when it is selected ──────────────
  const toolbar = createNodeToolbar(node.id, ctx, { position: 'top', align: 'center', offset: 6 });
  tbBtn(toolbar, 'Duplicate', () => {
    const copy: FlowNode<ShowcaseNodeData> = {
      ...node,
      id: `dup-${node.id}-${Date.now()}`,
      position: { x: node.position.x + 24, y: node.position.y + 24 },
      selected: false,
    };
    ctx.onNodesChange?.([{ type: 'add', node: copy }]);
  });
  tbDivider(toolbar);
  tbBtn(toolbar, 'Delete', () => ctx.onNodesChange?.([{ type: 'remove', id: node.id }]), true);

  // ── Handles ───────────────────────────────────────────────────────────────
  const getWrapper = (): HTMLElement => wrap.parentElement as HTMLElement ?? wrap;
  const { el: inEl }  = createHandle(node.id, 'in',  'target', 'left',  ctx, getWrapper());
  const { el: outEl } = createHandle(node.id, 'out', 'source', 'right', ctx, getWrapper());
  wrap.appendChild(inEl);
  wrap.appendChild(outEl);

  return wrap;
}

/**
 * Resizable node — demonstrates createNodeResizer (8-direction handles).
 */
function ResizableNode(node: FlowNode<ShowcaseNodeData>): HTMLElement {
  const ctx = getFlowContext();

  const wrap = document.createElement('div');
  wrap.className = 'sc-node sc-node--resizable';
  // Apply any explicit size set by applyNodeChanges
  if (node.width)  wrap.style.width  = `${node.width}px`;
  if (node.height) wrap.style.height = `${node.height}px`;

  const label = document.createElement('div');
  label.className = 'sc-node-label';
  label.textContent = node.data.label;
  wrap.appendChild(label);

  const hint = document.createElement('div');
  hint.className = 'sc-node-sub';
  hint.textContent = 'Drag corners to resize';
  wrap.appendChild(hint);

  // ── NodeResizer ───────────────────────────────────────────────────────────
  const resizerEl = createNodeResizer(node.id, ctx, { minWidth: 120, minHeight: 60 });
  wrap.appendChild(resizerEl);

  // ── NodeToolbar ───────────────────────────────────────────────────────────
  const toolbar = createNodeToolbar(node.id, ctx, { position: 'top' });
  tbBtn(toolbar, 'Delete', () => ctx.onNodesChange?.([{ type: 'remove', id: node.id }]), true);

  const getWrapper = (): HTMLElement => wrap.parentElement as HTMLElement ?? wrap;
  const { el: inEl }  = createHandle(node.id, 'in',  'target', 'left',  ctx, getWrapper());
  const { el: outEl } = createHandle(node.id, 'out', 'source', 'right', ctx, getWrapper());
  wrap.appendChild(inEl);
  wrap.appendChild(outEl);

  return wrap;
}

/**
 * Animated source node — has only an output handle. Visually distinct.
 */
function SourceNode(node: FlowNode<ShowcaseNodeData>): HTMLElement {
  const ctx = getFlowContext();

  const wrap = document.createElement('div');
  wrap.className = 'sc-node sc-node--source';

  const icon = document.createElement('span');
  icon.className = 'sc-node-icon';
  icon.textContent = '⚡';
  wrap.appendChild(icon);

  const label = document.createElement('div');
  label.className = 'sc-node-label';
  label.textContent = node.data.label;
  wrap.appendChild(label);

  const toolbar = createNodeToolbar(node.id, ctx, { position: 'top' });
  tbBtn(toolbar, 'Delete', () => ctx.onNodesChange?.([{ type: 'remove', id: node.id }]), true);

  const getWrapper = (): HTMLElement => wrap.parentElement as HTMLElement ?? wrap;
  const { el: outEl } = createHandle(node.id, 'out', 'source', 'right', ctx, getWrapper());
  wrap.appendChild(outEl);

  return wrap;
}

/**
 * Sink node — output/destination, only an input handle.
 */
function SinkNode(node: FlowNode<ShowcaseNodeData>): HTMLElement {
  const ctx = getFlowContext();

  const wrap = document.createElement('div');
  wrap.className = 'sc-node sc-node--sink';

  const icon = document.createElement('span');
  icon.className = 'sc-node-icon';
  icon.textContent = '🗄';
  wrap.appendChild(icon);

  const label = document.createElement('div');
  label.className = 'sc-node-label';
  label.textContent = node.data.label;
  wrap.appendChild(label);

  const toolbar = createNodeToolbar(node.id, ctx, { position: 'top' });
  tbBtn(toolbar, 'Delete', () => ctx.onNodesChange?.([{ type: 'remove', id: node.id }]), true);

  const getWrapper = (): HTMLElement => wrap.parentElement as HTMLElement ?? wrap;
  const { el: inEl } = createHandle(node.id, 'in', 'target', 'left', ctx, getWrapper());
  wrap.appendChild(inEl);

  return wrap;
}

// =============================================================================
// Node type registry
// =============================================================================

const nodeTypes: Record<string, NodeComponentFn> = {
  standard:  (n: FlowNode) => StandardNode(n as FlowNode<ShowcaseNodeData>),
  resizable: (n: FlowNode) => ResizableNode(n as FlowNode<ShowcaseNodeData>),
  source:    (n: FlowNode) => SourceNode(n as FlowNode<ShowcaseNodeData>),
  sink:      (n: FlowNode) => SinkNode(n as FlowNode<ShowcaseNodeData>),
};

// =============================================================================
// Initial Graph
// =============================================================================

const INITIAL_NODES: FlowNode<ShowcaseNodeData>[] = [
  // Row 1 — animated path (source → process → sink)
  { id: 's1',  type: 'source',    position: { x: 40,  y: 100 }, data: { label: 'Live Source' } },
  { id: 'p1',  type: 'standard',  position: { x: 240, y: 60  }, data: { label: 'Process A', sub: 'Select to see toolbar' } },
  { id: 'p2',  type: 'standard',  position: { x: 240, y: 180 }, data: { label: 'Process B', sub: 'Ctrl+C to copy' } },
  { id: 'r1',  type: 'resizable', position: { x: 460, y: 100 }, data: { label: 'Resizable Node' }, width: 160, height: 80 },
  { id: 'sk1', type: 'sink',      position: { x: 680, y: 100 }, data: { label: 'Database' } },
];

const INITIAL_EDGES: FlowEdge[] = [
  // animated + arrowclosed on the "live" path
  { id: 'e-s1-p1', source: 's1',  sourceHandle: 'out', target: 'p1',  targetHandle: 'in',  animated: true,  markerEnd: 'arrowclosed', label: 'stream' },
  { id: 'e-s1-p2', source: 's1',  sourceHandle: 'out', target: 'p2',  targetHandle: 'in',  animated: true,  markerEnd: 'arrowclosed' },
  { id: 'e-p1-r1', source: 'p1',  sourceHandle: 'out', target: 'r1',  targetHandle: 'in',  markerEnd: 'arrowclosed', label: 'processed' },
  { id: 'e-p2-r1', source: 'p2',  sourceHandle: 'out', target: 'r1',  targetHandle: 'in',  markerEnd: 'arrow' },
  { id: 'e-r1-sk1',source: 'r1',  sourceHandle: 'out', target: 'sk1', targetHandle: 'in',  markerEnd: 'arrowclosed', label: 'write' },
];

// =============================================================================
// Stress-test graph generator
// =============================================================================

function generateStressGraph(): { nodes: FlowNode<ShowcaseNodeData>[]; edges: FlowEdge[] } {
  const nodes: FlowNode<ShowcaseNodeData>[] = [];
  const edges: FlowEdge[] = [];
  const cols = 20;
  const rows = 10;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `stress-${r}-${c}`;
      nodes.push({
        id,
        type: 'standard',
        position: { x: 60 + c * 120, y: 60 + r * 80 },
        data: { label: `N ${r * cols + c + 1}` },
      });
      // Connect to next column (150 edges total for 200 nodes)
      if (c < cols - 1 && r * cols + c < 150) {
        const targetId = `stress-${r}-${c + 1}`;
        edges.push({
          id: `se-${r}-${c}`,
          source: id, sourceHandle: 'out',
          target: targetId, targetHandle: 'in',
          markerEnd: 'arrow',
        });
      }
    }
  }
  return { nodes, edges };
}

// =============================================================================
// FlowShowcase Component
// =============================================================================

export const FlowShowcase = createComponent({
  name: 'FlowShowcase',

  setup() {
    const nodes = signal<FlowNode<ShowcaseNodeData>[]>(INITIAL_NODES);
    const edges = signal<FlowEdge[]>(INITIAL_EDGES);

    const flow = createFlow({ nodeTypes });

    // ── createFlowHistory — undo/redo ────────────────────────────────────────
    const history = createFlowHistory(nodes, edges);
    history.attachKeyboard();

    // ── createFlowClipboard — Ctrl+C / Ctrl+V ────────────────────────────────
    // attachKeyboard() intercepts Ctrl+C and Ctrl+V globally.
    // hasContent drives the paste button's disabled state.
    const clipboard = createFlowClipboard(nodes, edges, {
      pasteOffset: { x: 30, y: 30 },
    });
    clipboard.attachKeyboard();

    // ── createViewportPersistence — viewport survives reload ─────────────────
    // savedViewport is read on first render as defaultViewport.
    // onViewportChange is called on every pan/zoom and writes to localStorage
    // after a 400ms debounce.
    const persist = createViewportPersistence('flow-showcase', flow, { debounce: 400 });

    // ── Hover highlight state ────────────────────────────────────────────────
    const hoveredNodeId = signal<string | null>(null);

    // Apply hover class reactively
    effect(() => {
      const hovered = hoveredNodeId();
      document.querySelectorAll('.lf-node-wrapper').forEach((el) => {
        const wrapper = el as HTMLElement;
        const nodeId = wrapper.dataset['nodeId'];
        if (nodeId) {
          wrapper.classList.toggle('sc-node-hovered', nodeId === hovered);
        }
      });
    });

    // ── Clipboard toast signal ────────────────────────────────────────────────
    const clipboardMsg = signal('');
    let clipMsgTimer = 0;
    function showClipMsg(msg: string) {
      clipboardMsg.set(msg);
      clearTimeout(clipMsgTimer);
      clipMsgTimer = window.setTimeout(() => clipboardMsg.set(''), 1800);
    }

    function handleCopy() {
      clipboard.copy();
      showClipMsg(clipboard.hasContent ? '📋 Copied!' : 'Select nodes first');
    }
    function handlePaste() {
      const pasted = clipboard.paste();
      if (pasted.length) showClipMsg(`📌 Pasted ${pasted.length} node${pasted.length > 1 ? 's' : ''}`);
    }

    // ── Stress test ──────────────────────────────────────────────────────────
    const isStress = signal(false);
    function runStressTest() {
      if (isStress()) {
        nodes.set(INITIAL_NODES);
        edges.set(INITIAL_EDGES);
        isStress.set(false);
      } else {
        const { nodes: sn, edges: se } = generateStressGraph();
        nodes.set(sn);
        edges.set(se);
        isStress.set(true);
      }
    }

    // ── Context menus ────────────────────────────────────────────────────────
    const nodeContextMenu: NodeContextMenuItem[] = [
      {
        label: '📋 Copy Node',
        action: () => { clipboard.copy(); showClipMsg('📋 Copied!'); },
      },
      {
        label: '🗑 Delete',
        action: (node: FlowNode) => history.onNodesChange([{ type: 'remove', id: node.id }]),
      },
    ];

    const paneContextMenu: PaneContextMenuItem[] = [
      {
        label: '📌 Paste',
        action: (_pos: Point) => { handlePaste(); },
      },
      {
        label: '➕ Add Node',
        action: (canvasPos: Point) => {
          const snap = (v: number) => Math.round(v / 20) * 20;
          history.onNodesChange([{
            type: 'add',
            node: {
              id: `node-${Date.now()}`,
              type: 'standard',
              position: { x: snap(canvasPos.x), y: snap(canvasPos.y) },
              data: { label: 'New Node', sub: 'Right-click to delete' },
            },
          }]);
        },
      },
    ];

    const summary = () => {
      const n = nodes().length;
      const e = edges().length;
      const sel = nodes().filter(nd => nd.selected).length + edges().filter(ed => ed.selected).length;
      return `${n} nodes · ${e} edges${sel > 0 ? ` · ${sel} selected` : ''}`;
    };

    return {
      nodes, edges, flow,
      history,
      clipboard, clipboardMsg,
      handleCopy, handlePaste,
      persist,
      hoveredNodeId,
      isStress, runStressTest,
      nodeContextMenu, paneContextMenu,
      summary,
    };
  },

  component({ setup }) {
    const {
      nodes, edges, flow,
      history,
      clipboardMsg,
      handleCopy, handlePaste,
      persist,
      hoveredNodeId,
      isStress, runStressTest,
      nodeContextMenu, paneContextMenu,
      summary,
    } = setup;

    return (
      <div class="flow-page sc-page">

        {/* ── Header ── */}
        <div class="flow-page-header sc-header">
          <div class="flow-page-title">
            <h1>Flow Showcase</h1>
            <span class="flow-page-badge">v0.4.0</span>
          </div>

          <div class="flow-page-actions">
            <span class="flow-status">{() => summary()}</span>

            {/* Undo / Redo */}
            <button
              type="button"
              class="flow-btn flow-btn-icon"
              disabled={() => !history.canUndo()}
              onclick={() => history.undo()}
              title="Undo (Ctrl+Z)"
            >↩</button>
            <button
              type="button"
              class="flow-btn flow-btn-icon"
              disabled={() => !history.canRedo()}
              onclick={() => history.redo()}
              title="Redo (Ctrl+Y)"
            >↪</button>

            <div class="sc-divider" />

            {/* Clipboard — createFlowClipboard */}
            <div class="sc-clipboard-group">
              <button
                type="button"
                class="flow-btn flow-btn-secondary sc-btn-copy"
                onclick={handleCopy}
                title="Copy selected nodes (Ctrl+C)"
              >
                Copy
              </button>
              <button
                type="button"
                class="flow-btn flow-btn-secondary sc-btn-paste"
                onclick={handlePaste}
                title="Paste (Ctrl+V)"
              >
                Paste
              </button>
              <span class="sc-clip-msg">{() => clipboardMsg()}</span>
            </div>

            <div class="sc-divider" />

            {/* Stress test — demonstrates edge batching */}
            <button
              type="button"
              class={() => `flow-btn ${isStress() ? 'sc-btn-stress-active' : 'sc-btn-stress'}`}
              onclick={runStressTest}
              title="Generate 200 nodes + 150 edges — observe smooth pan/zoom via edge batching"
            >
              {() => isStress() ? '✕ Reset' : '⚡ Stress Test'}
            </button>
          </div>
        </div>

        {/* ── Feature badges strip ── */}
        <div class="sc-features-strip">
          <span class="sc-badge sc-badge--green">animated edges</span>
          <span class="sc-badge sc-badge--blue">arrowclosed markers</span>
          <span class="sc-badge sc-badge--purple">NodeToolbar (select a node)</span>
          <span class="sc-badge sc-badge--orange">NodeResizer (middle node)</span>
          <span class="sc-badge sc-badge--teal">edge reconnect (hover an edge)</span>
          <span class="sc-badge sc-badge--gray">viewport persisted</span>
        </div>

        {/* ── Canvas ── */}
        <div class="flow-canvas-wrapper">
          {FlowCanvas({
            flow,
            nodes,
            edges,
            fitView:      true,
            snapToGrid:   [20, 20],
            showMiniMap:  true,
            showControls: true,
            defaultViewport: persist.savedViewport,
            onNodesChange: history.onNodesChange,
            onEdgesChange: history.onEdgesChange,
            onConnect:          history.onConnect,
            onViewportChange:   persist.onViewportChange,
            nodeContextMenu,
            paneContextMenu,
            onNodeMouseEnter:   (node: FlowNode) => hoveredNodeId.set(node.id),
            onNodeMouseLeave:   (_node: FlowNode) => hoveredNodeId.set(null),
          })}
        </div>

        {/* ── Shortcuts footer ── */}
        <div class="flow-page-footer sc-footer">
          <span>Drag nodes · Scroll/pinch to zoom · Space+drag to pan</span>
          <span class="sc-footer-sep">·</span>
          <span><kbd>Ctrl+C</kbd> copy · <kbd>Ctrl+V</kbd> paste</span>
          <span class="sc-footer-sep">·</span>
          <span><kbd>Del</kbd> remove selected</span>
          <span class="sc-footer-sep">·</span>
          <span><kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+Y</kbd> redo</span>
          <span class="sc-footer-sep">·</span>
          <span><kbd>Tab</kbd> navigate nodes</span>
          <span class="sc-footer-sep">·</span>
          <span>Hover edge endpoints to reconnect · Right-click for menu · Viewport auto-saved</span>
        </div>

      </div>
    );
  },
});
