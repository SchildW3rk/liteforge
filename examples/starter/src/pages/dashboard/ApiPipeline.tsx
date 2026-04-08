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

import { createComponent, signal, effect } from 'liteforge';
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
  NodeChange,
  NodeContextMenuItem,
  EdgeContextMenuItem,
  PaneContextMenuItem,
  Point,
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
// Execution State — module-level signals
//
// Living at module scope lets node renderer functions (which are plain
// functions, not components) read them reactively in JSX expressions.
// The component's setup() wires the runner to update these signals.
// =============================================================================

export type NodeExecStatus = 'idle' | 'running' | 'success' | 'error'

const execNodeStates  = signal<Map<string, NodeExecStatus>>(new Map())
const execNodeOutputs = signal<Map<string, unknown>>(new Map())
const execNodeErrors  = signal<Map<string, string>>(new Map())

// Shared click dispatcher — wired by setup()
const onNodeClick = { fn: (_id: string) => {} }

// =============================================================================
// Execution State CSS helpers
// =============================================================================

function nodeStatusClass(nodeId: string): string {
  const s = execNodeStates().get(nodeId) ?? 'idle'
  return s === 'idle' ? '' : `pipe-node--${s}`
}

function nodeOutputText(nodeId: string): string {
  const status = execNodeStates().get(nodeId) ?? 'idle'
  if (status === 'idle') return ''
  const out = execNodeOutputs().get(nodeId)
  if (out === undefined) return ''
  if (typeof out === 'object' && out !== null) {
    const s = JSON.stringify(out)
    return s.length > 60 ? s.slice(0, 57) + '…' : s
  }
  return String(out)
}

function nodeOutputVisible(nodeId: string): boolean {
  const status = execNodeStates().get(nodeId) ?? 'idle'
  return status !== 'idle' && execNodeOutputs().get(nodeId) !== undefined
}

// =============================================================================
// Shared Node Shell — JSX, fully reactive
// =============================================================================

function NodeShell(
  type: string,
  accent: string,
  icon: string,
  node: FlowNode,
  children: Node,
): Node {
  return (
    <div
      class={() => `pipe-node pipe-node--${type} ${nodeStatusClass(node.id)}`}
      style={`--pipe-accent: ${accent}`}
    >
      <div class="pipe-node-header" onclick={() => onNodeClick.fn(node.id)}>
        <span class="pipe-node-icon">{icon}</span>
        <span class="pipe-node-title">{(node.data as { label: string }).label}</span>
        <span class="pipe-node-badge">{type.toUpperCase()}</span>
        <span class="pipe-node-edit-hint" title="Click to edit properties">✏️</span>
      </div>
      <div class="pipe-node-body">{children}</div>
      <div
        class={() => `pipe-node-output${nodeOutputVisible(node.id) ? '' : ' pipe-node-output--hidden'}`}
      >
        {() => nodeOutputText(node.id)}
      </div>
    </div>
  )
}

function NodeField(label: string, value: string): Node {
  return (
    <div class="pipe-node-field">
      <span class="pipe-node-field-label">{label}</span>
      <span class="pipe-node-field-value">{value}</span>
    </div>
  )
}

// =============================================================================
// Handle helpers — called inside JSX, need flow context
// =============================================================================

function SrcHandle(nodeId: string, handleId: string, wrapEl: () => HTMLElement): Node {
  const ctx = getFlowContext()
  const { el } = createHandle(nodeId, handleId, 'source', 'right', ctx, wrapEl())
  return el
}

function TgtHandle(nodeId: string, handleId: string, wrapEl: () => HTMLElement): Node {
  const ctx = getFlowContext()
  const { el } = createHandle(nodeId, handleId, 'target', 'left', ctx, wrapEl())
  return el
}

// =============================================================================
// Node Type Renderers — pure JSX, fully reactive via Vite plugin
// =============================================================================

function TriggerNode(node: FlowNode): Node {
  const data = node.data as TriggerData
  const wrap = NodeShell('trigger', '#10b981', '⚡', node,
    <>{NodeField('Type', data.triggerType)}{NodeField('User', data.username || '—')}</>,
  ) as HTMLElement
  wrap.appendChild(SrcHandle(node.id, 'out', () => wrap.parentElement as HTMLElement ?? wrap) as HTMLElement)
  return wrap
}

