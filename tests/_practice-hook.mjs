// tests/_practice-hook.mjs
// Node module loader hook for the Practice validator.
//
// Three responsibilities:
//   1. resolve():  rewrite Vite-style absolute specifiers ('/js/...', '/css/...')
//                  into filesystem file:// URLs under the repo root. Vite treats
//                  these as project-root-relative; Node treats them as
//                  filesystem-absolute and fails. The Practice engine imports
//                  '/js/components/show-work.js' which would otherwise break.
//   2. load() JSON: wrap file contents as `export default {...}` so JSON
//                   imports work without the --experimental-json-modules flag.
//   3. load() JS:   rewrite `import.meta.env.BASE_URL` to '/' (Vite-only
//                   syntax; plain Node would yield undefined and crash every
//                   problem file's reviewChapters at module load).

import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as pathResolve, dirname } from 'node:path';

// Repo root = two levels up from this file (tests/ → repo root)
const REPO_ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function resolve(specifier, context, nextResolve) {
  // Vite treats '/js/...' and '/css/...' as project-root-relative.
  // Node treats them as filesystem-absolute, so it fails to find them.
  // Rewrite to a real file:// URL under the repo root.
  if (specifier.startsWith('/js/') || specifier.startsWith('/css/')) {
    const fsPath = pathResolve(REPO_ROOT, '.' + specifier);
    return nextResolve(pathToFileURL(fsPath).href, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const path = fileURLToPath(url);
    const source = await readFile(path, 'utf8');
    return {
      format: 'module',
      source: `export default ${source};`,
      shortCircuit: true,
    };
  }

  if (url.endsWith('.js') || url.endsWith('.mjs')) {
    const result = await nextLoad(url, context);
    if (result.source) {
      let src = result.source.toString();
      // Vite-only syntax — replace with the dev-mode value
      src = src.replace(/import\.meta\.env\.BASE_URL/g, "'/'");
      return { ...result, source: src };
    }
    return result;
  }

  return nextLoad(url, context);
}
