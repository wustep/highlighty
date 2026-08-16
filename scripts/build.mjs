import { access, cp, mkdir, readFile, rm } from 'node:fs/promises';
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

const manifest = JSON.parse(await readFile(resolve(outputDirectory, 'manifest.json'), 'utf8'));
const referencedFiles = new Set([
  manifest.background?.service_worker,
  manifest.options_ui?.page,
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
  ...(manifest.content_scripts || []).flatMap((script) => [
    ...(script.js || []),
    ...(script.css || []),
  ]),
]);

await Promise.all(
  [...referencedFiles]
    .filter((file) => typeof file === 'string')
    .map((file) => access(resolve(outputDirectory, file))),
);

console.log(`Built loadable extension in ${relative(root, outputDirectory)}/`);