function AuthNode(node: FlowNode): Node {
  const data = node.data as AuthData
  const wrap = NodeShell('auth', '#f59e0b', '🔑', node,
    <>{NodeField('Method', data.authType)}{NodeField('Token', data.token ? data.token.slice(0, 8) + '…' : '(none)')}</>,
  ) as HTMLElement
  wrap.appendChild(TgtHandle(node.id, 'in',  () => wrap.parentElement as HTMLElement ?? wrap) as HTMLElement)
  wrap.appendChild(SrcHandle(node.id, 'out', () => wrap.parentElement as HTMLElement ?? wrap) as HTMLElement)
  return wrap
}

function HttpNode(node: FlowNode): Node {
  const data = node.data as HttpData
  const wrap = NodeShell('http', '#3b82f6', '🌐', node,
    <>{NodeField('Method', data.method)}{NodeField('URL', data.url.length > 28 ? data.url.slice(0, 28) + '…' : data.url)}</>,
  ) as HTMLElement
  wrap.appendChild(TgtHandle(node.id, 'in',  () => wrap.parentElement as HTMLElement ?? wrap) as HTMLElement)
  wrap.appendChild(SrcHandle(node.id, 'out', () => wrap.parentElement as HTMLElement ?? wrap) as HTMLElement)
  return wrap
}

function TransformNode(node: FlowNode): Node {
  const data = node.data as TransformData
  const wrap = NodeShell('transform', '#8b5cf6', '⚙️', node,
    <>{NodeField('Expr', data.expression.length > 28 ? data.expression.slice(0, 28) + '…' : data.expression)}</>,
  ) as HTMLElement
  wrap.appendChild(TgtHandle(node.id, 'in',  () => wrap.parentElement as HTMLElement ?? wrap) as HTMLElement)
  wrap.appendChild(SrcHandle(node.id, 'out', () => wrap.parentElement as HTMLElement ?? wrap) as HTMLElement)
  return wrap
}

function ConditionNode(node: FlowNode): Node {
  const data = node.data as ConditionData
  const wrap = NodeShell('condition', '#f97316', '🔀', node,
    <>{NodeField('Field', data.field)}{NodeField('Check', `${data.operator} ${data.value}`)}</>,
  ) as HTMLElement

  const ctx = getFlowContext()
  const getWrapper = () => wrap.parentElement as HTMLElement ?? wrap

  const { el: trueEl }  = createHandle(node.id, 'true',  'source', 'right', ctx, getWrapper())
  const { el: falseEl } = createHandle(node.id, 'false', 'source', 'right', ctx, getWrapper())

  trueEl.classList.add('pipe-handle-true')
  falseEl.classList.add('pipe-handle-false')

  trueEl.appendChild(<span class="pipe-handle-label pipe-handle-label--true">T</span> as HTMLElement)
  falseEl.appendChild(<span class="pipe-handle-label pipe-handle-label--false">F</span> as HTMLElement)

  wrap.appendChild(trueEl)
  wrap.appendChild(falseEl)
  wrap.appendChild(TgtHandle(node.id, 'in', getWrapper) as HTMLElement)
  return wrap
}

function ResponseNode(node: FlowNode): Node {
  const data = node.data as ResponseData
  const color = data.status >= 400 ? '#ef4444' : data.status >= 300 ? '#f59e0b' : '#10b981'
  const wrap = NodeShell('response', color, '📤', node,
    <>{NodeField('Status', String(data.status))}{NodeField('Body', data.body.length > 24 ? data.body.slice(0, 24) + '…' : data.body)}</>,
  ) as HTMLElement
  wrap.appendChild(TgtHandle(node.id, 'in', () => wrap.parentElement as HTMLElement ?? wrap) as HTMLElement)
  return wrap
}

const nodeTypes: Record<string, NodeComponentFn> = {
  trigger:   TriggerNode,
  auth:      AuthNode,
  http:      HttpNode,
  transform: TransformNode,
  condition: ConditionNode,
  response:  ResponseNode,
}

// =============================================================================
// Execution Engine — Recursive Graph Traversal
// =============================================================================

interface RunnerState {
  nodeStates:  Map<string, NodeExecStatus>
  nodeOutputs: Map<string, unknown>
  nodeErrors:  Map<string, string>
  log:         string[]
}

function evalTransform(expression: string, data: unknown): unknown {
  // eslint-disable-next-line no-new-func
  const fn = new Function('data', `"use strict"; return (${expression})`)
  return fn(data)
}

function evalCondition(cfg: ConditionData, payload: unknown): boolean {
  const obj = payload as Record<string, unknown>
  const fieldVal = obj?.[cfg.field]
  switch (cfg.operator) {
    case '>':        return Number(fieldVal) > Number(cfg.value)
    case '<':        return Number(fieldVal) < Number(cfg.value)
    case '==':       return String(fieldVal) === cfg.value
    case '!=':       return String(fieldVal) !== cfg.value
    case 'contains': return String(fieldVal).includes(cfg.value)
    default:         return false
  }
}

