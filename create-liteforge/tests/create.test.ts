import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// We test create.ts logic directly
import { createProject, detectPackageManager } from '../src/create.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'create-liteforge-test-'));
  process.chdir(tmpDir);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('createProject', () => {
  it('creates all expected files', () => {
    createProject('my-app');

    const base = join(tmpDir, 'my-app');

    const expectedFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      '.gitignore',
      'src/main.tsx',
      'src/App.tsx',
      'src/router.ts',
      'src/styles.css',
      'src/pages/Home.tsx',
      'src/pages/About.tsx',
      'src/stores/ui.ts',
    ];

    for (const file of expectedFiles) {
      expect(existsSync(join(base, file)), `Expected ${file} to exist`).toBe(true);
    }
  });

  it('replaces {{name}} placeholder in package.json', () => {
    createProject('my-cool-app');

    const pkg = JSON.parse(
      readFileSync(join(tmpDir, 'my-cool-app', 'package.json'), 'utf-8'),
    ) as { name: string; dependencies: Record<string, string> };

    expect(pkg.name).toBe('my-cool-app');
  });

  it('has liteforge as dependency in package.json', () => {
    createProject('my-app');

    const pkg = JSON.parse(
      readFileSync(join(tmpDir, 'my-app', 'package.json'), 'utf-8'),
    ) as { dependencies: Record<string, string> };

    expect(pkg.dependencies['liteforge']).toBeDefined();
  });

  it('replaces {{name}} placeholder in index.html title', () => {
    createProject('awesome-project');

    const html = readFileSync(
      join(tmpDir, 'awesome-project', 'index.html'),
      'utf-8',
    );

    expect(html).toContain('<title>awesome-project</title>');
    expect(html).not.toContain('{{name}}');
  });

  it('package.json contains no remaining placeholders', () => {
    createProject('test-app');

    const content = readFileSync(
      join(tmpDir, 'test-app', 'package.json'),
      'utf-8',
    );

    expect(content).not.toContain('{{');
  });

  it('fails if target directory already exists', () => {
    createProject('existing-app');

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    expect(() => createProject('existing-app')).toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  it('generates vite.config.ts with liteforge plugin', () => {
    createProject('my-app');

    const viteConfig = readFileSync(
      join(tmpDir, 'my-app', 'vite.config.ts'),
      'utf-8',
    );

    expect(viteConfig).toContain("from '@liteforge/vite-plugin'");
    expect(viteConfig).toContain('liteforge()');
  });

  it('generates .gitignore (not _gitignore)', () => {
    createProject('my-app');

    expect(existsSync(join(tmpDir, 'my-app', '.gitignore'))).toBe(true);
    expect(existsSync(join(tmpDir, 'my-app', '_gitignore'))).toBe(false);
  });

  it('main.tsx uses liteforge imports', () => {
    createProject('my-app');

    const main = readFileSync(
      join(tmpDir, 'my-app', 'src', 'main.tsx'),
      'utf-8',
    );

    expect(main).toContain("from 'liteforge'");
    expect(main).toContain("from '@liteforge/router'");
    expect(main).toContain("from '@liteforge/modal'");
  });
});

describe('detectPackageManager', () => {
  const originalEnv = process.env['npm_config_user_agent'];

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['npm_config_user_agent'];
    } else {
      process.env['npm_config_user_agent'] = originalEnv;
    }
  });

  it('detects pnpm', () => {
    process.env['npm_config_user_agent'] = 'pnpm/9.0.0 npm/? node/v20.0.0';
    expect(detectPackageManager()).toBe('pnpm');
  });

  it('detects npm', () => {
    process.env['npm_config_user_agent'] = 'npm/10.0.0 node/v20.0.0';
    expect(detectPackageManager()).toBe('npm');
  });

  it('detects yarn', () => {
    process.env['npm_config_user_agent'] = 'yarn/4.0.0 npm/? node/v20.0.0';
    expect(detectPackageManager()).toBe('yarn');
  });

  it('detects bun', () => {
    process.env['npm_config_user_agent'] = 'bun/1.0.0';
    expect(detectPackageManager()).toBe('bun');
  });

  it('defaults to npm when env not set', () => {
    delete process.env['npm_config_user_agent'];
    expect(detectPackageManager()).toBe('npm');
  });
});
