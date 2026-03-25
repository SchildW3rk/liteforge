import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Template files with {{name}} placeholders (relative to template dir)
const TEMPLATE_FILES = new Set([
  'package.json',
  'index.html',
]);

export function createProject(name: string): void {
  const targetDir = resolve(process.cwd(), name);

  if (existsSync(targetDir)) {
    console.error(`\n  Error: Directory "${name}" already exists.\n`);
    process.exit(1);
  }

  console.log('');
  console.log(`  LiteForge — Creating project in ./${name}`);
  console.log('');

  mkdirSync(targetDir, { recursive: true });
  scaffoldTemplate(targetDir, name);

  const pm = detectPackageManager();
  const runCmd = pm === 'npm' ? 'npm run' : pm;

  console.log('  Done! Next steps:');
  console.log('');
  console.log(`    cd ${name}`);
  console.log(`    ${pm} install`);
  console.log(`    ${runCmd} dev`);
  console.log('');
  console.log('  Happy building!');
  console.log('');
}

function scaffoldTemplate(targetDir: string, name: string): void {
  const templateDir = resolve(__dirname, '..', 'template');
  copyDir(templateDir, targetDir, name);
}

function copyDir(srcDir: string, destDir: string, name: string): void {
  mkdirSync(destDir, { recursive: true });

  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry);
    const destEntry = entry === '_gitignore' ? '.gitignore' : entry;
    const destPath = join(destDir, destEntry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath, name);
    } else {
      const content = readFileSync(srcPath, 'utf-8');
      const relPath = relative(srcDir, srcPath);

      if (TEMPLATE_FILES.has(relPath) || TEMPLATE_FILES.has(entry)) {
        writeFileSync(destPath, processTemplate(content, { name }), 'utf-8');
      } else {
        writeFileSync(destPath, content, 'utf-8');
      }
    }
  }
}

function processTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export function detectPackageManager(): string {
  const ua = process.env['npm_config_user_agent'];
  if (!ua) return 'npm';
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('bun')) return 'bun';
  return 'npm';
}
