/**
 * API Pipeline — @liteforge/flow demo
 *
 * An n8n-style visual pipeline editor demonstrating all flow features.
 *
 * ─── Architecture ────────────────────────────────────────────────────────────
 *
 *  Node Renderers: pure JSX functions (node: FlowNode) → Node
 *  ──────────────────────────────────────────────────────────
 *  All node content is JSX. The Vite plugin wraps reactive expressions in
 *  getters so `() => execNodeStates().get(id)` creates a live effect — no
 *  document.createElement(), no querySelectorAll(), no innerHTML.
 *
 *  Execution State: module-level signals
 *  ─────────────────────────────────────
 *  execNodeStates / execNodeOutputs live at module scope so node renderer
 *  functions can read them reactively inside JSX without needing component
 *  context. They're reset on every new run.
 *
 *  Properties Panel: JSX with Show + reactive bindings
 *  ────────────────────────────────────────────────────
 *  selectedNodeId drives a Show block. The form is pure JSX — no imperative
 *  DOM construction.
 *
 *  Execution Engine: Approach A — Recursive Graph Traversal
 *  ─────────────────────────────────────────────────────────
 *  Follows edges from the trigger node. Condition node splits into two async
 *  branches. A visited Set prevents cycles. Signals updated after each node
 *  drive reactive class changes in the already-mounted JSX.
 */

import { createComponent, signal } from 'liteforge';
import {
  createFlow,
  FlowCanvas,
  defineNode,
  withNodeStatus,
  createFlowHistory,
  createAutoLayout,
  createNodeContextMenu,
  createEdgeContextMenu,
  createPaneContextMenu,
  createFlowRunner,
  createFlowRunnerSignals,
  createNodePropertiesPanel,
} from '@liteforge/flow';
import type {
  FlowNode,
  FlowEdge,
  NodeComponentFn,
  NodeChange,
  NodeExecStatus,
  ExecuteContext,
} from '@liteforge/flow';

// =============================================================================
// Node Data Shapes
// =============================================================================

interface TriggerData   { label: string; triggerType: 'webhook' | 'schedule' | 'manual'; username: string }
interface AuthData      { label: string; authType: 'bearer' | 'api-key' | 'basic'; token: string }
interface HttpData      { label: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; url: string }
interface TransformData { label: string; expression: string }
interface ConditionData { label: string; field: string; operator: '>' | '<' | '==' | '!=' | 'contains'; value: string }
interface ResponseData  { label: string; status: number; body: string }

type PipelineNodeData =
  | TriggerData | AuthData | HttpData
  | TransformData | ConditionData | ResponseData

// =============================================================================
// Execution State — module-level signals via createFlowRunnerSignals
//
// Living at module scope lets node renderer functions (which are plain
// functions, not components) read them reactively in JSX expressions.
// onFlush + reset are used in setup(); flow.setEdgeActive is wired there too.
// =============================================================================

const rs = createFlowRunnerSignals()
const { states: execNodeStates, outputs: execNodeOutputs, errors: execNodeErrors } = rs

// =============================================================================
// Node Types — defined with defineNode()
// =============================================================================

