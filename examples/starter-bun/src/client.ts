/**
 * Browser entry.
 *
 * Loaded by the HTML shell (the framework auto-injects
 * `<script type="module" src="/client.js">`). Mounts the same app config
 * declared in `src/app.ts` into the DOM.
 */

import { app } from './app.js'
import './styles.css'

await app.mount()
