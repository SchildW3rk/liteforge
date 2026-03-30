/**
 * Flow Page — demonstrates @liteforge/flow
 *
 * A fully controlled node editor with:
 * - 4 initial nodes connected by 4 edges (pipeline graph)
 * - Custom node types: input, process, output
 * - Drag nodes, scroll to zoom, space+drag to pan
 * - Marquee select, shift-click multi-select, Delete to remove
 * - MiniMap + Controls (zoom in/out, fitView)
 * - onConnect: draws new edges by dropping on another node's handle dot
 */

import { createComponent, signal } from 'liteforge';
import {
  createFlow,
  FlowCanvas,
  applyNodeChanges,
  applyEdgeChanges,
} from '@liteforge/flow';
import type {
  FlowNode,
  FlowEdge,
  NodeChange,
  EdgeChange,
  Connection,
  NodeComponentFn,
} from '@liteforge/flow';

// =============================================================================
// Types
// =============================================================================

interface NodeData {
  label: string;
  description?: string;
}

// =============================================================================
// Node Renderers (plain DOM — no JSX, these run outside the runtime)
// =============================================================================

function makeNodeEl(
  typeClass: string,
  typeLabel: string,
  node: FlowNode<NodeData>,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `flow-node flow-node--${typeClass}`;

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

  return wrap;
}

const nodeTypes: Record<string, NodeComponentFn> = {
  input:   (n) => makeNodeEl('input',   'INPUT',   n as FlowNode<NodeData>),
  process: (n) => makeNodeEl('process', 'PROCESS', n as FlowNode<NodeData>),
  output:  (n) => makeNodeEl('output',  'OUTPUT',  n as FlowNode<NodeData>),
};

// =============================================================================
// Initial Graph
// =============================================================================

const INITIAL_NODES: FlowNode<NodeData>[] = [
  {
    id: '1',
    type: 'input',
    position: { x: 60, y: 160 },
    data: { label: 'Data Source', description: 'Fetches raw data' },
  },
  {
    id: '2',
    type: 'process',
    position: { x: 300, y: 60 },
    data: { label: 'Transform', description: 'Normalizes fields' },
  },
  {
    id: '3',
    type: 'process',
    position: { x: 300, y: 240 },
    data: { label: 'Filter', description: 'Removes duplicates' },
  },
  {
    id: '4',
    type: 'output',
    position: { x: 540, y: 160 },
    data: { label: 'Export', description: 'Writes to database' },
  },
];

const INITIAL_EDGES: FlowEdge[] = [
  { id: 'e1-2', source: '1', sourceHandle: 'out', target: '2', targetHandle: 'in' },
  { id: 'e1-3', source: '1', sourceHandle: 'out', target: '3', targetHandle: 'in' },
  { id: 'e2-4', source: '2', sourceHandle: 'out', target: '4', targetHandle: 'in' },
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

    const flow = createFlow({ nodeTypes });

    function onNodesChange(changes: NodeChange[]) {
      nodes.set(applyNodeChanges(changes, nodes.peek()));
    }

    function onEdgesChange(changes: EdgeChange[]) {
      edges.set(applyEdgeChanges(changes, edges.peek()));
    }

    function onConnect(connection: Connection) {
      const id = `e${connection.source}-${connection.target}`;
      if (edges.peek().some(e => e.id === id)) return;
      edges.set([...edges.peek(), { id, ...connection }]);
    }

    function addNode() {
      const id = String(Date.now());
      const prev = nodes.peek();
      const last = prev[prev.length - 1];
      nodes.set([
        ...prev,
        {
          id,
          type: 'process',
          position: {
            x: (last?.position.x ?? 100) + 40,
            y: (last?.position.y ?? 100) + 60,
          },
          data: { label: `Node ${prev.length + 1}` },
        },
      ]);
    }

    function reset() {
      nodes.set(INITIAL_NODES);
      edges.set(INITIAL_EDGES);
    }

    return { nodes, edges, flow, onNodesChange, onEdgesChange, onConnect, addNode, reset };
  },

  component({ setup }) {
    const { nodes, edges, flow, onNodesChange, onEdgesChange, onConnect, addNode, reset } = setup;

    const summary = () => {
      const sel = nodes().filter(n => n.selected).length + edges().filter(e => e.selected).length;
      return `${nodes().length} nodes · ${edges().length} edges${sel > 0 ? ` · ${sel} selected` : ''}`;
    };

    return (
      <div class="flow-page">
        <div class="flow-page-header">
          <div class="flow-page-title">
            <h1>Node Editor</h1>
            <span class="flow-page-badge">@liteforge/flow</span>
          </div>
          <div class="flow-page-actions">
            <span class="flow-status">{() => summary()}</span>
            <button type="button" class="flow-btn" onclick={addNode}>+ Add Node</button>
            <button type="button" class="flow-btn flow-btn-secondary" onclick={reset}>Reset</button>
          </div>
        </div>

        <div class="flow-canvas-wrapper">
          {FlowCanvas({ flow, nodes, edges, onNodesChange, onEdgesChange, onConnect })}
        </div>

        <div class="flow-page-footer">
          Drag nodes · Scroll to zoom · Space+drag to pan · Click to select · Delete to remove
        </div>
      </div>
    );
  },
});
