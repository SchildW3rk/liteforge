import { createComponent } from 'liteforge';
import { signal } from 'liteforge';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

// ─── Syntax highlighting ───────────────────────────────────────────────────────

type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'fn' | 'type' | 'plain';

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return',
  'interface', 'type', 'class', 'extends', 'implements', 'new', 'this',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'default',
  'try', 'catch', 'finally', 'throw', 'async', 'await', 'of', 'in',
  'true', 'false', 'null', 'undefined', 'void', 'never', 'unknown',
  'as', 'typeof', 'keyof', 'readonly',
]);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    const ch = code[i] ?? '';

    if (ch === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const value = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: 'comment', value });
      i += value.length;
      continue;
    }

    if (ch === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const value = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      tokens.push({ type: 'comment', value });
      i += value.length;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === quote) { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z_$]/.test(code[i - 1] ?? ''))) {
      let j = i;
      while (j < code.length && /[0-9._]/.test(code[j] ?? '')) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) });
      i = j;
      continue;
    }

    if (/[a-zA-Z_$]/.test(ch)) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j] ?? '')) j++;
      const word = code.slice(i, j);
      const after = code.slice(j).trimStart();
      if (after[0] === '(' && !KEYWORDS.has(word)) {
        tokens.push({ type: 'fn', value: word });
      } else if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (/^[A-Z]/.test(word)) {
        tokens.push({ type: 'type', value: word });
      } else {
        tokens.push({ type: 'plain', value: word });
      }
      i = j;
      continue;
    }

    tokens.push({ type: 'plain', value: ch });
    i++;
  }

  return tokens;
}

const TOKEN_CLASS: Record<TokenType, string> = {
  keyword: 'text-violet-400',
  string:  'text-emerald-400',
  comment: 'text-[var(--content-muted)] italic',
  number:  'text-amber-400',
  fn:      'text-sky-300',
  type:    'text-amber-300',
  plain:   'text-[var(--content-primary)]',
};

function renderHighlighted(code: string): Node {
  const frag = document.createDocumentFragment();
  for (const token of tokenize(code)) {
    const span = document.createElement('span');
    span.className = TOKEN_CLASS[token.type];
    span.textContent = token.value;
    frag.appendChild(span);
  }
  return frag;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CodeBlock = createComponent<CodeBlockProps>({
  name: 'CodeBlock',
  component({ props }) {
    const copied = signal(false);

    function copy() {
      navigator.clipboard.writeText(props.code).then(() => {
        copied.set(true);
        setTimeout(() => copied.set(false), 1800);
      }).catch(() => undefined);
    }

    // Tokenizer returns a raw DocumentFragment — not JSX, inserted as a child
    const codeEl = document.createElement('code');
    codeEl.appendChild(renderHighlighted(props.code));

    return (
      <div class="relative rounded-lg overflow-hidden border border-[var(--line-default)] bg-[var(--surface-raised)] my-4">
        <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--line-default)] bg-[var(--surface-raised)]">
          <span class="text-xs text-[var(--content-muted)] font-mono">
            {props.title ?? (props.language ?? 'typescript')}
          </span>
          <button
            type="button"
            onclick={copy}
            class="text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] transition-colors select-none"
          >
            {() => copied() ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="overflow-x-auto p-4 text-sm leading-relaxed font-mono">
          {codeEl}
        </pre>
      </div>
    );
  },
});
