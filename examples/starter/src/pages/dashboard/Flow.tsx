/**
 * Flow Page — demonstrates @liteforge/flow
 *
 * A fully-controlled pipeline editor showing all major features:
 *
 *  INTERACTION
 *  - Multi-node drag    — shift-click to select multiple, drag any selected node
 *  - Undo / Redo        — createFlowHistory() wraps change handlers; Ctrl+Z/Y + UI buttons
 *
 *  CANVAS UX
 *  - Snap to grid       — snapToGrid={[20, 20]} keeps nodes on a clean 20px grid
 *  - Context menu       — right-click node / edge / canvas for actions
 *
 *  QUALITY
 *  - Edge labels        — edges display a text label at their midpoint
 *  - Auto-layout        — "Auto Layout" button re-positions nodes with createAutoLayout()
 */

import { createComponent, signal } from 'liteforge';
import {
  createFlow,
  FlowCanvas,
  createHandle,
  getFlowContext,
  createFlowHistory,
  createAutoLayout,
} from '@liteforge/flow';
import type {
  FlowNode,
  FlowEdge,
  NodeComponentFn,
  NodeContextMenuItem,
  EdgeContextMenuItem,
  PaneContextMenuItem,
  Point,
} from '@liteforge/flow';

// =============================================================================
// Types
// =============================================================================

interface NodeData {
  label: string;
  description?: string;
}

// =============================================================================
// Node Renderers
// =============================================================================

function makeNodeEl(
  typeClass: string,
  typeLabel: string,
  node: FlowNode<NodeData>,
  hasIn: boolean,
  hasOut: boolean,
): HTMLElement {
  const ctx = getFlowContext();

  const wrap = document.createElement('div');
  wrap.className = `flow-node flow-node--${typeClass}`;
  wrap.style.position = 'relative';

  const badge = document.createElement('span');
  badge.className = 'flow-node-type';
  badge.textContent = typeLabel;
  wrap.appendChild(badge);

  const title = document.createElement('div');
  title.className = 'flow-node-label';
  title.textContent = (node.data as NodeData).label;
  wrap.appendChild(title);

  if ((node.data as NodeData).description) {
    const desc = document.createElement('div');
    desc.className = 'flow-node-desc';
    desc.textContent = (node.data as NodeData).description ?? '';
    wrap.appendChild(desc);
  }

  const getWrapper = (): HTMLElement => wrap.parentElement as HTMLElement ?? wrap;

  if (hasIn) {
    const { el } = createHandle(node.id, 'in', 'target', 'left', ctx, getWrapper());
    wrap.appendChild(el);
  }
  if (hasOut) {
    const { el } = createHandle(node.id, 'out', 'source', 'right', ctx, getWrapper());
    wrap.appendChild(el);
  }

  return wrap;
}

const nodeTypes: Record<string, NodeComponentFn> = {
  input:   (n: FlowNode) => makeNodeEl('input',   'INPUT',   n as FlowNode<NodeData>, false, true),
  process: (n: FlowNode) => makeNodeEl('process', 'PROCESS', n as FlowNode<NodeData>, true,  true),
  output:  (n: FlowNode) => makeNodeEl('output',  'OUTPUT',  n as FlowNode<NodeData>, true,  false),
};

// =============================================================================
// Initial Graph
// =============================================================================

const INITIAL_NODES: FlowNode<NodeData>[] = [
  { id: '1', type: 'input',   position: { x: 60,  y: 160 }, data: { label: 'Data Source',  description: 'Fetches raw data'     } },
  { id: '2', type: 'process', position: { x: 300, y: 60  }, data: { label: 'Transform',    description: 'Normalizes fields'    } },
  { id: '3', type: 'process', position: { x: 300, y: 240 }, data: { label: 'Filter',       description: 'Removes duplicates'   } },
  { id: '4', type: 'output',  position: { x: 540, y: 160 }, data: { label: 'Export',       description: 'Writes to database'   } },
];

const INITIAL_EDGES: FlowEdge[] = [
  { id: 'e1-2', source: '1', sourceHandle: 'out', target: '2', targetHandle: 'in', label: 'raw' },
  { id: 'e1-3', source: '1', sourceHandle: 'out', target: '3', targetHandle: 'in', label: 'raw' },
  { id: 'e2-4', source: '2', sourceHandle: 'out', target: '4', targetHandle: 'in', label: 'clean' },
  { id: 'e3-4', source: '3', sourceHandle: 'out', target: '4', targetHandle: 'in' },
];

// =============================================================================
// Flow Page
// =============================================================================

