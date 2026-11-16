// Node module hooks so scripts can import src/lib/judge/*.js unchanged:
// resolves the "@/" alias and extension-less relative imports.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;
  if (spec.startsWith('@/')) spec = pathToFileURL(path.join(root, 'src', spec.slice(2))).href;
  const isPath = spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('file:');
  if (isPath && !/\.(m?js|json|cjs)$/.test(spec)) {
    try {
      return await nextResolve(`${spec}.js`, context);
    } catch {
      /* fall through */
    }
  }
  return nextResolve(spec, context);
}