// Shared withNodeStatus options — pipeline-specific class prefix + output tooltip
const statusOpts = {
  statusClass:  (s: NodeExecStatus) => s === 'idle' ? '' : `pipe-node--${s}`,
  outputSignal: execNodeOutputs,
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ws = (fn: NodeComponentFn<any>) => withNodeStatus(execNodeStates, fn, statusOpts)

const nodeTypes: Record<string, NodeComponentFn> = {
  trigger:   ws(defineNode<TriggerData>({
    type:    'trigger',
    icon:    '⚡',
    color:   '#10b981',
    outputs: [{ id: 'out' }],
    fields: {
      triggerType: { type: 'select', label: 'Type',    options: ['webhook', 'schedule', 'manual'] },
      username:    { type: 'text',   label: 'User' },
    },
  })),

  auth:      ws(defineNode<AuthData>({
    type:    'auth',
    icon:    '🔑',
    color:   '#f59e0b',
    inputs:  [{ id: 'in' }],
    outputs: [{ id: 'out' }],
    fields: {
      authType: { type: 'select', label: 'Method', options: ['bearer', 'api-key', 'basic'] },
      token:    { type: 'text',   label: 'Token' },
    },
  })),

  http:      ws(defineNode<HttpData>({
    type:    'http',
    icon:    '🌐',
    color:   '#3b82f6',
    inputs:  [{ id: 'in' }],
    outputs: [{ id: 'out' }],
    fields: {
      method: { type: 'select', label: 'Method', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      url:    { type: 'text',   label: 'URL' },
    },
  })),

  transform: ws(defineNode<TransformData>({
    type:    'transform',
    icon:    '⚙️',
    color:   '#8b5cf6',
    inputs:  [{ id: 'in' }],
    outputs: [{ id: 'out' }],
    fields: {
      expression: { type: 'textarea', label: 'Expr' },
    },
  })),

  condition: ws(defineNode<ConditionData>({
    type:    'condition',
    icon:    '🔀',
    color:   '#f97316',
    inputs:  [{ id: 'in' }],
    outputs: [
      { id: 'true',  label: 'T', offsetPercent: 0.3 },
      { id: 'false', label: 'F', offsetPercent: 0.7 },
    ],
    fields: {
      field:    { type: 'text',   label: 'Field' },
      operator: { type: 'select', label: 'Check', options: ['>', '<', '==', '!=', 'contains'] },
      value:    { type: 'text',   label: 'Value' },
    },
  })),

  response: ws(defineNode<ResponseData>({
    type:   'response',
    icon:   '📤',
    color:  (d) => d.status >= 400 ? '#ef4444' : d.status >= 300 ? '#f59e0b' : '#10b981',
    inputs: [{ id: 'in' }],
    fields: {
      status: { type: 'number', label: 'Status' },
      body:   { type: 'text',   label: 'Body'   },
    },
  })),
}

// =============================================================================
// Execution Engine — per-type executors for createFlowRunner
// =============================================================================

function evalCondition(cfg: ConditionData, payload: unknown): boolean {
  const obj = payload as Record<string, unknown>
  const v = obj?.[cfg.field]
  switch (cfg.operator) {
    case '>':        return Number(v) > Number(cfg.value)
    case '<':        return Number(v) < Number(cfg.value)
    case '==':       return String(v) === cfg.value
    case '!=':       return String(v) !== cfg.value
    case 'contains': return String(v).includes(cfg.value)
    default:         return false
  }
}

const pipelineExecutors = {
  trigger: ({ data, log }: ExecuteContext<TriggerData>) => {
    const out = { username: data.username || 'octocat', _headers: {} as Record<string, string> }
    log(`▶ Trigger fired — username: "${out.username}"`)
    return { output: out }
  },

  auth: ({ data, payload, log }: ExecuteContext<AuthData>) => {
    const ctx = payload as Record<string, unknown>
    const headers = { ...(ctx._headers as Record<string, string> ?? {}) }
    if (data.token.trim()) {
      if (data.authType === 'bearer')      headers['Authorization'] = `Bearer ${data.token}`
      else if (data.authType === 'api-key') headers['X-API-Key'] = data.token
      else                                  headers['Authorization'] = `Basic ${btoa(data.token)}`
      log(`🔑 Auth — added ${data.authType} header`)
    } else {
      log('🔑 Auth — no token configured, skipping header')
    }
    return { output: { ...ctx, _headers: headers } }
  },

  http: async ({ data, payload, log }: ExecuteContext<HttpData>) => {
    const ctx = payload as Record<string, unknown>
    const headers = ctx._headers as Record<string, string> ?? {}
    const url = data.url.replace('{username}', (ctx.username as string) ?? '')
    log(`🌐 HTTP ${data.method} → https://${url}`)
    const res = await fetch(`https://${url}`, {
      method: data.method,
      headers: { 'Content-Type': 'application/json', ...headers },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    const json = await res.json()
    log(`   ✓ ${res.status} OK`)
    return { output: json }
  },

  transform: ({ data, payload, log }: ExecuteContext<TransformData>) => {
    // eslint-disable-next-line no-new-func
    const fn = new Function('data', `"use strict"; return (${data.expression})`)
    log(`⚙️ Transform — ${data.expression.slice(0, 40)}`)
    return { output: fn(payload) }
  },

  condition: ({ data, payload, log }: ExecuteContext<ConditionData>) => {
    const result = evalCondition(data, payload)
    const outHandle  = result ? 'true'  : 'false'
    const skipHandle = result ? 'false' : 'true'
    log(`🔀 Condition "${data.field} ${data.operator} ${data.value}" → ${result ? 'TRUE' : 'FALSE'}`)
    return { output: { ...((payload as object) ?? {}), _branch: result }, outHandle, skipHandles: [skipHandle] }
  },

  response: ({ data, payload, log }: ExecuteContext<ResponseData>) => {
    log(`📤 Response ${data.status} — ${data.body.slice(0, 40)}`)
    return { output: { status: data.status, body: data.body, payload } }
  },
}

// =============================================================================
// Initial Workflow
// =============================================================================

const INITIAL_NODES: FlowNode<PipelineNodeData>[] = [
  { id: 'trigger',   type: 'trigger',   position: { x: 40,   y: 200 }, data: { label: 'Webhook',       triggerType: 'webhook',  username: 'torvalds'                                                       } as TriggerData   },
  { id: 'auth',      type: 'auth',      position: { x: 320,  y: 200 }, data: { label: 'Bearer Auth',    authType: 'bearer',      token: ''                                                                  } as AuthData      },
  { id: 'http',      type: 'http',      position: { x: 600,  y: 200 }, data: { label: 'GitHub API',     method: 'GET',           url: 'api.github.com/users/{username}'                                     } as HttpData      },
  { id: 'transform', type: 'transform', position: { x: 880,  y: 200 }, data: { label: 'Extract Fields', expression: '({ name: data.name, followers: data.followers, repos: data.public_repos })'           } as TransformData },
  { id: 'condition', type: 'condition', position: { x: 1160, y: 200 }, data: { label: 'Is Popular?',    field: 'followers',      operator: '>',           value: '1000'                                     } as ConditionData },
  { id: 'resp-yes',  type: 'response',  position: { x: 1440, y: 80  }, data: { label: 'Popular',        status: 200,             body: '"Popular developer"'                                                } as ResponseData  },
  { id: 'resp-no',   type: 'response',  position: { x: 1440, y: 320 }, data: { label: 'Regular User',   status: 200,             body: '"Regular developer"'                                                } as ResponseData  },
]

const INITIAL_EDGES: FlowEdge[] = [
  { id: 'e1', source: 'trigger',   sourceHandle: 'out',   target: 'auth',      targetHandle: 'in', label: 'webhook payload'  },
  { id: 'e2', source: 'auth',      sourceHandle: 'out',   target: 'http',      targetHandle: 'in', label: 'with auth header' },
  { id: 'e3', source: 'http',      sourceHandle: 'out',   target: 'transform', targetHandle: 'in', label: 'raw response'     },
  { id: 'e4', source: 'transform', sourceHandle: 'out',   target: 'condition', targetHandle: 'in', label: 'mapped data'      },
  { id: 'e5', source: 'condition', sourceHandle: 'true',  target: 'resp-yes',  targetHandle: 'in', label: 'true branch'      },
  { id: 'e6', source: 'condition', sourceHandle: 'false', target: 'resp-no',   targetHandle: 'in', label: 'false branch'     },
]

// =============================================================================
// Page Component
// =============================================================================

export const ApiPipelinePage = createComponent({
  name: 'ApiPipelinePage',

  setup() {
    const nodes = signal<FlowNode<PipelineNodeData>[]>(INITIAL_NODES)
    const edges = signal<FlowEdge[]>(INITIAL_EDGES)

    const flow = createFlow({ nodeTypes })

    // ── Undo / Redo ──────────────────────────────────────────────────────────
    const history = createFlowHistory(nodes, edges)
    history.attachKeyboard()

    // ── Auto Layout ──────────────────────────────────────────────────────────
    const autoLayout = createAutoLayout({ direction: 'LR', nodeSpacing: 60, rankSpacing: 140 })
    function applyAutoLayout() {
      history.onNodesChange(autoLayout.layout(nodes.peek(), edges.peek()))
    }

    // ── Properties Panel ─────────────────────────────────────────────────────
    const selectedNodeId = signal<string | null>(null)

    function onNodeClick(node: FlowNode) {
      selectedNodeId.set(node.id === selectedNodeId.peek() ? null : node.id)
    }

    function commitDataChange(change: NodeChange) {
      history.onNodesChange([change])
    }

    // ── Execution ─────────────────────────────────────────────────────────────
    const execRunning = signal(false)

    const runner = createFlowRunner({
      executors: pipelineExecutors,
      ...rs,
      onEdgeStatusChange: (id, active) => flow.setEdgeActive(id, active),
    })

    async function runPipeline() {
      if (execRunning.peek()) return
      const currentNodes = nodes.peek()
      const triggerNode  = currentNodes.find(n => n.type === 'trigger')
      if (!triggerNode) return

      execRunning.set(true)
      rs.log.set(['⚡ Pipeline starting…'])
      try {
        const result = await runner.run(triggerNode, currentNodes, edges.peek())
        const finalLog = [...result.log, result.nodeErrors.size > 0
          ? `⚠️ Completed with ${result.nodeErrors.size} error(s)`
          : '✅ Pipeline completed successfully']
        rs.log.set(finalLog)
      } finally {
        execRunning.set(false)
      }
    }

    function resetExec() {
      rs.reset()
    }

    function resetAll() {
      selectedNodeId.set(null)
      resetExec()
      nodes.set(INITIAL_NODES)
      edges.set(INITIAL_EDGES)
    }

    // ── Context Menus ─────────────────────────────────────────────────────────
    const nodeContextMenu = createNodeContextMenu({
      onEdit:      (n) => selectedNodeId.set(n.id),
      onDelete:    { onNodesChange: history.onNodesChange, onDeselect: (id) => { if (selectedNodeId.peek() === id) selectedNodeId.set(null) } },
      onDuplicate: { nodes, onNodesChange: history.onNodesChange },
    })
    const edgeContextMenu = createEdgeContextMenu({
      onDelete:    { onEdgesChange: history.onEdgesChange },
      onEditLabel: { onEditLabel: (e, lbl) => edges.set(edges.peek().map(ed => ed.id === e.id ? { ...ed, label: lbl || undefined } : ed)) },
    })
    const paneContextMenu = createPaneContextMenu({
      items: [
        { label: '➕ Add Transform Node', nodeType: 'transform', data: () => ({ label: 'Transform', expression: '{ ...data }' } as TransformData), via: (n) => nodes.set([...nodes.peek(), n]) },
        { label: '➕ Add Condition Node',  nodeType: 'condition', data: () => ({ label: 'Condition', field: 'status', operator: '==', value: '200' } as ConditionData), via: (n) => nodes.set([...nodes.peek(), n]) },
      ],
    })

    return {
      nodes, edges, flow, history,
      selectedNodeId, commitDataChange, onNodeClick,
      applyAutoLayout,
      execRunning, resetExec,
      runPipeline, resetAll,
      nodeContextMenu, edgeContextMenu, paneContextMenu,
    }
  },

  component({ setup }) {
    const {
      nodes, edges, flow, history,
      selectedNodeId, commitDataChange, onNodeClick,
      applyAutoLayout,
      execRunning, resetExec,
      runPipeline, resetAll,
      nodeContextMenu, edgeContextMenu, paneContextMenu,
    } = setup

    const summary = () => {
      const n   = nodes().length
      const e   = edges().length
      const sel = nodes().filter(nd => nd.selected).length + edges().filter(ed => ed.selected).length
      return `${n} nodes · ${e} edges${sel > 0 ? ` · ${sel} selected` : ''}`
    }

    const selectedNode = () => {
      const id = selectedNodeId()
      return id ? (nodes().find(n => n.id === id) ?? null) : null
    }

    return (
      <div class="flow-page pipe-page">

        {/* ── Header ── */}
        <div class="flow-page-header">
          <div class="flow-page-title">
            <h1>API Pipeline</h1>
            <span class="flow-page-badge">@liteforge/flow</span>
          </div>
          <div class="flow-page-actions">
            <span class="flow-status">{() => summary()}</span>
            <button
              type="button"
              class={() => `flow-btn flow-btn-run${execRunning() ? ' flow-btn-run--running' : ''}`}
              disabled={() => execRunning()}
              onclick={runPipeline}
              title="Run pipeline"
            >{() => execRunning() ? '⏳ Running…' : '▶ Run'}</button>
            <button type="button" class="flow-btn flow-btn-icon" disabled={() => !history.canUndo()} onclick={() => history.undo()} title="Undo (Ctrl+Z)">↩</button>
            <button type="button" class="flow-btn flow-btn-icon" disabled={() => !history.canRedo()} onclick={() => history.redo()} title="Redo (Ctrl+Y)">↪</button>
            <button type="button" class="flow-btn flow-btn-secondary" onclick={applyAutoLayout}>⬡ Auto Layout</button>
            <button type="button" class="flow-btn flow-btn-secondary" onclick={resetAll}>Reset</button>
          </div>
        </div>

        {/* ── Body: canvas + properties panel ── */}
        <div class="pipe-body">

          <div class="flow-canvas-wrapper">
            {FlowCanvas({
              flow,
              nodes,
              edges,
              onNodesChange:   history.onNodesChange,
              onEdgesChange:   history.onEdgesChange,
              onConnect:       history.onConnect,
              onNodeClick,
              snapToGrid:      [20, 20],
              nodeContextMenu,
              edgeContextMenu,
              paneContextMenu,
              defaultViewport: { x: 40, y: 60, scale: 0.85 },
            })}
          </div>

          {/* Properties Panel — slide-in sidebar */}
          <div class={() => `pipe-props-container${selectedNode() ? ' pipe-props-container--open' : ''}`}>
            {() => {
              const node = selectedNode()
              if (!node) return null
              return createNodePropertiesPanel(nodeTypes, {
                node:    node as FlowNode,
                onApply: commitDataChange,
                onClose: () => selectedNodeId.set(null),
              })
            }}
          </div>

        </div>

        {/* ── Execution Log ── */}
        <div class={() => `pipe-log${rs.log().length > 0 ? '' : ' pipe-log--hidden'}`}>
          <div class="pipe-log-header">
            <span>Execution Log</span>
            <button type="button" class="pipe-props-close" onclick={resetExec}>✕</button>
          </div>
          <div class="pipe-log-body">
            {() => rs.log().map(line => <div class="pipe-log-line">{line}</div>)}
          </div>
        </div>

        {/* ── Legend ── */}
        <div class="pipe-legend">
          {[
            ['#10b981', '⚡ Trigger'], ['#f59e0b', '🔑 Auth'],      ['#3b82f6', '🌐 HTTP'],
            ['#8b5cf6', '⚙️ Transform'], ['#f97316', '🔀 Condition'], ['#10b981', '📤 Response'],
          ].map(([color, label]) => (
            <span class="pipe-legend-item">
              <span class="pipe-legend-dot" style={`background:${color}`}></span>
              <span>{label}</span>
            </span>
          ))}
        </div>

      </div>
    )
  },
})
