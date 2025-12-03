# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Client-side PWA that batch-converts HEIC photos to JPEG using parallel Web Workers. No server-side processing - all conversion happens in the browser.

## Development

**Run locally:**
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

**Deploy:** Push to `main` branch. GitHub Pages serves from repository root at `/image-converter/`.

## Architecture

```
index.html          # Single page UI with Pico CSS (CDN)
app.js              # Main thread: file selection, worker pool, ZIP generation
worker.js           # Web Worker: HEIC→JPEG conversion using heic-to library
sw.js               # Service Worker: cache-first offline support
manifest.json       # PWA manifest (configured for /image-converter/ base path)
```

**Conversion Flow:**
1. User selects HEIC files → `app.js` queues them
2. 4 parallel workers (`worker.js`) process queue
3. Workers use `heic-to` library via dynamic import from esm.sh
4. Converted JPEGs collected → bundled with JSZip → download

**Key Implementation Details:**

- **Worker DOM Shim:** `worker.js` creates a fake `document.createElement('canvas')` that returns `OffscreenCanvas` with a `toBlob` shim (maps to `convertToBlob`). Required because `heic-to` expects DOM canvas APIs.

- **Worker Pool:** `activeWorkers` tracks busy workers. When queue empties, workers decrement counter; when all reach zero, ZIP generation starts.

- **External Dependencies (CDN):**
  - Pico CSS (unpkg)
  - heic-to, JSZip (esm.sh)

## Path Configuration

Service worker and manifest use `/image-converter/` prefix for GitHub Pages deployment. For local development, the paths work because Python's HTTP server serves from root.