async function executeNode(
  nodeId:   string,
  payload:  unknown,
  allNodes: FlowNode[],
  allEdges: FlowEdge[],
  state:    RunnerState,
  visited:  Set<string>,
  flush:    () => void,
): Promise<void> {
  if (visited.has(nodeId)) return
  visited.add(nodeId)

  const node = allNodes.find(n => n.id === nodeId)
  if (!node) return

  state.nodeStates.set(nodeId, 'running')
  flush()
  await delay(300)

  let output: unknown
  let outHandle = 'out'

  try {
    switch (node.type) {
      case 'trigger': {
        const d = node.data as TriggerData
        output = { username: d.username || 'octocat', _headers: {} as Record<string, string> }
        state.log.push(`▶ Trigger fired — username: "${(output as Record<string, string>).username}"`)
        break
      }

      case 'auth': {
        const d = node.data as AuthData
        const ctx = payload as Record<string, unknown>
        const headers = { ...(ctx._headers as Record<string, string> ?? {}) }
        if (d.token.trim()) {
          if (d.authType === 'bearer')  headers['Authorization'] = `Bearer ${d.token}`
          else if (d.authType === 'api-key') headers['X-API-Key'] = d.token
          else headers['Authorization'] = `Basic ${btoa(d.token)}`
          state.log.push(`🔑 Auth — added ${d.authType} header`)
        } else {
          state.log.push(`🔑 Auth — no token configured, skipping header`)
        }
        output = { ...ctx, _headers: headers }
        break
      }

      case 'http': {
        const d   = node.data as HttpData
        const ctx = payload as Record<string, unknown>
        const headers = ctx._headers as Record<string, string> ?? {}
        const url = d.url.replace('{username}', (ctx.username as string) ?? '')
        state.log.push(`🌐 HTTP ${d.method} → https://${url}`)
        const res = await fetch(`https://${url}`, {
          method: d.method,
          headers: { 'Content-Type': 'application/json', ...headers },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        output = await res.json()
        state.log.push(`   ✓ ${res.status} OK`)
        break
      }

      case 'transform': {
        const d = node.data as TransformData
        output = evalTransform(d.expression, payload)
        state.log.push(`⚙️ Transform — ${d.expression.slice(0, 40)}`)
        break
      }

      case 'condition': {
        const d = node.data as ConditionData
        const result = evalCondition(d, payload)
        outHandle = result ? 'true' : 'false'
        output = { ...((payload as object) ?? {}), _branch: result }
        state.log.push(`🔀 Condition "${d.field} ${d.operator} ${d.value}" → ${result ? 'TRUE' : 'FALSE'}`)
        break
      }

      case 'response': {
        const d = node.data as ResponseData
        output = { status: d.status, body: d.body, payload }
        state.log.push(`📤 Response ${d.status} — ${d.body.slice(0, 40)}`)
        break
      }

      default:
        output = payload
    }

    state.nodeStates.set(nodeId, 'success')
    state.nodeOutputs.set(nodeId, output)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    state.nodeStates.set(nodeId, 'error')
    state.nodeErrors.set(nodeId, msg)
    state.nodeOutputs.set(nodeId, msg)
    state.log.push(`   ✗ Error: ${msg}`)
    flush()
    return
  }

  flush()
  await delay(200)

  const outgoing = allEdges.filter(e => e.source === nodeId && e.sourceHandle === outHandle)
  await Promise.all(outgoing.map(e =>
    executeNode(e.target, output, allNodes, allEdges, state, visited, flush),
  ))
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// =============================================================================
// Properties Panel — pure JSX
// =============================================================================

function PropsGroup(labelText: string, inputEl: Node): Node {
  return (
    <div class="pipe-props-group">
      <label class="pipe-props-label">{labelText}</label>
      {inputEl}
    </div>
  )
}

function PropsTextInput(
  key: string,
  labelText: string,
  draft: Record<string, string | number>,
  placeholder = '',
): Node {
  return PropsGroup(labelText,
    <input
      type="text"
      class="pipe-props-input"
      value={String(draft[key] ?? '')}
      placeholder={placeholder}
      oninput={(e: Event) => { draft[key] = (e.target as HTMLInputElement).value }}
    />,
  )
}

function PropsSelect(
  key: string,
  labelText: string,
  options: string[],
  draft: Record<string, string | number>,
): Node {
  return PropsGroup(labelText,
    <select
      class="pipe-props-select"
      onchange={(e: Event) => { draft[key] = (e.target as HTMLSelectElement).value }}
    >
      {options.map(opt =>
        <option value={opt} selected={draft[key] === opt}>{opt}</option>,
      )}
    </select>,
  )
}

function PropsTextarea(
  key: string,
  labelText: string,
  draft: Record<string, string | number>,
  placeholder = '',
): Node {
  return PropsGroup(labelText,
    <textarea
      class="pipe-props-textarea"
      rows={4}
      placeholder={placeholder}
      oninput={(e: Event) => { draft[key] = (e.target as HTMLTextAreaElement).value }}
    >{String(draft[key] ?? '')}</textarea>,
  )
}

function buildPropertiesPanel(
  node: FlowNode<PipelineNodeData>,
  onApply: (change: NodeChange) => void,
  onClose: () => void,
): Node {
  const draft: Record<string, string | number> = { ...(node.data as Record<string, string | number>) }

  const typeFields: Node = (() => {
    switch (node.type) {
      case 'trigger':
        return <>{PropsSelect('triggerType', 'Trigger Type', ['webhook', 'schedule', 'manual'], draft)}{PropsTextInput('username', 'GitHub Username', draft, 'octocat')}</>
      case 'auth':
        return <>{PropsSelect('authType', 'Auth Type', ['bearer', 'api-key', 'basic'], draft)}{PropsTextInput('token', 'Token / Key', draft, 'ghp_…')}</>
      case 'http':
        return <>{PropsSelect('method', 'Method', ['GET', 'POST', 'PUT', 'DELETE'], draft)}{PropsTextInput('url', 'URL', draft, 'api.example.com/path')}</>
      case 'transform':
        return <>{PropsTextarea('expression', 'Expression', draft, '{ name, value }')}</>
      case 'condition':
        return <>{PropsTextInput('field', 'Field', draft, 'followers')}{PropsSelect('operator', 'Operator', ['>', '<', '==', '!=', 'contains'], draft)}{PropsTextInput('value', 'Value', draft, '1000')}</>
      case 'response':
        return <>{PropsSelect('status', 'Status', ['200', '400', '500'], draft)}{PropsTextInput('body', 'Body', draft, '"OK"')}</>
      default:
        return <></>
    }
  })()

  return (
    <div class="pipe-props-panel">
      <div class="pipe-props-header">
        <span class="pipe-props-title">Edit {node.type.charAt(0).toUpperCase() + node.type.slice(1)}</span>
        <button type="button" class="pipe-props-close" onclick={onClose}>✕</button>
      </div>
      <div class="pipe-props-form">
        {PropsTextInput('label', 'Label', draft)}
        {typeFields}
      </div>
      <div class="pipe-props-footer">
        <button type="button" class="flow-btn flow-btn-secondary" onclick={onClose}>Cancel</button>
        <button
          type="button"
          class="flow-btn"
          onclick={() => {
            const data: Record<string, string | number> = { ...draft }
            if (node.type === 'response' && typeof data['status'] === 'string') {
              data['status'] = parseInt(data['status'] as string, 10)
            }
            onApply({ type: 'data', id: node.id, data } as NodeChange)
            onClose()
          }}
        >Apply</button>
      </div>
    </div>
  )
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

    onNodeClick.fn = (id: string) => {
      selectedNodeId.set(id === selectedNodeId.peek() ? null : id)
    }

    function commitDataChange(change: NodeChange) {
      history.onNodesChange([change])
    }

    // ── Execution ─────────────────────────────────────────────────────────────
    const execRunning = signal(false)
    const execLog     = signal<string[]>([])

    async function runPipeline() {
      if (execRunning.peek()) return
      const currentNodes = nodes.peek()
      const currentEdges = edges.peek()
      const triggerNode  = currentNodes.find(n => n.type === 'trigger')
      if (!triggerNode) return

      execRunning.set(true)
      execNodeStates.set(new Map())
      execNodeOutputs.set(new Map())
      execNodeErrors.set(new Map())
      execLog.set(['⚡ Pipeline starting…'])

      const state: RunnerState = {
        nodeStates:  new Map(),
        nodeOutputs: new Map(),
        nodeErrors:  new Map(),
        log:         ['⚡ Pipeline starting…'],
      }

      function flush() {
        execNodeStates.set(new Map(state.nodeStates))
        execNodeOutputs.set(new Map(state.nodeOutputs))
        execNodeErrors.set(new Map(state.nodeErrors))
        execLog.set([...state.log])
      }

      try {
        await executeNode(triggerNode.id, null, currentNodes, currentEdges, state, new Set(), flush)
        state.log.push(state.nodeErrors.size > 0
          ? `⚠️ Completed with ${state.nodeErrors.size} error(s)`
          : '✅ Pipeline completed successfully')
        flush()
      } finally {
        execRunning.set(false)
      }
    }

    function resetExec() {
      execNodeStates.set(new Map())
      execNodeOutputs.set(new Map())
      execNodeErrors.set(new Map())
      execLog.set([])
    }

    function resetAll() {
      selectedNodeId.set(null)
      resetExec()
      nodes.set(INITIAL_NODES)
      edges.set(INITIAL_EDGES)
    }

    // ── Context Menus ─────────────────────────────────────────────────────────
    const nodeContextMenu: NodeContextMenuItem[] = [
      { label: '✏️ Edit Properties', action: (n: FlowNode) => selectedNodeId.set(n.id) },
      {
        label: '🗑 Delete Node',
        action: (n: FlowNode) => {
          if (selectedNodeId.peek() === n.id) selectedNodeId.set(null)
          history.onNodesChange([{ type: 'remove', id: n.id }])
        },
      },
      {
        label: '📋 Duplicate Node',
        action: (n: FlowNode) => {
          const id = `${n.id}-copy-${Date.now()}`
          nodes.set([...nodes.peek(), { ...n, id, position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: false }])
        },
      },
    ]

    const edgeContextMenu: EdgeContextMenuItem[] = [
      { label: '🗑 Delete Edge',  action: (e: FlowEdge) => history.onEdgesChange([{ type: 'remove', id: e.id }]) },
      {
        label: '✏️ Edit Label',
        action: (e: FlowEdge) => {
          const label = window.prompt('Edge label:', e.label ?? '')
          if (label === null) return
          edges.set(edges.peek().map(ed => ed.id === e.id ? { ...ed, label: label.trim() || undefined } : ed))
        },
      },
    ]

    const paneContextMenu: PaneContextMenuItem[] = [
      {
        label: '➕ Add Transform Node',
        action: (pos: Point) => {
          const snap = (v: number) => Math.round(v / 20) * 20
          nodes.set([...nodes.peek(), { id: `transform-${Date.now()}`, type: 'transform', position: { x: snap(pos.x), y: snap(pos.y) }, data: { label: 'Transform', expression: '{ ...data }' } as TransformData }])
        },
      },
      {
        label: '➕ Add Condition Node',
        action: (pos: Point) => {
          const snap = (v: number) => Math.round(v / 20) * 20
          nodes.set([...nodes.peek(), { id: `condition-${Date.now()}`, type: 'condition', position: { x: snap(pos.x), y: snap(pos.y) }, data: { label: 'Condition', field: 'status', operator: '==', value: '200' } as ConditionData }])
        },
      },
    ]

    return {
      nodes, edges, flow, history,
      selectedNodeId, commitDataChange,
      applyAutoLayout,
      execRunning, execLog, resetExec,
      runPipeline, resetAll,
      nodeContextMenu, edgeContextMenu, paneContextMenu,
    }
  },

  component({ setup }) {
    const {
      nodes, edges, flow, history,
      selectedNodeId, commitDataChange,
      applyAutoLayout,
      execRunning, execLog, resetExec,
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

    // ── Edge animation ────────────────────────────────────────────────────────
    // Applied imperatively because SVG path elements are managed by @liteforge/flow
    // internals (EdgeLayer.ts) — they're outside JSX scope.
    effect(() => {
      const states = execNodeStates()
      document.querySelectorAll('[data-edge-id]').forEach(el => {
        const edgeId = el.getAttribute('data-edge-id') ?? ''
        const edge   = edges().find(e => e.id === edgeId)
        if (!edge) return
        const srcStatus = states.get(edge.source)
        el.classList.toggle('pipe-edge--active', srcStatus === 'success' || srcStatus === 'running')
      })
    })

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
              return buildPropertiesPanel(
                node as FlowNode<PipelineNodeData>,
                commitDataChange,
                () => selectedNodeId.set(null),
              )
            }}
          </div>

        </div>

        {/* ── Execution Log ── */}
        <div class={() => `pipe-log${execLog().length > 0 ? '' : ' pipe-log--hidden'}`}>
          <div class="pipe-log-header">
            <span>Execution Log</span>
            <button type="button" class="pipe-props-close" onclick={resetExec}>✕</button>
          </div>
          <div class="pipe-log-body">
            {() => execLog().map(line => <div class="pipe-log-line">{line}</div>)}
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
