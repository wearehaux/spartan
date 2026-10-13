import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import linearDocs from '../lib/linear-docs.json' with { type: 'json' };
import nextConfig from '../next.config.mjs';

const root = path.resolve(import.meta.dirname, '..');

async function mdxFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await mdxFiles(full)));
    else if (entry.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

test('retired project routes still redirect to their Linear documents', async () => {
  const redirects = await (nextConfig as { redirects: () => Promise<{ source: string; destination: string }[]> }).redirects();
  for (const [slug, destination] of Object.entries(linearDocs)) {
    if (slug === '') continue;
    assert.deepEqual(redirects.find(r => r.source === `/docs/${slug}`)?.destination, destination, slug);
  }
  assert.equal(redirects.some(r => r.source === '/docs/'), false, 'the docs home is real content');
});

test('every published page has a title and description', async () => {
  for (const file of await mdxFiles(path.join(root, 'content/docs'))) {
    const front = (await readFile(file, 'utf8')).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    assert.match(front, /^title: .+/m, `${file} needs a title`);
    assert.match(front, /^description: .+/m, `${file} needs a description`);
  }
});

test('published docs reference only Storybook stories that exist in the stories source', async () => {
  const stories = new Set<string>();
  for (const [file, title] of [
    ['packages/components/src/components/button/sp-button.stories.ts', 'components-button'],
    ['packages/components/src/components/icon-button/sp-icon-button.stories.ts', 'components-icon-button'],
    ['packages/components/src/components/input/sp-input.stories.ts', 'components-input'],
    ['packages/components/src/components/textarea/sp-textarea.stories.ts', 'components-textarea'],
    ['packages/components/src/foundations/theme-contract/theme-contract.stories.ts', 'foundations-theme-contract'],
  ]) {
    for (const [, name] of (await readFile(path.join(root, file), 'utf8')).matchAll(/^export const (\w+): Story/gm)) {
      stories.add(`${title}--${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`);
    }
  }
  for (const file of await mdxFiles(path.join(root, 'content/docs'))) {
    for (const [, id] of (await readFile(file, 'utf8')).matchAll(/(?:story|StorybookLink story)="([^"]+)"/g)) {
      assert.ok(stories.has(id), `${path.relative(root, file)} embeds unknown story ${id}`);
    }
  }
});

test('docs do not use em dashes', async () => {
  for (const file of await mdxFiles(path.join(root, 'content/docs'))) {
    assert.ok(!(await readFile(file, 'utf8')).includes(String.fromCharCode(0x2014)), `${file} contains an em dash`);
  }
});
