// tests/_practice-register.mjs
// Installs the loader hook from _practice-hook.mjs.
// Node's hooks API requires registration to live in a separate module
// from the hook itself (the hook runs in its own module graph).

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./_practice-hook.mjs', pathToFileURL('./tests/'));
