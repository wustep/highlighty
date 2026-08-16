import { cp, mkdir, rm } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const sourceDirectory = resolve(root, 'src');
const outputDirectory = resolve(root, 'dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await cp(sourceDirectory, outputDirectory, {
  recursive: true,
  filter(source) {
    const relativePath = relative(sourceDirectory, source);
    const pathParts = relativePath.split(sep);
    return !pathParts.includes('modules') && extname(source) !== '.ts';
  },
});

await build({
  entryPoints: {
    background: resolve(sourceDirectory, 'background.ts'),
    highlighty: resolve(sourceDirectory, 'highlighty.ts'),
    options: resolve(sourceDirectory, 'options.ts'),
  },
  outdir: outputDirectory,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome109',
  legalComments: 'none',
  logLevel: 'info',
});