export const FlowPage = createComponent({
  name: 'FlowPage',

  setup() {
    const nodes = signal<FlowNode<NodeData>[]>(INITIAL_NODES);
    const edges = signal<FlowEdge[]>(INITIAL_EDGES);

    // ── createFlow ──────────────────────────────────────────────────────────
    const flow = createFlow({ nodeTypes });

    // ── createFlowHistory — Undo/Redo ────────────────────────────────────────
    // Wraps onNodesChange / onEdgesChange / onConnect.
    // All structural changes (position, remove, connect) are pushed to a stack.
    // canUndo / canRedo are Signals that drive the button disabled state.
    const history = createFlowHistory(nodes, edges);
    history.attachKeyboard(); // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z

    // ── createAutoLayout ─────────────────────────────────────────────────────
    // User-space composable — returns NodeChange[] that the user commits.
    // direction:'LR' = left-to-right (matching the pipeline flow).
    const autoLayout = createAutoLayout({ direction: 'LR', nodeSpacing: 40, rankSpacing: 100 });

    function applyAutoLayout() {
      const changes = autoLayout.layout(nodes.peek(), edges.peek());
      // Push to undo stack so layout can be reverted with Ctrl+Z
      history.onNodesChange(changes);
    }

    // ── Context Menu item arrays ─────────────────────────────────────────────
    // Each item calls framework actions (via history wrappers so they're undoable).

    const nodeContextMenu: NodeContextMenuItem[] = [
      {
        label: '🗑 Delete Node',
        action: (node: FlowNode) => history.onNodesChange([{ type: 'remove', id: node.id }]),
      },
      {
        label: '📋 Duplicate Node',
        action: (node: FlowNode) => {
          const id = `dup-${node.id}-${Date.now()}`;
          nodes.set([
            ...nodes.peek(),
            {
              ...node,
              id,
              position: { x: node.position.x + 40, y: node.position.y + 40 },
              selected: false,
            },
          ]);
        },
      },
    ];

    const edgeContextMenu: EdgeContextMenuItem[] = [
      {
        label: '🗑 Delete Edge',
        action: (edge: FlowEdge) => history.onEdgesChange([{ type: 'remove', id: edge.id }]),
      },
      {
        label: '✏️ Edit Label',
        action: (edge: FlowEdge) => {
          const current = edge.label ?? '';
          const label = window.prompt('Edge label:', current);
          if (label === null) return; // cancelled
          edges.set(
            edges.peek().map(e => e.id === edge.id ? { ...e, label: label.trim() || undefined } : e),
          );
        },
      },
    ];

    // Pane right-click → add a process node at the cursor's canvas position
    const paneContextMenu: PaneContextMenuItem[] = [
      {
        label: '➕ Add Process Node',
        action: (canvasPos: Point) => {
          // Snap to grid manually so new node aligns with snapToGrid=[20,20]
          const snap = (v: number) => Math.round(v / 20) * 20;
          const id = `node-${Date.now()}`;
          nodes.set([
            ...nodes.peek(),
            {
              id,
              type: 'process',
              position: { x: snap(canvasPos.x), y: snap(canvasPos.y) },
              data: { label: 'New Node' },
            },
          ]);
        },
      },
    ];

    function addNode() {
      const id = `node-${Date.now()}`;
      const prev = nodes.peek();
      const last = prev[prev.length - 1];
      nodes.set([
        ...prev,
        {
          id,
          type: 'process',
          position: { x: (last?.position.x ?? 100) + 40, y: (last?.position.y ?? 100) + 60 },
          data: { label: `Node ${prev.length + 1}` },
        },
      ]);
    }

    function reset() {
      nodes.set(INITIAL_NODES);
      edges.set(INITIAL_EDGES);
    }

    return {
      nodes, edges, flow,
      history,
      applyAutoLayout,
      nodeContextMenu, edgeContextMenu, paneContextMenu,
      addNode, reset,
    };
  },

  component({ setup }) {
    const {
      nodes, edges, flow,
      history,
      applyAutoLayout,
      nodeContextMenu, edgeContextMenu, paneContextMenu,
      addNode, reset,
    } = setup;

    const summary = () => {
      const sel = nodes().filter(n => n.selected).length + edges().filter(e => e.selected).length;
      return `${nodes().length} nodes · ${edges().length} edges${sel > 0 ? ` · ${sel} selected` : ''}`;
    };

    return (
      <div class="flow-page">

        {/* ── Header ── */}
        <div class="flow-page-header">
          <div class="flow-page-title">
            <h1>Node Editor</h1>
            <span class="flow-page-badge">@liteforge/flow</span>
          </div>

          <div class="flow-page-actions">
            <span class="flow-status">{() => summary()}</span>

            {/* Undo/Redo — disabled attr driven by canUndo/canRedo Signals */}
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

            {/* Auto Layout — runs createAutoLayout().layout(), commits via history */}
            <button type="button" class="flow-btn flow-btn-secondary" onclick={applyAutoLayout}>
              ⬡ Auto Layout
            </button>

            <button type="button" class="flow-btn" onclick={addNode}>+ Add Node</button>
            <button type="button" class="flow-btn flow-btn-secondary" onclick={reset}>Reset</button>
          </div>
        </div>

        {/* ── Canvas ──
            snapToGrid={[20, 20]}   → nodes snap to 20px grid during drag
            nodeContextMenu / edgeContextMenu / paneContextMenu → right-click menus
        */}
        <div class="flow-canvas-wrapper">
          {FlowCanvas({
            flow,
            nodes,
            edges,
            onNodesChange: history.onNodesChange,
            onEdgesChange: history.onEdgesChange,
            onConnect:     history.onConnect,
            snapToGrid:    [20, 20],
            nodeContextMenu,
            edgeContextMenu,
            paneContextMenu,
          })}
        </div>

        {/* ── Footer ── */}
        <div class="flow-page-footer">
          Drag · Scroll to zoom · Space+drag to pan · Shift+click multi-select ·
          Delete to remove · Right-click for actions · Ctrl+Z/Y to undo/redo
        </div>

      </div>
    );
  },
});
